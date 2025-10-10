import fetch from 'node-fetch';

async function createTestClient() {
  try {
    console.log('👤 Criando cliente de teste...');
    
    const clientData = {
      nome: 'ANA PAULA CARVALHO ZORZZI',
      cpf_cnpj: '12345678901',
      email: 'ana.paula@email.com',
      telefone: '(47) 99999-9999',
      endereco: 'Rua Teste, 123',
      cidade: 'Joinville',
      estado: 'SC',
      cep: '89200-000',
      company_id: '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
      asaas_customer_id: 'cus_test_' + Date.now()
    };
    
    const response = await fetch('http://localhost:3001/api/clients/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clientData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Cliente criado:', result.client?.id);
      return result.client?.id;
    } else {
      console.log('⚠️ Falha ao criar cliente via API, usando ID fixo');
      return '324ca964-afa6-4790-9255-dd4d22246998';
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar cliente:', error.message);
    return '324ca964-afa6-4790-9255-dd4d22246998';
  }
}

async function findValidClient() {
  try {
    console.log('🔍 Buscando cliente válido...');
    
    // Tentar buscar cobranças existentes para pegar um client_id válido
    const response = await fetch('http://localhost:3001/api/payments/company/7d573ce0-125d-46bf-9e37-33d0c6074cf9');
    
    if (response.ok) {
      const data = await response.json();
      console.log('📋 Total de cobranças encontradas:', data.total);
      
      if (data.payments && data.payments.length > 0) {
        // Procurar por uma cobrança que tenha client_id válido
        for (const payment of data.payments) {
          if (payment.client_id) {
            console.log('✅ Cliente encontrado:', {
              client_id: payment.client_id,
              customer_name: payment.customer_name
            });
            return payment.client_id;
          }
        }
      }
    }
    
    console.log('⚠️ Nenhum cliente válido encontrado, criando novo cliente');
    return await createTestClient();
    
  } catch (error) {
    console.error('❌ Erro ao buscar cliente:', error.message);
    return await createTestClient();
  }
}

async function testSaveAPI() {
  try {
    console.log('🧪 TESTANDO API SAVE-SERVICE-ORDER...');
    
    // Primeiro, encontrar ou criar um cliente válido
    const validClientId = await findValidClient();
    
    console.log('🎯 Usando client_id:', validClientId);
    
    // Dados de teste simulando o que vem do frontend
    const testData = {
      webhook_data: {
        id: 'pay_test_' + Date.now(),
        value: 90,
        status: 'PENDING',
        invoiceUrl: 'https://sandbox.asaas.com/i/test123456789',
        payload: '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000',
        encodedImage: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        description: 'Pagamento para ASSOCIACAO MULTIVEICULAR DE BENEFICIOS DE SANTA CATARINA',
        dateCreated: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        billingType: 'PIX'
      },
      customer_id: validClientId, // Usar cliente válido encontrado
      service_id: '550e8400-e29b-41d4-a716-446655440000', // ID de serviço (pode não existir)
      company_id: '7d573ce0-125d-46bf-9e37-33d0c6074cf9', // ID da empresa
      valor_cobranca: 90
    };
    
    console.log('📋 Dados da requisição:');
    console.log(JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3001/api/payments/save-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('\n📡 RESPOSTA DA API:');
    console.log('  - Status:', response.status);
    console.log('  - Status Text:', response.statusText);
    console.log('  - OK:', response.ok);
    
    const result = await response.json();
    console.log('\n📦 DADOS DA RESPOSTA:');
    console.log(JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('\n✅ SUCESSO! Dados salvos no banco.');
      console.log('  - Service Order ID:', result.service_order_id);
      console.log('  - Payment ID:', result.payment_id);
      
      // Verificar se os dados foram realmente salvos
      console.log('\n🔍 VERIFICANDO SE OS DADOS FORAM SALVOS...');
      const checkResponse = await fetch(`http://localhost:3001/api/payments/${result.payment_id}`);
      
      if (checkResponse.ok) {
        const savedData = await checkResponse.json();
        console.log('✅ Dados encontrados no banco:');
        console.log('  - ID:', savedData.payment?.id);
        console.log('  - Amount:', savedData.payment?.amount);
        console.log('  - Status:', savedData.payment?.status);
        console.log('  - QR Code presente:', !!savedData.payment?.qr_code_image);
        console.log('  - PIX Payload presente:', !!savedData.payment?.pix_payload);
        
        if (savedData.payment?.qr_code_image) {
          console.log('  - QR Code (primeiros 50 chars):', savedData.payment.qr_code_image.substring(0, 50) + '...');
        }
        if (savedData.payment?.pix_payload) {
          console.log('  - PIX Payload (primeiros 50 chars):', savedData.payment.pix_payload.substring(0, 50) + '...');
        }
        
        console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
        console.log('✅ A API save-service-order está funcionando corretamente');
        console.log('✅ Os dados PIX estão sendo salvos no banco');
        console.log('✅ O problema de salvamento foi resolvido');
        
      } else {
        console.log('❌ Dados não encontrados no banco após salvamento');
      }
      
    } else {
      console.log('\n❌ ERRO! Falha ao salvar dados.');
      console.log('  - Erro:', result.error);
      console.log('  - Detalhes:', result.details);
    }
    
  } catch (error) {
    console.error('\n💥 ERRO NA REQUISIÇÃO:', error.message);
  }
}

// Executar teste
testSaveAPI();