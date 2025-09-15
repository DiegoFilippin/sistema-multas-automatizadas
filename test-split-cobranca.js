import fetch from 'node-fetch';

async function testCobrancaSemSplit() {
  try {
    console.log('🧪 Testando criação de cobrança sem split...');
    
    // Dados de teste para criação de cobrança
    const testPayload = {
      service_type: 'recurso_multa',
      multa_type: 'leve',
      multa_type_name: 'Leve',
      amount: 60.00,
      suggested_price: 60.00,
      cost_price: 19.50,
      client_id: '270e0100-b920-49d4-aa13-f545fa99ecef', // ID da ICETRAN como teste
      client_name: 'Cliente Teste',
      client_email: 'teste@cliente.com',
      company_id: '270e0100-b920-49d4-aa13-f545fa99ecef', // ID da ICETRAN como teste
      timestamp: new Date().toISOString(),
      user_agent: 'Test Script'
    };
    
    console.log('📦 Payload de teste:');
    console.log(JSON.stringify(testPayload, null, 2));
    
    // Fazer requisição para criar cobrança
    const response = await fetch('http://localhost:3001/api/service-orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('\n📡 Resposta do servidor:');
    console.log('  - Status:', response.status);
    console.log('  - Status Text:', response.statusText);
    console.log('  - OK:', response.ok);
    
    const responseText = await response.text();
    console.log('\n📄 Conteúdo da resposta:');
    console.log('=====================================');
    console.log(responseText);
    console.log('=====================================');
    
    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('\n✅ COBRANÇA CRIADA COM SUCESSO!');
        console.log('  - Service Order ID:', result.service_order_id);
        console.log('  - Payment ID:', result.payment_id);
        console.log('  - Payment URL:', result.payment_url);
        console.log('  - Valor:', result.amount);
        console.log('  - QR Code disponível:', !!result.qr_code);
      } catch (parseError) {
        console.error('❌ Erro ao parsear resposta JSON:', parseError);
      }
    } else {
      console.error('❌ Erro na requisição:', response.status, response.statusText);
      console.error('   Resposta:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

// Aguardar um pouco para o servidor inicializar
setTimeout(() => {
  testCobrancaSemSplit();
}, 3000);