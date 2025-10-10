import fetch from 'node-fetch';

// Dados de teste simulando o que vem do webhook
const testWebhookData = {
  id: 'pay_test123456789',
  value: 90,
  status: 'PENDING',
  invoiceUrl: 'https://sandbox.asaas.com/i/test123456789',
  payload: '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000',
  encodedImage: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  description: 'Recurso de Multa - Teste',
  dueDate: '2024-12-31',
  dateCreated: '2024-12-23T10:00:00.000Z',
  billingType: 'PIX',
  split: [
    {
      walletId: 'wallet_icetran_123',
      fixedValue: 45
    },
    {
      walletId: 'wallet_despachante_456', 
      fixedValue: 45
    }
  ]
};

// Dados da requisição
const requestData = {
  webhook_data: testWebhookData,
  customer_id: '11d64113-575f-4618-8f81-a301ec3ec881', // ID de cliente existente
  service_id: '31a8b93e-d459-40f4-8a3f-74137c910675', // ID de serviço existente
  company_id: '8e6d04a6-251f-457e-a2c2-84fc3d861f5f', // ID de empresa existente
  valor_cobranca: 90
};

async function testSaveServiceOrder() {
  try {
    console.log('🧪 TESTANDO SALVAMENTO DE SERVICE ORDER...');
    console.log('📋 Dados da requisição:');
    console.log(JSON.stringify(requestData, null, 2));
    
    const response = await fetch('http://localhost:3001/api/payments/save-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    console.log('\n📡 RESPOSTA DA API:');
    console.log('  - Status:', response.status);
    console.log('  - Status Text:', response.statusText);
    console.log('  - Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('  - Body (raw):', responseText);
    
    if (response.ok) {
      try {
        const responseData = JSON.parse(responseText);
        console.log('\n✅ SUCESSO!');
        console.log('📋 Dados salvos:');
        console.log(JSON.stringify(responseData, null, 2));
      } catch (parseError) {
        console.log('\n✅ SUCESSO (resposta não é JSON):', responseText);
      }
    } else {
      console.log('\n❌ ERRO NA API:');
      console.log('  - Status:', response.status);
      console.log('  - Resposta:', responseText);
      
      try {
        const errorData = JSON.parse(responseText);
        console.log('  - Erro estruturado:', JSON.stringify(errorData, null, 2));
      } catch (parseError) {
        console.log('  - Erro não é JSON válido');
      }
    }
    
  } catch (error) {
    console.error('\n💥 ERRO DE CONEXÃO:', error);
    console.log('  - Verifique se o proxy-server está rodando na porta 3001');
    console.log('  - Comando: node proxy-server.js');
  }
}

// Executar teste
testSaveServiceOrder();