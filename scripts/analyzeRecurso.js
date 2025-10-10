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

// Função para verificar se uma multa é leve
function isMultaLeve(valor, codigoInfracao) {
  // Códigos de infrações leves do CTB
  const codigosLeves = [
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

// Função para verificar se pode converter em advertência
function podeConverterEmAdvertencia(multa, temHistorico) {
  if (!multa) return false;
  
  const isLeve = isMultaLeve(multa.valor_original || multa.valor_final, multa.codigo_infracao);
  
  console.log('🔍 Verificação de conversão:');
  console.log('  - É multa leve:', isLeve);
  console.log('  - Tem histórico:', temHistorico);
  console.log('  - Valor:', multa.valor_original || multa.valor_final);
  console.log('  - Código:', multa.codigo_infracao);
  
  return isLeve && !temHistorico;
}

async function analyzeRecurso() {
  const recursoId = '24134a30-2e5a-41dd-8938-c93caaf40772'; // ID específico mencionado pelo usuário
  
  console.log('🔍 Analisando recurso:', recursoId);
  console.log('=' .repeat(60));
  
  try {
    // Primeiro, tentar buscar o recurso específico
    const { data: recursoEspecifico, error: recursoError } = await supabase
      .from('recursos')
      .select(`
        *,
        multas!inner(
          id,
          numero_auto,
          placa_veiculo,
          data_infracao,
          data_vencimento,
          valor_original,
          valor_final,
          codigo_infracao,
          descricao_infracao,
          local_infracao,
          status,
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
    
    if (!recursoEspecifico || recursoEspecifico.length === 0) {
      console.log('❌ Recurso específico não encontrado');
      console.log('🔍 Buscando recursos similares que deveriam ter sido convertidos...');
      console.log('');
      
      // Buscar recursos com multas leves que não foram convertidos
      const { data: recursosProblematicos, error: errorProblematicos } = await supabase
        .from('recursos')
        .select(`
          *,
          multas!inner(
            id,
            numero_auto,
            placa_veiculo,
            data_infracao,
            data_vencimento,
            valor_original,
            valor_final,
            codigo_infracao,
            descricao_infracao,
            local_infracao,
            status,
            client_id,
            clients!inner(
              nome,
              cpf_cnpj,
              email
            )
          )
        `)
        .eq('tipo_recurso', 'defesa_previa')
        .lte('multas.valor_original', 293.47)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (errorProblematicos) {
        console.error('❌ Erro ao buscar recursos problemáticos:', errorProblematicos.message);
        return;
      }
      
      if (!recursosProblematicos || recursosProblematicos.length === 0) {
        console.log('✅ Nenhum recurso problemático encontrado');
        return;
      }
      
      console.log(`📋 Encontrados ${recursosProblematicos.length} recursos com multas leves que NÃO foram convertidos:`);
      console.log('');
      
      recursosProblematicos.forEach((recurso, index) => {
        const multa = recurso.multas;
        const isLeve = isMultaLeve(multa.valor_original || multa.valor_final, multa.codigo_infracao);
        
        console.log(`${index + 1}. RECURSO ID: ${recurso.id}`);
        console.log(`   Auto: ${multa.numero_auto}`);
        console.log(`   Placa: ${multa.placa_veiculo}`);
        console.log(`   Valor: R$ ${(multa.valor_original || multa.valor_final).toFixed(2)}`);
        console.log(`   Código: ${multa.codigo_infracao}`);
        console.log(`   É leve: ${isLeve ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`   Tipo atual: ${recurso.tipo_recurso}`);
        console.log(`   🚨 DEVERIA SER: conversao`);
        console.log('');
      });
      
      return;
    }
    
    const recursos = recursoEspecifico;
    
    if (recursos.length > 1) {
      console.log('⚠️ Múltiplos recursos encontrados:', recursos.length);
    }
    
    const recurso = recursos[0];
    
    console.log('📋 DADOS DO RECURSO:');
    console.log('  ID:', recurso.id);
    console.log('  Tipo:', recurso.tipo_recurso);
    console.log('  Status:', recurso.status);
    console.log('  Data criação:', new Date(recurso.created_at).toLocaleString('pt-BR'));
    console.log('  Probabilidade sucesso:', recurso.probabilidade_sucesso + '%');
    console.log('');
    
    const multa = recurso.multas;
    console.log('🚗 DADOS DA MULTA:');
    console.log('  ID:', multa.id);
    console.log('  Número auto:', multa.numero_auto);
    console.log('  Placa:', multa.placa_veiculo);
    console.log('  Data infração:', multa.data_infracao);
    console.log('  Código infração:', multa.codigo_infracao);
    console.log('  Descrição:', multa.descricao_infracao);
    console.log('  Valor original:', 'R$', (multa.valor_original || 0).toFixed(2));
    console.log('  Valor final:', 'R$', (multa.valor_final || 0).toFixed(2));
    console.log('  Local:', multa.local_infracao);
    console.log('  Status:', multa.status);
    console.log('');
    
    const cliente = multa.clients;
    console.log('👤 DADOS DO CLIENTE:');
    console.log('  Nome:', cliente.nome);
    console.log('  CPF/CNPJ:', cliente.cpf_cnpj);
    console.log('  Email:', cliente.email);
    console.log('');
    
    // Verificar se é multa leve
    const isLeve = isMultaLeve(multa.valor_original || multa.valor_final, multa.codigo_infracao);
    console.log('⚖️ ANÁLISE DA INFRAÇÃO:');
    console.log('  É multa leve:', isLeve ? '✅ SIM' : '❌ NÃO');
    
    if (isLeve) {
      console.log('  🎯 Esta multa DEVERIA ser elegível para conversão em advertência (Art. 267 CTB)');
      
      // Verificar histórico do cliente (simulado - assumindo sem histórico para teste)
      const temHistorico = false; // Em produção, verificar histórico real
      const podeConverter = podeConverterEmAdvertencia(multa, temHistorico);
      
      console.log('  Pode converter:', podeConverter ? '✅ SIM' : '❌ NÃO');
      
      if (podeConverter && recurso.tipo_recurso !== 'conversao') {
        console.log('');
        console.log('🚨 PROBLEMA IDENTIFICADO:');
        console.log('  ❌ Recurso deveria ser tipo "conversao" mas é "' + recurso.tipo_recurso + '"');
        console.log('  ❌ Não foi aplicado o Art. 267 do CTB');
        console.log('');
        console.log('🔧 POSSÍVEIS CAUSAS:');
        console.log('  1. Bug na função handleHistoricoResponse');
        console.log('  2. Parâmetro incorreto passado para podeConverterEmAdvertencia');
        console.log('  3. Lógica de detecção de multa leve falhou');
        console.log('  4. Modal de histórico não foi exibido corretamente');
      } else if (recurso.tipo_recurso === 'conversao') {
        console.log('  ✅ Recurso foi corretamente identificado como conversão');
      }
    } else {
      console.log('  ℹ️ Multa não é leve, conversão não aplicável');
    }
    
    console.log('');
    console.log('📄 CONTEÚDO DO RECURSO:');
    console.log('  Fundamentação:', recurso.fundamentacao ? 'Presente (' + recurso.fundamentacao.length + ' chars)' : 'Ausente');
    console.log('  Argumentação:', recurso.argumentacao ? 'Presente (' + recurso.argumentacao.length + ' chars)' : 'Ausente');
    
    if (recurso.argumentacao) {
      const temArt267 = recurso.argumentacao.toLowerCase().includes('267') || 
                       recurso.argumentacao.toLowerCase().includes('advertência');
      console.log('  Menciona Art. 267:', temArt267 ? '✅ SIM' : '❌ NÃO');
    }
    
    console.log('');
    console.log('=' .repeat(60));
    console.log('✅ Análise concluída');
    
  } catch (error) {
    console.error('❌ Erro durante análise:', error.message);
  }
}

// Executar análise
analyzeRecurso();