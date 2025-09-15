// Configurações
const API_BASE = 'http://localhost:3001';

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

async function testDescricaoServico() {
  console.log('🧪 === TESTE DO CAMPO DESCRICAOSERVIÇO ===\n');
  
  // Inicializar fetch
  await initFetch();
  
  try {
    console.log('📤 Enviando requisição para criar cobrança...');
    
    const response = await fetch(`${API_BASE}/api/payments/create-service-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok && result.success) {
      console.log('\n✅ SUCESSO! Cobrança criada');
      console.log('- ID da cobrança:', result.payment.id);
      console.log('- Webhook ID:', result.payment.webhook_id);
      console.log('- Valor:', result.payment.amount);
      
      // Verificar se a resposta do webhook contém a descrição do serviço
      if (result.payment.webhook_response && result.payment.webhook_response.body) {
        const webhookBody = result.payment.webhook_response.body;
        console.log('\n📋 Dados enviados para o webhook:');
        console.log('- descricaoserviço:', webhookBody.descricaoserviço || 'CAMPO NÃO ENCONTRADO!');
        console.log('- Idserviço:', webhookBody.Idserviço);
        console.log('- Valor_cobrança:', webhookBody['Valor_cobrança']);
        
        if (webhookBody.descricaoserviço) {
          console.log('\n🎉 CAMPO "descricaoserviço" ADICIONADO COM SUCESSO!');
        } else {
          console.log('\n❌ CAMPO "descricaoserviço" NÃO ENCONTRADO NO WEBHOOK!');
        }
      } else {
        console.log('\n⚠️ Resposta do webhook não disponível para verificação');
      }
    } else {
      console.log('\n❌ ERRO na criação da cobrança');
      console.log('- Erro:', result.error);
      console.log('- Detalhes:', result.details);
    }
    
  } catch (error) {
    console.error('💥 ERRO GERAL:', error.message);
  }
  
  console.log('\n🏁 Teste concluído!');
}

// Executar teste
testDescricaoServico().catch(console.error);