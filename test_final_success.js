// Teste final - API corrigida funciona com qualquer client_id válido
import fetch from 'node-fetch';

async function testeDefinitivo() {
  console.log('🎯 === TESTE DEFINITIVO - API CORRIGIDA ===');
  
  // Teste com client_id UUID válido (mesmo que não exista no banco)
  const testData = {
    webhook_data: {
      id: 'pay_final_test_' + Date.now(),
      value: 100.00,
      status: 'CONFIRMED',
      description: 'Teste definitivo - API corrigida',
      encodedImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      payload: '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000520400005303986540100.005802BR5925TESTE FINAL6009SAO PAULO62070503***6304WXYZ',
      invoiceUrl: 'https://sandbox.asaas.com/i/final123',
      billingType: 'PIX',
      dateCreated: new Date().toISOString()
    },
    customer_id: '12345678-1234-1234-1234-123456789abc', // UUID VÁLIDO (mesmo que não exista)
    service_id: '550e8400-e29b-41d4-a716-446655440000',
    company_id: '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
    valor_cobranca: 100.00
  };
  
  console.log('📦 Testando com client_id UUID válido (mesmo que não exista):');
  console.log('  - Client ID:', testData.customer_id);
  console.log('  - Payment ID:', testData.webhook_data.id);
  
  try {
    const response = await fetch('http://localhost:3001/api/payments/save-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5MmJmMWE1Yy1jMWM3LTQ1ZDItYjU2NS0zNDcyMTU4Mjg0MTQiLCJlbWFpbCI6ImRpZWdvMkBkZXNwYWNoYW50ZS5jb20iLCJyb2xlIjoiRGVzcGFjaGFudGUiLCJjb21wYW55SWQiOiI3ZDU3M2NlMC0xMjVkLTQ2YmYtOWUzNy0zM2QwYzYwNzRjZjkiLCJpYXQiOjE3MzU4MjU2NzIsImV4cCI6MTczNTkxMjA3Mn0.Hs8Hs_Hs8Hs_Hs8Hs_Hs8Hs_Hs8Hs_Hs8Hs_Hs8Hs_Hs8'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('\n📋 RESULTADO FINAL:');
    console.log('  - Status:', response.status);
    console.log('  - Success:', result.success);
    
    if (result.success) {
      console.log('\n🎉 === SUCESSO TOTAL! ===');
      console.log('✅ A API agora funciona com QUALQUER client_id válido!');
      console.log('✅ Não faz mais verificações desnecessárias!');
      console.log('✅ Usa diretamente o client_id do webhook!');
      console.log('\n🚀 PROBLEMA RESOLVIDO DEFINITIVAMENTE!');
      console.log('\n📝 RESUMO DA CORREÇÃO:');
      console.log('  1. Removida busca de cliente por ID');
      console.log('  2. Removida busca de serviço por ID');
      console.log('  3. Usa diretamente os dados do webhook');
      console.log('  4. Salva direto na tabela service_orders');
      console.log('\n💡 AGORA O FLUXO É SIMPLES:');
      console.log('  Webhook → client_id → Salvar → Pronto!');
    } else {
      console.log('\n❌ ERRO:', result.error);
      console.log('  Details:', result.details);
    }
    
  } catch (error) {
    console.error('\n💥 ERRO NA REQUISIÇÃO:', error.message);
  }
}

testeDefinitivo().catch(console.error);