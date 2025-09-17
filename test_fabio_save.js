// Teste específico para verificar salvamento da cobrança do FÁBIO RIGOLI DA ROSA
import fetch from 'node-fetch';

async function testFabioSave() {
  console.log('🧪 === TESTE: SALVAMENTO COBRANÇA FÁBIO RIGOLI DA ROSA ===');
  
  // Dados simulados da cobrança do FÁBIO (baseados no modal)
  const webhookData = {
    id: 'pay_fabio_test_' + Date.now(),
    value: 90.00,
    status: 'PENDING',
    description: 'Pagamento para ASSOCIACAO MULTIVEICULAR DE BENEFICIOS DE SANTA CATARINA (30.903.115/0001-67) referente a Recurso de Multa - Media',
    encodedImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    payload: '00020101021226580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000520400005303986540590.005802BR5925FABIO RIGOLI DA ROSA6009SAO PAULO62070503***6304WXYZ',
    invoiceUrl: 'https://sandbox.asaas.com/i/fabio123',
    billingType: 'PIX',
    dateCreated: new Date().toISOString(),
    dueDate: '18/09/2025'
  };
  
  // Buscar um client_id válido do FÁBIO no banco
  console.log('\n🔍 BUSCANDO CLIENT_ID DO FÁBIO...');
  try {
    const searchResponse = await fetch('http://localhost:3001/api/clients/search?nome=FABIO', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTJiZjFhNWMtYzFjNy00NWQyLWI1NjUtMzQ3MjE1ODI4NDE0IiwiZW1haWwiOiJkaWVnbzJAZGVzcGFjaGFudGUuY29tIiwiaWF0IjoxNzU4MTI0MjIyfQ.test'
      }
    });
    
    if (searchResponse.ok) {
      const clients = await searchResponse.json();
      console.log('✅ Clientes encontrados:', clients.length);
      
      if (clients.length > 0) {
        const fabioClient = clients.find(c => c.nome.includes('FABIO') || c.nome.includes('FÁBIO'));
        if (fabioClient) {
          console.log('✅ Cliente FÁBIO encontrado:', fabioClient.id);
          
          // Testar salvamento com client_id real
          await testSaveWithRealClientId(webhookData, fabioClient.id);
        } else {
          console.log('⚠️ Cliente FÁBIO não encontrado, usando UUID de teste');
          await testSaveWithTestClientId(webhookData);
        }
      } else {
        console.log('⚠️ Nenhum cliente encontrado, usando UUID de teste');
        await testSaveWithTestClientId(webhookData);
      }
    } else {
      console.log('❌ Erro ao buscar clientes, usando UUID de teste');
      await testSaveWithTestClientId(webhookData);
    }
  } catch (error) {
    console.error('❌ Erro na busca:', error.message);
    await testSaveWithTestClientId(webhookData);
  }
}

async function testSaveWithRealClientId(webhookData, clientId) {
  console.log('\n💾 TESTANDO SALVAMENTO COM CLIENT_ID REAL:', clientId);
  
  const saveData = {
    webhook_data: webhookData,
    customer_id: clientId,
    service_id: '550e8400-e29b-41d4-a716-446655440000', // UUID válido de teste
    company_id: '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
    valor_cobranca: 90.00
  };
  
  try {
    const response = await fetch('http://localhost:3001/api/payments/save-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTJiZjFhNWMtYzFjNy00NWQyLWI1NjUtMzQ3MjE1ODI4NDE0IiwiZW1haWwiOiJkaWVnbzJAZGVzcGFjaGFudGUuY29tIiwiaWF0IjoxNzU4MTI0MjIyfQ.test'
      },
      body: JSON.stringify(saveData)
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SALVAMENTO BEM-SUCEDIDO!');
      console.log('  - Service Order ID:', result.service_order?.id);
      console.log('  - Asaas Payment ID:', result.service_order?.asaas_payment_id);
      console.log('  - Cliente:', result.service_order?.customer_name);
      console.log('  - Valor:', result.service_order?.amount);
    } else {
      const error = await response.text();
      console.error('❌ ERRO NO SALVAMENTO:', error);
    }
  } catch (error) {
    console.error('❌ ERRO NA REQUISIÇÃO:', error.message);
  }
}

async function testSaveWithTestClientId(webhookData) {
  console.log('\n💾 TESTANDO SALVAMENTO COM CLIENT_ID DE TESTE');
  
  // Criar um UUID válido para teste
  const testClientId = '12345678-1234-1234-1234-123456789abc';
  
  const saveData = {
    webhook_data: webhookData,
    customer_id: testClientId,
    service_id: '550e8400-e29b-41d4-a716-446655440000',
    company_id: '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
    valor_cobranca: 90.00
  };
  
  try {
    const response = await fetch('http://localhost:3001/api/payments/save-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOTJiZjFhNWMtYzFjNy00NWQyLWI1NjUtMzQ3MjE1ODI4NDE0IiwiZW1haWwiOiJkaWVnbzJAZGVzcGFjaGFudGUuY29tIiwiaWF0IjoxNzU4MTI0MjIyfQ.test'
      },
      body: JSON.stringify(saveData)
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SALVAMENTO BEM-SUCEDIDO!');
      console.log('  - Service Order ID:', result.service_order?.id);
      console.log('  - Asaas Payment ID:', result.service_order?.asaas_payment_id);
    } else {
      const error = await response.text();
      console.error('❌ ERRO NO SALVAMENTO:', error);
    }
  } catch (error) {
    console.error('❌ ERRO NA REQUISIÇÃO:', error.message);
  }
}

// Executar teste
testFabioSave().catch(console.error);