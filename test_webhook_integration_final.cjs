// Configurações
const API_BASE = 'http://localhost:3001';
const WEBHOOK_URL = 'https://webhookn8n.synsoft.com.br/webhook/d37fac6e-9379-4bca-b015-9c56b104cae1';

// Dados de teste
const testData = {
  customer_id: '11d64113-575f-4618-8f81-a301ec3ec881', // Pedro Souza Lima
  service_id: '3f1ae29d-05de-4f3a-ab5b-aad93d449cf1', // Recurso de Multa - Leve
  company_id: 'c1f4c95f-1f16-4680-b568-aefc43390564',
  valor_cobranca: 150.00
};

// Função para inicializar fetch
let fetch;
async function initFetch() {
  if (!fetch) {
    const nodeFetch = await import('node-fetch');
    fetch = nodeFetch.default;
  }
}

async function testWebhookIntegration() {
  console.log('🚀 === TESTE FINAL DA INTEGRAÇÃO WEBHOOK ===\n');
  
  // Inicializar fetch
  await initFetch();
  
  try {
    // 1. Testar conectividade com o webhook
    console.log('1️⃣ Testando conectividade com webhook...');
    try {
      const webhookTest = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      console.log(`✅ Webhook respondeu: ${webhookTest.status}`);
    } catch (error) {
      console.log(`❌ Erro no webhook: ${error.message}`);
    }
    
    // 2. Testar criação de cobrança via API modificada
    console.log('\n2️⃣ Testando criação de cobrança via API modificada...');
    
    const response = await fetch(`${API_BASE}/api/payments/create-service-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Resposta:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('\n✅ SUCESSO! Cobrança criada via webhook');
      console.log('- ID da cobrança:', result.payment.id);
      console.log('- Webhook ID:', result.payment.webhook_id);
      console.log('- Valor:', result.payment.amount);
      console.log('- Resposta do webhook:', result.payment.webhook_response);
    } else {
      console.log('\n❌ ERRO na criação da cobrança');
      console.log('- Erro:', result.error);
      console.log('- Detalhes:', result.details);
    }
    
    // 3. Verificar logs do servidor
    console.log('\n3️⃣ Verificar os logs do servidor para mais detalhes sobre o webhook');
    
  } catch (error) {
    console.error('💥 ERRO GERAL:', error.message);
  }
  
  console.log('\n🏁 Teste concluído!');
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Verificar logs do servidor (terminal do proxy-server.js)');
  console.log('2. Confirmar se o webhook está processando os dados corretamente');
  console.log('3. Testar no frontend se a criação de cobrança funciona');
}

// Executar teste
testWebhookIntegration().catch(console.error);