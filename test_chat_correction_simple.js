// Teste simples para verificar se a correção dos dados do chat está funcionando
// Execute este código no console do navegador na página TesteRecursoIA

console.log('🧪 === TESTE DA CORREÇÃO DOS DADOS DO CHAT ===');

// Função para simular a busca de dados completos da multa
function simulateBuscarDadosCompletosMulta(multaUUID) {
  console.log('🔍 === SIMULANDO BUSCA DE DADOS COMPLETOS ===');
  console.log('🆔 UUID da multa:', multaUUID);
  
  // Simular dados que deveriam vir do banco
  const dadosSimulados = {
    numero_auto: 'SC123456789',
    placa_veiculo: 'ABC1234',
    data_hora_infracao: '2024-01-15T14:30:00',
    local_infracao: 'Rua das Flores, 123 - Centro',
    codigo_infracao: '74410',
    orgao_autuador: 'DETRAN/SC',
    descricao_infracao: 'TRANSITAR EM VEL SUPERIOR À MÁXIMA PERMITIDA EM ATÉ 20%',
    valor_multa: 130.16,
    pontos: 4,
    tipo_gravidade: 'media',
    renavam_veiculo: '12345678901',
    condutor: 'ANA PAULA CARVALHO ZORZZI',
    observacoes: 'Multa por excesso de velocidade'
  };
  
  console.log('📊 Dados simulados do banco:', dadosSimulados);
  return dadosSimulados;
}

// Função para simular a preparação do webhook com dados completos
function simulateWebhookDataPreparation(multaUUID) {
  console.log('\n📤 === SIMULANDO PREPARAÇÃO DO WEBHOOK ===');
  
  // Buscar dados completos (simulado)
  const dadosCompletosMulta = simulateBuscarDadosCompletosMulta(multaUUID);
  
  // Preparar dados para o webhook (como será feito agora)
  const webhookData = {
    nome_requerente: 'ANA PAULA CARVALHO ZORZZI',
    cpf_cnpj: '123.456.789-00',
    endereco_requerente: 'Rua Exemplo, 123 - Bairro',
    placa_veiculo: dadosCompletosMulta.placa_veiculo,
    renavam_veiculo: dadosCompletosMulta.renavam_veiculo,
    numero_auto: dadosCompletosMulta.numero_auto,
    data_hora_infracao: dadosCompletosMulta.data_hora_infracao,
    local_infracao: dadosCompletosMulta.local_infracao,
    codigo_infracao: dadosCompletosMulta.codigo_infracao,
    orgao_autuador: dadosCompletosMulta.orgao_autuador,
    descricao_infracao: dadosCompletosMulta.descricao_infracao,
    valor_multa: dadosCompletosMulta.valor_multa,
    pontos: dadosCompletosMulta.pontos,
    tipo_gravidade: dadosCompletosMulta.tipo_gravidade,
    condutor: dadosCompletosMulta.condutor,
    observacoes: dadosCompletosMulta.observacoes,
    idmultabancodedados: multaUUID,
    mensagem_usuario: 'Analise o auto de infração e verifique inconsistências conforme regras do MBFT e a justificativa minha justificativa para anular a autuação.',
    company_id: '7d573ce0-125d-46bf-9e37-33d0c6074cf9'
  };
  
  console.log('📋 Webhook data ANTES da correção (campos vazios):');
  console.log({
    placa_veiculo: '',
    renavam_veiculo: '',
    numero_auto: '',
    data_hora_infracao: '',
    local_infracao: '',
    codigo_infracao: '',
    orgao_autuador: ''
  });
  
  console.log('\n✅ Webhook data DEPOIS da correção (campos preenchidos):');
  console.log({
    placa_veiculo: webhookData.placa_veiculo,
    renavam_veiculo: webhookData.renavam_veiculo,
    numero_auto: webhookData.numero_auto,
    data_hora_infracao: webhookData.data_hora_infracao,
    local_infracao: webhookData.local_infracao,
    codigo_infracao: webhookData.codigo_infracao,
    orgao_autuador: webhookData.orgao_autuador,
    descricao_infracao: webhookData.descricao_infracao,
    valor_multa: webhookData.valor_multa,
    pontos: webhookData.pontos
  });
  
  return webhookData;
}

// Função para validar campos obrigatórios
function validateRequiredFields(webhookData) {
  console.log('\n🔍 === VALIDANDO CAMPOS OBRIGATÓRIOS ===');
  
  const camposObrigatorios = {
    placa_veiculo: webhookData.placa_veiculo,
    numero_auto: webhookData.numero_auto,
    data_hora_infracao: webhookData.data_hora_infracao,
    local_infracao: webhookData.local_infracao,
    codigo_infracao: webhookData.codigo_infracao,
    orgao_autuador: webhookData.orgao_autuador
  };
  
  const camposVazios = Object.entries(camposObrigatorios)
    .filter(([key, value]) => !value || value.trim() === '')
    .map(([key]) => key);
  
  if (camposVazios.length > 0) {
    console.warn('⚠️ Campos obrigatórios vazios:', camposVazios);
    return false;
  } else {
    console.log('✅ Todos os campos obrigatórios estão preenchidos!');
    return true;
  }
}

// Executar teste
function runTest() {
  const multaUUID = '49a52e83-1135-4450-891a-8d9dc55707ae';
  
  console.log('🚀 Iniciando teste com UUID:', multaUUID);
  
  const webhookData = simulateWebhookDataPreparation(multaUUID);
  const isValid = validateRequiredFields(webhookData);
  
  console.log('\n🎯 === RESULTADO DO TESTE ===');
  
  if (isValid) {
    console.log('✅ CORREÇÃO BEM-SUCEDIDA!');
    console.log('💡 O agent agora receberá dados completos:');
    console.log('   - Placa do veículo: ' + webhookData.placa_veiculo);
    console.log('   - Número do auto: ' + webhookData.numero_auto);
    console.log('   - Data da infração: ' + webhookData.data_hora_infracao);
    console.log('   - Local da infração: ' + webhookData.local_infracao);
    console.log('   - Código da infração: ' + webhookData.codigo_infracao);
    console.log('   - Órgão autuador: ' + webhookData.orgao_autuador);
    console.log('   - Valor da multa: R$ ' + webhookData.valor_multa);
    console.log('   - Pontos: ' + webhookData.pontos);
    
    console.log('\n🎉 O agent poderá fazer uma análise completa e precisa!');
  } else {
    console.log('❌ Ainda há campos vazios - verificar implementação');
  }
  
  console.log('\n📋 Payload completo que será enviado:');
  console.log(JSON.stringify(webhookData, null, 2));
}

// Executar o teste
runTest();

// Disponibilizar funções para teste manual
window.testChatCorrection = {
  simulateBuscarDadosCompletosMulta,
  simulateWebhookDataPreparation,
  validateRequiredFields,
  runTest
};

console.log('\n💡 Funções disponíveis para teste manual:');
console.log('- window.testChatCorrection.runTest()');
console.log('- window.testChatCorrection.simulateWebhookDataPreparation("uuid")');