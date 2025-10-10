import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Modelo esperado para Art. 267 CTB
const MODELO_ART267_ELEMENTOS = {
  cabecalho: [
    'PEDIDO DE CONVERSÃO DE MULTA EM ADVERTÊNCIA POR ESCRITO',
    'Art. 267 do Código de Trânsito Brasileiro',
    'Auto de Infração'
  ],
  identificacao: [
    'requerente',
    'CPF',
    'endereço',
    'veículo',
    'placa'
  ],
  fundamentacao: [
    'Art. 267',
    'infração leve',
    'primeira vez',
    'últimos 12 meses',
    'advertência por escrito'
  ],
  pedido: [
    'conversão da multa',
    'advertência por escrito',
    'substituição da penalidade'
  ],
  encerramento: [
    'Termos em que',
    'Pede deferimento',
    'local e data',
    'assinatura'
  ]
};

async function analyzeRecursoArt267() {
  // ID do recurso mencionado não foi encontrado, vamos analisar um recurso de conversão existente
  const recursoId = 'f150cc45-d80c-4459-bce0-598f896b8f1c'; // Recurso de conversão encontrado
  
  console.log('🔍 Analisando Recurso Art. 267 CTB');
  console.log('ID:', recursoId);
  console.log('=' .repeat(80));
  
  try {
    // Buscar o recurso com dados da multa
    const { data: recursos, error: recursoError } = await supabase
      .from('recursos')
      .select(`
        *,
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
          client_id,
          clients!inner(
            nome,
            cpf_cnpj,
            email
          )
        )
      `)
      .eq('id', recursoId);
    
    if (recursoError) {
      console.error('❌ Erro ao buscar recurso:', recursoError.message);
      return;
    }
    
    if (!recursos || recursos.length === 0) {
      console.log('❌ Recurso não encontrado');
      return;
    }
    
    const recurso = recursos[0];
    const multa = recurso.multas;
    const cliente = multa.clients;
    
    console.log('📋 DADOS BÁSICOS DO RECURSO:');
    console.log('  ID:', recurso.id);
    console.log('  Tipo:', recurso.tipo_recurso);
    console.log('  Status:', recurso.status);
    console.log('  Data criação:', new Date(recurso.created_at).toLocaleString('pt-BR'));
    console.log('  Número processo:', recurso.numero_processo);
    console.log('');
    
    console.log('🚗 DADOS DA MULTA:');
    console.log('  Número auto:', multa.numero_auto);
    console.log('  Placa:', multa.placa_veiculo);
    console.log('  Valor:', 'R$', (multa.valor_original || 0).toFixed(2));
    console.log('  Código infração:', multa.codigo_infracao);
    console.log('  Descrição:', multa.descricao_infracao);
    console.log('');
    
    console.log('👤 DADOS DO CLIENTE:');
    console.log('  Nome:', cliente.nome);
    console.log('  CPF/CNPJ:', cliente.cpf_cnpj);
    console.log('');
    
    // Verificar se é do tipo conversão
    const isConversao = recurso.tipo_recurso === 'conversao';
    console.log('⚖️ ANÁLISE DO TIPO:');
    console.log('  É conversão Art. 267:', isConversao ? '✅ SIM' : '❌ NÃO');
    
    if (!isConversao) {
      console.log('  ⚠️ PROBLEMA: Recurso não é do tipo "conversao"');
      console.log('  📝 Tipo atual:', recurso.tipo_recurso);
      console.log('');
    }
    
    // Verificar se é multa leve
    const valorMulta = multa.valor_original || multa.valor_final || 0;
    const isMultaLeve = valorMulta <= 293.47;
    console.log('  É multa leve (≤ R$ 293,47):', isMultaLeve ? '✅ SIM' : '❌ NÃO');
    console.log('');
    
    // Analisar conteúdo da fundamentação
    console.log('📄 ANÁLISE DO CONTEÚDO:');
    console.log('=' .repeat(50));
    
    const fundamentacao = recurso.fundamentacao || '';
    const argumentacao = recurso.argumentacao || '';
    const conteudoCompleto = fundamentacao + ' ' + argumentacao;
    
    console.log('📝 FUNDAMENTAÇÃO COMPLETA:');
    console.log(fundamentacao);
    console.log('');
    
    if (argumentacao && argumentacao !== fundamentacao) {
      console.log('📝 ARGUMENTAÇÃO:');
      console.log(argumentacao);
      console.log('');
    }
    
    // Verificar elementos do modelo Art. 267
    console.log('🔍 VERIFICAÇÃO DO MODELO ART. 267:');
    console.log('=' .repeat(50));
    
    let pontuacao = 0;
    let totalElementos = 0;
    
    Object.entries(MODELO_ART267_ELEMENTOS).forEach(([secao, elementos]) => {
      console.log(`\n📋 ${secao.toUpperCase()}:`);
      
      elementos.forEach(elemento => {
        totalElementos++;
        const presente = conteudoCompleto.toLowerCase().includes(elemento.toLowerCase());
        console.log(`  ${presente ? '✅' : '❌'} ${elemento}: ${presente ? 'PRESENTE' : 'AUSENTE'}`);
        if (presente) pontuacao++;
      });
    });
    
    const percentualConformidade = ((pontuacao / totalElementos) * 100).toFixed(1);
    console.log('');
    console.log('📊 RESULTADO DA ANÁLISE:');
    console.log('=' .repeat(50));
    console.log(`  Elementos presentes: ${pontuacao}/${totalElementos}`);
    console.log(`  Conformidade com modelo: ${percentualConformidade}%`);
    
    if (percentualConformidade < 70) {
      console.log('  🚨 CRÍTICO: Baixa conformidade com o modelo Art. 267');
    } else if (percentualConformidade < 85) {
      console.log('  ⚠️ ATENÇÃO: Conformidade moderada, precisa melhorias');
    } else {
      console.log('  ✅ BOM: Alta conformidade com o modelo');
    }
    
    console.log('');
    console.log('🔧 PROBLEMAS IDENTIFICADOS:');
    console.log('=' .repeat(50));
    
    const problemas = [];
    
    if (!isConversao) {
      problemas.push('❌ Tipo de recurso incorreto (deveria ser "conversao")');
    }
    
    if (!isMultaLeve) {
      problemas.push('❌ Valor da multa não é leve (> R$ 293,47)');
    }
    
    if (!conteudoCompleto.toLowerCase().includes('art. 267') && 
        !conteudoCompleto.toLowerCase().includes('artigo 267')) {
      problemas.push('❌ Não menciona explicitamente o Art. 267 do CTB');
    }
    
    if (!conteudoCompleto.toLowerCase().includes('advertência por escrito')) {
      problemas.push('❌ Não solicita "advertência por escrito"');
    }
    
    if (!conteudoCompleto.toLowerCase().includes('conversão')) {
      problemas.push('❌ Não solicita "conversão" da multa');
    }
    
    if (!conteudoCompleto.toLowerCase().includes('primeira vez') && 
        !conteudoCompleto.toLowerCase().includes('12 meses') &&
        !conteudoCompleto.toLowerCase().includes('histórico')) {
      problemas.push('❌ Não menciona ausência de histórico de infrações');
    }
    
    if (problemas.length === 0) {
      console.log('  ✅ Nenhum problema crítico identificado');
    } else {
      problemas.forEach(problema => console.log(`  ${problema}`));
    }
    
    console.log('');
    console.log('💡 SUGESTÕES DE MELHORIA:');
    console.log('=' .repeat(50));
    console.log('  1. Incluir cabeçalho específico: "PEDIDO DE CONVERSÃO DE MULTA EM ADVERTÊNCIA POR ESCRITO"');
    console.log('  2. Mencionar explicitamente o Art. 267 do CTB');
    console.log('  3. Destacar que é infração LEVE');
    console.log('  4. Enfatizar ausência de histórico nos últimos 12 meses');
    console.log('  5. Solicitar claramente a "conversão" da multa em "advertência por escrito"');
    console.log('  6. Incluir fundamentação legal específica do Art. 267');
    console.log('  7. Estruturar o pedido de forma mais formal e direta');
    
    console.log('');
    console.log('📋 MODELO RECOMENDADO:');
    console.log('=' .repeat(50));
    console.log(`
PEDIDO DE CONVERSÃO DE MULTA EM ADVERTÊNCIA POR ESCRITO
Art. 267 do Código de Trânsito Brasileiro
Auto de Infração nº ${multa.numero_auto}

Ilmo. Sr. Diretor do [Órgão Autuador]

${cliente.nome}, brasileiro(a), portador(a) do CPF nº ${cliente.cpf_cnpj}, 
proprietário(a) do veículo placa ${multa.placa_veiculo}, vem respeitosamente 
requerer a V.Sa. a CONVERSÃO DA MULTA EM ADVERTÊNCIA POR ESCRITO, 
com base no Art. 267 do Código de Trânsito Brasileiro.

FUNDAMENTAÇÃO:

1. A infração cometida é classificada como LEVE (valor R$ ${valorMulta.toFixed(2)});
2. O requerente NÃO possui registro de multas nos últimos 12 meses;
3. O Art. 267 do CTB estabelece que a penalidade de multa pode ser 
   convertida em advertência por escrito quando se tratar de infração 
   leve cometida pela primeira vez.

PEDIDO:

Diante do exposto, requer-se a aplicação do Art. 267 do CTB, convertendo 
a multa em ADVERTÊNCIA POR ESCRITO, em substituição à penalidade pecuniária.

Termos em que,
Pede deferimento.

[Local], [Data]

_________________________
${cliente.nome}
CPF: ${cliente.cpf_cnpj}`);
    
    console.log('');
    console.log('=' .repeat(80));
    console.log('✅ Análise concluída');
    
  } catch (error) {
    console.error('❌ Erro durante análise:', error.message);
  }
}

// Executar análise
analyzeRecursoArt267();