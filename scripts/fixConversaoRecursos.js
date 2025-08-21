import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para verificar se uma multa é leve
function isMultaLeve(valor, codigoInfracao) {
  // Códigos de infrações leves do CTB
  const codigosLeves = [
    'VEL001', // Velocidade até 20% acima do limite
    '50110', '50120', '50130', '50140', '50150', '50160', '50170', '50180', '50190',
    '51110', '51120', '51130', '51140', '51150', '51160', '51170', '51180', '51190',
    '52110', '52120', '52130', '52140', '52150', '52160', '52170', '52180', '52190',
    '53110', '53120', '53130', '53140', '53150', '53160', '53170', '53180', '53190',
    '54110', '54120', '54130', '54140', '54150', '54160', '54170', '54180', '54190',
    '55110', '55120', '55130', '55140', '55150', '55160', '55170', '55180', '55190'
  ];
  
  // Verifica por código
  if (codigoInfracao && codigosLeves.includes(codigoInfracao)) {
    return true;
  }
  
  // Verifica por valor (multas leves até R$ 293,47 em 2024)
  const valorNumerico = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
  return valorNumerico <= 293.47;
}

// Função para gerar conteúdo de conversão para advertência
function gerarConteudoConversao(multa, cliente) {
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  
  return {
    fundamentacao: `PEDIDO DE CONVERSÃO DE MULTA EM ADVERTÊNCIA POR ESCRITO

Ao Órgão Autuador Competente,

${cliente.nome}, portador(a) do CPF ${cliente.cpf_cnpj}, vem respeitosamente requerer a conversão da multa de trânsito em advertência por escrito, conforme previsto no Art. 267 do Código de Trânsito Brasileiro (Lei 9.503/97).

DADOS DA INFRAÇÃO:
- Auto de Infração: ${multa.numero_auto}
- Data da Infração: ${new Date(multa.data_infracao).toLocaleDateString('pt-BR')}
- Local: ${multa.local_infracao}
- Código da Infração: ${multa.codigo_infracao}
- Descrição: ${multa.descricao_infracao}
- Valor: R$ ${multa.valor_original.toFixed(2)}
- Placa do Veículo: ${multa.placa_veiculo}

FUNDAMENTAÇÃO LEGAL:

O Art. 267 do Código de Trânsito Brasileiro estabelece que:

"Poderá ser imposta a penalidade de advertência por escrito à infração de natureza leve ou média, passível de ser punida com multa, desde que não tenha o infrator cometido nenhuma outra infração nos doze meses anteriores."

No presente caso, verifica-se que:

1. A infração é de NATUREZA LEVE, conforme classificação do CTB;
2. O valor da multa (R$ ${multa.valor_original.toFixed(2)}) enquadra-se no patamar de infrações leves;
3. O requerente NÃO possui registro de outras infrações nos últimos 12 (doze) meses;
4. Trata-se de condutor primário, sem histórico de reincidência.

PEDIDO:

Diante do exposto e com fundamento no Art. 267 do CTB, requer-se:

a) A conversão da multa de trânsito em ADVERTÊNCIA POR ESCRITO;
b) O cancelamento da cobrança da multa;
c) A anotação da advertência no prontuário do condutor.

Termos em que pede deferimento.

${cliente.nome}\nCPF: ${cliente.cpf_cnpj}\n\nData: ${dataAtual}`,
    
    argumentacao: `CONVERSÃO EM ADVERTÊNCIA POR ESCRITO - ART. 267 CTB

Esta solicitação fundamenta-se no direito previsto no Art. 267 do Código de Trânsito Brasileiro, que permite a conversão de multas leves em advertência por escrito para condutores sem histórico de infrações nos últimos 12 meses.

A infração em questão (${multa.codigo_infracao}) é classificada como LEVE e o condutor não possui registro de outras infrações no período legal, atendendo plenamente aos requisitos legais para a conversão.

A aplicação da advertência por escrito cumpre a função educativa da penalidade, promovendo a conscientização do condutor sem a imposição da sanção pecuniária.`
  };
}

async function fixConversaoRecursos() {
  console.log('🔧 Corrigindo recursos que deveriam ser conversão para advertência...');
  console.log('=' .repeat(70));
  
  try {
    // Buscar recursos de defesa_previa com multas leves
    const { data: recursos, error } = await supabase
      .from('recursos')
      .select(`
        id,
        tipo_recurso,
        status,
        fundamentacao,
        observacoes,
        multas!inner(
          id,
          numero_auto,
          placa_veiculo,
          data_infracao,
          valor_original,
          valor_final,
          codigo_infracao,
          descricao_infracao,
          local_infracao,
          clients!inner(
            nome,
            cpf_cnpj
          )
        )
      `)
      .eq('tipo_recurso', 'defesa_previa')
      .in('status', ['em_analise', 'rascunho'])
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('❌ Erro ao buscar recursos:', error.message);
      return;
    }
    
    if (!recursos || recursos.length === 0) {
      console.log('ℹ️ Nenhum recurso de defesa prévia encontrado');
      return;
    }
    
    console.log(`📋 Analisando ${recursos.length} recursos...\n`);
    
    let recursosCorrigidos = 0;
    
    for (const recurso of recursos) {
      const multa = recurso.multas;
      const cliente = multa.clients;
      
      // Verificar se é multa leve
      const isLeve = isMultaLeve(multa.valor_original || multa.valor_final, multa.codigo_infracao);
      
      if (isLeve) {
        console.log(`🔍 Recurso ${recurso.id}:`);
        console.log(`   Auto: ${multa.numero_auto}`);
        console.log(`   Valor: R$ ${(multa.valor_original || multa.valor_final).toFixed(2)}`);
        console.log(`   Código: ${multa.codigo_infracao}`);
        console.log(`   Cliente: ${cliente.nome}`);
        console.log(`   ✅ É multa leve - CORRIGINDO...`);
        
        // Gerar novo conteúdo para conversão
        const novoConteudo = gerarConteudoConversao(multa, cliente);
        
        // Atualizar o recurso
        const { error: updateError } = await supabase
          .from('recursos')
          .update({
            tipo_recurso: 'conversao',
            fundamentacao: novoConteudo.fundamentacao,
            observacoes: novoConteudo.argumentacao,
            probabilidade_sucesso: 85, // Alta probabilidade para conversões
            updated_at: new Date().toISOString()
          })
          .eq('id', recurso.id);
        
        if (updateError) {
          console.log(`   ❌ Erro ao atualizar: ${updateError.message}`);
        } else {
          console.log(`   ✅ Recurso corrigido para tipo "conversao"`);
          recursosCorrigidos++;
        }
        
        console.log('');
      } else {
        console.log(`⏭️ Recurso ${recurso.id}: Não é multa leve (R$ ${(multa.valor_original || multa.valor_final).toFixed(2)})`);
      }
    }
    
    console.log('=' .repeat(70));
    console.log(`✅ Correção concluída: ${recursosCorrigidos} recursos corrigidos`);
    
  } catch (error) {
    console.error('❌ Erro durante correção:', error.message);
  }
}

// Executar correção
fixConversaoRecursos();