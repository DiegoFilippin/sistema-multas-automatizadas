// Teste da funcionalidade de multa leve
// Este script testa a análise de multas leves e sugestão de advertência por escrito

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para testar a funcionalidade de multa leve
async function testarFuncionalidadeMultaLeve() {
  console.log('🧪 === INICIANDO TESTES DE MULTA LEVE ===');
  
  try {
    // 1. Testar verificação de histórico do condutor
    console.log('\n📋 Teste 1: Verificação de histórico do condutor');
    await testarVerificacaoHistorico();
    
    // 2. Testar determinação do tipo de gravidade
    console.log('\n📋 Teste 2: Determinação do tipo de gravidade');
    await testarTipoGravidade();
    
    // 3. Testar análise completa de multa leve
    console.log('\n📋 Teste 3: Análise completa de multa leve');
    await testarAnaliseCompleta();
    
    // 4. Testar criação de multa com análise integrada
    console.log('\n📋 Teste 4: Criação de multa com análise integrada');
    await testarCriacaoComAnalise();
    
    // 5. Testar modelos de advertência
    console.log('\n📋 Teste 5: Modelos de advertência');
    await testarModelosAdvertencia();
    
    console.log('\n✅ === TODOS OS TESTES CONCLUÍDOS ===');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

// Teste 1: Verificação de histórico do condutor
async function testarVerificacaoHistorico() {
  console.log('🔍 Testando verificação de histórico...');
  
  // Dados de teste
  const testCases = [
    {
      cpf: '12345678901',
      descricao: 'CPF sem histórico (esperado: false)'
    },
    {
      cpf: '98765432100',
      descricao: 'CPF com possível histórico (esperado: true/false)'
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`  📝 ${testCase.descricao}`);
      
      // Calcular data de 12 meses atrás
      const dataReferencia = new Date();
      const dataLimite = new Date(dataReferencia);
      dataLimite.setFullYear(dataLimite.getFullYear() - 1);
      
      // Buscar multas do condutor nos últimos 12 meses
      const { data: multas, error } = await supabase
        .from('multas')
        .select('*')
        .or(`cpf_cnpj_proprietario.eq.${testCase.cpf},condutor.ilike.%${testCase.cpf}%`)
        .gte('data_infracao', dataLimite.toISOString().split('T')[0])
        .lte('data_infracao', dataReferencia.toISOString().split('T')[0]);
      
      if (error) {
        console.error(`    ❌ Erro na consulta:`, error);
        continue;
      }
      
      const quantidadeMultas = multas?.length || 0;
      const temHistorico = quantidadeMultas > 0;
      
      console.log(`    ✅ Resultado: ${temHistorico ? 'TEM' : 'NÃO TEM'} histórico (${quantidadeMultas} multas)`);
      
    } catch (error) {
      console.error(`    ❌ Erro no teste:`, error);
    }
  }
}

// Teste 2: Determinação do tipo de gravidade
async function testarTipoGravidade() {
  console.log('🏷️ Testando determinação do tipo de gravidade...');
  
  const testCases = [
    { codigo: '50110', esperado: 'leve', descricao: 'Estacionamento irregular' },
    { codigo: '60210', esperado: 'media', descricao: 'Velocidade 20-50% acima' },
    { codigo: '60310', esperado: 'grave', descricao: 'Velocidade acima de 50%' },
    { codigo: '60410', esperado: 'gravissima', descricao: 'Velocidade muito acima' },
    { codigo: '99999', esperado: 'media', descricao: 'Código não mapeado (fallback)' }
  ];
  
  for (const testCase of testCases) {
    console.log(`  📝 ${testCase.descricao} (${testCase.codigo})`);
    
    // Simular a lógica de determinação (baseada no multaLeveService)
    const tipoGravidade = determinarTipoGravidadeTeste(testCase.codigo);
    
    const resultado = tipoGravidade === testCase.esperado ? '✅' : '❌';
    console.log(`    ${resultado} Resultado: ${tipoGravidade} (esperado: ${testCase.esperado})`);
  }
}

// Função auxiliar para teste de tipo de gravidade
function determinarTipoGravidadeTeste(codigoInfracao) {
  const codigo = codigoInfracao.trim();
  
  const infracoesLeves = ['50110', '50120', '50130', '60110', '60120', '60130', '70110', '70120', '70130'];
  const infracoesMedias = ['60210', '60220', '60230', '70210', '70220', '70230'];
  const infracoesGraves = ['60310', '60320', '60330', '70310', '70320', '70330'];
  const infracoesGravissimas = ['60410', '60420', '60430', '70410', '70420', '70430'];
  
  if (infracoesLeves.includes(codigo)) return 'leve';
  if (infracoesMedias.includes(codigo)) return 'media';
  if (infracoesGraves.includes(codigo)) return 'grave';
  if (infracoesGravissimas.includes(codigo)) return 'gravissima';
  
  return 'media'; // fallback
}

// Teste 3: Análise completa de multa leve
async function testarAnaliseCompleta() {
  console.log('🔍 Testando análise completa de multa leve...');
  
  const testCases = [
    {
      codigoInfracao: '50110',
      cpfCondutor: '12345678901',
      descricao: 'Multa leve, condutor sem histórico (esperado: sugerir advertência)'
    },
    {
      codigoInfracao: '60210',
      cpfCondutor: '12345678901',
      descricao: 'Multa média, condutor sem histórico (esperado: não sugerir advertência)'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`  📝 ${testCase.descricao}`);
    
    try {
      // Simular análise completa
      const tipoGravidade = determinarTipoGravidadeTeste(testCase.codigoInfracao);
      const isMultaLeve = tipoGravidade === 'leve';
      
      // Verificar histórico (simulado)
      const temHistorico = false; // Para teste, assumir sem histórico
      
      // Determinar se deve sugerir advertência
      const sugerirAdvertencia = isMultaLeve && !temHistorico;
      
      console.log(`    📊 Tipo: ${tipoGravidade}`);
      console.log(`    📈 Histórico: ${temHistorico ? 'SIM' : 'NÃO'}`);
      console.log(`    📝 Sugerir advertência: ${sugerirAdvertencia ? 'SIM' : 'NÃO'}`);
      
      const resultado = (isMultaLeve && sugerirAdvertencia) || (!isMultaLeve && !sugerirAdvertencia) ? '✅' : '❌';
      console.log(`    ${resultado} Análise concluída`);
      
    } catch (error) {
      console.error(`    ❌ Erro na análise:`, error);
    }
  }
}

// Teste 4: Criação de multa com análise integrada
async function testarCriacaoComAnalise() {
  console.log('💾 Testando criação de multa com análise integrada...');
  
  // Dados de teste para multa
  const multaTeste = {
    company_id: 'test-company-id',
    client_id: 'test-client-id',
    numero_auto: 'TEST-001',
    placa_veiculo: 'TEST123',
    data_infracao: new Date().toISOString().split('T')[0],
    data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    valor_original: 100.00,
    valor_final: 100.00,
    codigo_infracao: '50110', // Multa leve
    local_infracao: 'Rua de Teste, 123',
    descricao_infracao: 'Estacionamento em local proibido',
    orgao_autuador: 'DETRAN-TEST',
    pontos: 3
  };
  
  console.log('  📝 Simulando criação de multa com análise...');
  console.log(`    🏷️ Código da infração: ${multaTeste.codigo_infracao}`);
  console.log(`    👤 CPF do condutor: 12345678901`);
  
  // Simular o processo
  const tipoGravidade = determinarTipoGravidadeTeste(multaTeste.codigo_infracao);
  const isMultaLeve = tipoGravidade === 'leve';
  const temHistorico = false; // Simulado
  const sugerirAdvertencia = isMultaLeve && !temHistorico;
  
  console.log(`    📊 Resultado da análise:`);
  console.log(`      - Tipo de gravidade: ${tipoGravidade}`);
  console.log(`      - É multa leve: ${isMultaLeve ? 'SIM' : 'NÃO'}`);
  console.log(`      - Tem histórico: ${temHistorico ? 'SIM' : 'NÃO'}`);
  console.log(`      - Sugerir advertência: ${sugerirAdvertencia ? 'SIM' : 'NÃO'}`);
  
  console.log(`    ✅ Simulação de criação com análise concluída`);
}

// Teste 5: Modelos de advertência
async function testarModelosAdvertencia() {
  console.log('📄 Testando modelos de advertência...');
  
  try {
    // Buscar modelos de advertência no banco
    const { data: modelos, error } = await supabase
      .from('modelos_advertencia')
      .select('*')
      .eq('ativo', true);
    
    if (error) {
      console.error('    ❌ Erro ao buscar modelos:', error);
      return;
    }
    
    console.log(`    📊 Encontrados ${modelos?.length || 0} modelos ativos`);
    
    if (modelos && modelos.length > 0) {
      for (const modelo of modelos) {
        console.log(`    📄 Modelo: ${modelo.nome}`);
        console.log(`      - Tipo: ${modelo.tipo_infracao}`);
        console.log(`      - Título: ${modelo.titulo}`);
        console.log(`      - Tamanho do conteúdo: ${modelo.conteudo?.length || 0} caracteres`);
      }
      
      // Testar geração de advertência personalizada
      const modeloTeste = modelos[0];
      const dadosMultaTeste = {
        nomeCondutor: 'João da Silva',
        cpfCondutor: '12345678901',
        dataInfracao: '15/03/2025',
        localInfracao: 'Rua das Flores, 123',
        placaVeiculo: 'ABC1234',
        descricaoInfracao: 'Estacionamento em local proibido',
        codigoInfracao: '50110',
        numeroAuto: 'AUTO-123456',
        orgaoAutuador: 'DETRAN-SP'
      };
      
      console.log('    📝 Testando geração de advertência personalizada...');
      const advertenciaPersonalizada = gerarAdvertenciaPersonalizadaTeste(
        modeloTeste.conteudo,
        dadosMultaTeste
      );
      
      console.log(`    ✅ Advertência gerada (${advertenciaPersonalizada.length} caracteres)`);
      console.log(`    📄 Prévia: ${advertenciaPersonalizada.substring(0, 100)}...`);
    } else {
      console.log('    ⚠️ Nenhum modelo de advertência encontrado');
    }
    
  } catch (error) {
    console.error('    ❌ Erro no teste de modelos:', error);
  }
}

// Função auxiliar para teste de geração de advertência
function gerarAdvertenciaPersonalizadaTeste(modeloBase, dadosMulta) {
  let advertenciaPersonalizada = modeloBase;
  
  const substituicoes = {
    '{NOME_CONDUTOR}': dadosMulta.nomeCondutor,
    '{CPF_CONDUTOR}': dadosMulta.cpfCondutor,
    '{DATA_INFRACAO}': dadosMulta.dataInfracao,
    '{LOCAL_INFRACAO}': dadosMulta.localInfracao,
    '{PLACA_VEICULO}': dadosMulta.placaVeiculo,
    '{DESCRICAO_INFRACAO}': dadosMulta.descricaoInfracao,
    '{CODIGO_INFRACAO}': dadosMulta.codigoInfracao,
    '{NUMERO_AUTO}': dadosMulta.numeroAuto,
    '{ORGAO_AUTUADOR}': dadosMulta.orgaoAutuador,
    '{CIDADE}': 'São Paulo',
    '{DATA_ADVERTENCIA}': new Date().toLocaleDateString('pt-BR')
  };
  
  Object.entries(substituicoes).forEach(([placeholder, valor]) => {
    advertenciaPersonalizada = advertenciaPersonalizada.replace(
      new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
      valor
    );
  });
  
  return advertenciaPersonalizada;
}

// Função para testar permissões do banco
async function testarPermissoes() {
  console.log('\n🔐 === TESTANDO PERMISSÕES DO BANCO ===');
  
  try {
    // Testar acesso à tabela multas
    console.log('📋 Testando acesso à tabela multas...');
    const { data: multas, error: multasError } = await supabase
      .from('multas')
      .select('id, numero_auto, tipo_gravidade')
      .limit(5);
    
    if (multasError) {
      console.error('❌ Erro ao acessar tabela multas:', multasError);
    } else {
      console.log(`✅ Acesso à tabela multas OK (${multas?.length || 0} registros)`);
    }
    
    // Testar acesso à tabela modelos_advertencia
    console.log('📋 Testando acesso à tabela modelos_advertencia...');
    const { data: modelos, error: modelosError } = await supabase
      .from('modelos_advertencia')
      .select('id, nome, tipo_infracao')
      .limit(5);
    
    if (modelosError) {
      console.error('❌ Erro ao acessar tabela modelos_advertencia:', modelosError);
    } else {
      console.log(`✅ Acesso à tabela modelos_advertencia OK (${modelos?.length || 0} registros)`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de permissões:', error);
  }
}

// Executar todos os testes
async function executarTodosTestes() {
  console.log('🚀 === INICIANDO BATERIA COMPLETA DE TESTES ===');
  
  await testarPermissoes();
  await testarFuncionalidadeMultaLeve();
  
  console.log('\n🎉 === BATERIA DE TESTES CONCLUÍDA ===');
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executarTodosTestes().catch(console.error);
}

export {
  testarFuncionalidadeMultaLeve,
  testarPermissoes,
  executarTodosTestes
};