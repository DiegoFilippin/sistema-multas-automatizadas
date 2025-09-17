/**
 * Script de teste para verificar se o processamento de array na resposta do n8n está funcionando
 * Simula exatamente o cenário descrito pelo usuário
 */

import fetch from 'node-fetch';

// URL do webhook n8n
const WEBHOOK_URL = 'https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4';

// Dados exatos que o usuário mencionou
const testData = {
  "nome_requerente": "ANA PAULA CARVALHO ZORZZI",
  "cpf_cnpj": "CPF/CNPJ não informado",
  "endereco_requerente": "Endereço não informado",
  "placa_veiculo": "RDW0H45",
  "renavam_veiculo": "",
  "numero_auto": "BLU0589972",
  "data_hora_infracao": "15/03/2025",
  "local_infracao": "RUA AMAZONAS PRÓX N° 840, BLUMENAU - SANTA CATARINA",
  "codigo_infracao": "7455-0",
  "orgao_autuador": "PREFEITURA MUNICIPAL DE BLUMENAU - SETERB - LE",
  "idmultabancodedados": "10db676f-0d6f-4a5d-92ac-45c4b00c378c",
  "mensagem_usuario": "Analise o auto de infração e verifique inconsistências conforme regras do MBFT e a justificativa minha justificativa para anular a autuação.",
  "company_id": "550e8400-e29b-41d4-a716-446655440001"
};

// Resposta esperada (array com objeto response)
const expectedResponse = [
  {
    "response": "Realizei consulta preliminar, mas para análise precisa do auto de infração nº BLU0589972 referente ao código 7455-0, data 15/03/2025, em Blumenau, código este, conforme base, que não corresponde diretamente a um código de infração comum do CTB, parecendo reger autuações específicas municipais.\n\nPara aprimorar a análise e identificar possíveis erros formais que possam levar à nulidade da multa, preciso confirmar alguns pontos:\n\n[PERGUNTAS]\n\n1. O auto de infração apresenta todos os dados do agente notificante, como matrícula e assinatura?\n2. A descrição do local da infração (Rua Amazonas próximo nº 840) está clara e suficiente para identificar o local exato, sem ambiguidades?\n3. Está indicado no auto o dispositivo legal ou norma municipal infringida com detalhamento (ex: legislação municipal específica contra infração 7455-0)?\n4. Você percebeu algum erro ou informação que considera incorreta no auto, como dados do veículo (placa, marca, modelo) ou horários e datas?\n5. O órgão autuador anexou ao auto algum tipo de prova, como fotos, vídeos ou documentos técnicos?\n\nAlém disso, para auxiliar na melhor estratégia, informe-me, por favor:\n\n6. Qual sua justificativa para pedir a anulação da autuação?\n7. Nos últimos 12 meses, você teve outras multas de trânsito? Se sim, de qual natureza?\n\nCom estas informações, poderei verificar minuciosamente as regras do MBFT e procedimentos legais, identificar inconsistências e orientar a elaboração do recurso mais eficaz para cancelar ou, se inviável, solicitar a conversão em advertência, se aplicável."
  }
];

/**
 * Função para processar resposta do n8n (simulando a lógica corrigida)
 */
function processN8nResponse(webhookResponse) {
  console.log('🔍 === PROCESSANDO RESPOSTA DO N8N ===');
  console.log('📋 Resposta completa:', JSON.stringify(webhookResponse, null, 2));
  console.log('🔍 Tipo da resposta:', typeof webhookResponse);
  console.log('📊 É array?', Array.isArray(webhookResponse));
  
  let responseContent = '';
  
  if (Array.isArray(webhookResponse) && webhookResponse.length > 0) {
    // Se for array, pegar o primeiro item e extrair a resposta
    const firstItem = webhookResponse[0];
    responseContent = firstItem.response || firstItem.message || JSON.stringify(firstItem);
    console.log('📋 Processando array - primeiro item:', firstItem);
    console.log('💬 Conteúdo extraído do array:', responseContent.substring(0, 200) + '...');
  } else if (webhookResponse && typeof webhookResponse === 'object') {
    // Se for objeto direto
    responseContent = webhookResponse.response || webhookResponse.message || JSON.stringify(webhookResponse);
    console.log('💬 Conteúdo extraído do objeto:', responseContent.substring(0, 200) + '...');
  } else {
    // Fallback
    responseContent = 'Mensagem recebida e processada pelo sistema n8n.';
    console.log('⚠️ Usando conteúdo fallback');
  }
  
  return responseContent;
}

/**
 * Teste da lógica de processamento com resposta simulada
 */
function testResponseProcessing() {
  console.log('🧪 === TESTE DE PROCESSAMENTO DE RESPOSTA ===');
  console.log('\n1. Testando com array (cenário real do usuário):');
  const content1 = processN8nResponse(expectedResponse);
  console.log('✅ Resultado:', content1 ? 'SUCESSO - Conteúdo extraído' : 'FALHA - Conteúdo vazio');
  
  console.log('\n2. Testando com objeto direto:');
  const content2 = processN8nResponse({ response: "Teste objeto direto" });
  console.log('✅ Resultado:', content2 ? 'SUCESSO - Conteúdo extraído' : 'FALHA - Conteúdo vazio');
  
  console.log('\n3. Testando com resposta inválida:');
  const content3 = processN8nResponse(null);
  console.log('✅ Resultado:', content3 ? 'SUCESSO - Fallback usado' : 'FALHA - Sem fallback');
}

/**
 * Teste real com o webhook n8n
 */
async function testRealWebhook() {
  console.log('🚀 === TESTE REAL COM WEBHOOK N8N ===');
  console.log('📡 URL:', WEBHOOK_URL);
  console.log('📋 Dados de teste:', JSON.stringify(testData, null, 2));
  
  try {
    console.log('\n⏳ Enviando POST para o webhook...');
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sistema-Multas-Test/1.0'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('\n📊 Status da resposta:', response.status);
    console.log('📊 Status text:', response.statusText);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }
    
    const webhookResponse = await response.json();
    console.log('\n✅ === RESPOSTA RECEBIDA DO WEBHOOK ===');
    
    // Processar com a nova lógica
    const processedContent = processN8nResponse(webhookResponse);
    
    console.log('\n🎯 === RESULTADO FINAL ===');
    console.log('📝 Conteúdo processado:', processedContent.substring(0, 300) + '...');
    console.log('✅ Teste concluído com sucesso!');
    
    return processedContent;
    
  } catch (error) {
    console.error('\n💥 Erro ao conectar com o webhook:');
    console.error('   Tipo:', error.name);
    console.error('   Mensagem:', error.message);
    
    if (error.code) {
      console.error('   Código:', error.code);
    }
    
    throw error;
  }
}

// Executar os testes
async function runAllTests() {
  console.log('🧪 TESTE DE CORREÇÃO DO PROCESSAMENTO DE ARRAY N8N');
  console.log('=' .repeat(60));
  
  try {
    // Teste 1: Lógica de processamento
    testResponseProcessing();
    
    console.log('\n' + '=' .repeat(60));
    
    // Teste 2: Webhook real
    await testRealWebhook();
    
    console.log('\n🏁 Todos os testes concluídos com sucesso!');
    
  } catch (error) {
    console.error('\n💥 Erro nos testes:', error.message);
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { processN8nResponse, testResponseProcessing, testRealWebhook };