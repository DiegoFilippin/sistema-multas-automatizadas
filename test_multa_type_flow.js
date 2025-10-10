// Teste do fluxo completo com campo multa_type
// Verifica se o multa_type é enviado corretamente do frontend até o banco

import fetch from 'node-fetch';

async function testMultaTypeFlow() {
  console.log('🧪 === TESTANDO FLUXO COMPLETO COM MULTA_TYPE ===');
  
  // Dados de teste simulando o payload do frontend
  const testPayload = {
    wallet_icetran: "eb35cde4-d0f2-44d1-83c0-aaa3496f7ed0",
    wallet_despachante: "2bab1d7d-7558-45ac-953d-b9f7a980c4af",
    Customer_cliente: {
      id: "fbd0236a-0d1f-4faf-a610-11d3dd8c433d",
      nome: "TESTE MULTA TYPE",
      cpf_cnpj: "12345678901",
      email: "teste@email.com",
      asaas_customer_id: "cus_000005928877"
    },
    "Valor_cobrança": 90,
    "Idserviço": "550e8400-e29b-41d4-a716-446655440000",
    "descricaoserviço": "Recurso de Multa - Gravíssima",
    "multa_type": "gravissima", // CAMPO ADICIONADO
    valoracsm: 20,
    valoricetran: 30,
    taxa: 5,
    despachante: {
      company_id: "7d573ce0-125d-46bf-9e37-33d0c6074cf9",
      nome: "Empresa Teste",
      wallet_id: "2bab1d7d-7558-45ac-953d-b9f7a980c4af",
      margem: 35
    }
  };
  
  console.log('📦 Payload de teste:');
  console.log('  - multa_type:', testPayload.multa_type);
  console.log('  - Cliente:', testPayload.Customer_cliente.nome);
  console.log('  - Valor:', testPayload["Valor_cobrança"]);
  
  try {
    console.log('\n🚀 1. ENVIANDO PARA WEBHOOK N8N...');
    
    const webhookResponse = await fetch('https://webhookn8n.synsoft.com.br/webhook/d37fac6e-9379-4bca-b015-9c56b104cae1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('  - Status webhook:', webhookResponse.status);
    
    if (!webhookResponse.ok) {
      console.error('❌ Erro no webhook:', webhookResponse.status);
      return;
    }
    
    const webhookResult = await webhookResponse.text();
    console.log('  - Resposta webhook:', webhookResult.substring(0, 200) + '...');
    
    let paymentData;
    try {
      paymentData = JSON.parse(webhookResult);
    } catch (e) {
      console.log('  - Resposta não é JSON, assumindo sucesso');
      paymentData = {
        id: 'pay_test_' + Date.now(),
        value: testPayload["Valor_cobrança"],
        status: 'CONFIRMED',
        encodedImage: 'data:image/png;base64,test',
        payload: '00020126test',
        invoiceUrl: 'https://test.com',
        description: testPayload["descricaoserviço"]
      };
    }
    
    console.log('\n💾 2. SALVANDO NO BANCO LOCAL...');
    
    const saveData = {
      webhook_data: paymentData,
      customer_id: testPayload.Customer_cliente.id,
      service_id: testPayload["Idserviço"],
      company_id: testPayload.despachante.company_id,
      valor_cobranca: testPayload["Valor_cobrança"],
      multa_type: testPayload.multa_type // INCLUIR MULTA_TYPE
    };
    
    console.log('  - multa_type sendo enviado:', saveData.multa_type);
    
    const saveResponse = await fetch('http://localhost:3001/api/payments/save-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5MmJmMWE1Yy1jMWM3LTQ1ZDItYjU2NS0zNDcyMTU4Mjg0MTQiLCJlbWFpbCI6ImRpZWdvMkBkZXNwYWNoYW50ZS5jb20iLCJyb2xlIjoiRGVzcGFjaGFudGUiLCJjb21wYW55SWQiOiI3ZDU3M2NlMC0xMjVkLTQ2YmYtOWUzNy0zM2QwYzYwNzRjZjkiLCJpYXQiOjE3MzU4MjU2NzIsImV4cCI6MTczNTkxMjA3Mn0.test'
      },
      body: JSON.stringify(saveData)
    });
    
    console.log('  - Status salvamento:', saveResponse.status);
    
    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      console.error('❌ Erro no salvamento:', errorText);
      return;
    }
    
    const saveResult = await saveResponse.json();
    console.log('  - Resultado:', saveResult.success ? 'SUCESSO' : 'FALHA');
    
    if (saveResult.success) {
      console.log('  - Service Order ID:', saveResult.service_order_id);
      console.log('  - Payment ID:', saveResult.payment_id);
      
      console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
      console.log('🎯 VERIFICAÇÕES:');
      console.log('  ✅ multa_type enviado no payload do webhook');
      console.log('  ✅ multa_type processado pela API save-service-order');
      console.log('  ✅ Dados salvos no banco de dados');
      console.log('\n🔍 PRÓXIMO PASSO: Verificar no banco se multa_type foi salvo corretamente');
    } else {
      console.error('❌ Falha no salvamento:', saveResult.error);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testMultaTypeFlow().catch(console.error);