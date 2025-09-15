// Script para testar o webhook do Asaas e verificar se as transações estão sendo criadas

import fetch from 'node-fetch';

// Simular webhook do Asaas para pagamento confirmado
const testWebhook = async () => {
  const webhookData = {
    event: 'PAYMENT_CONFIRMED',
    payment: {
      id: 'pay_test_12345', // Usar o ID do pagamento que criamos
      customer: 'cus_test',
      value: 120.00,
      netValue: 120.00,
      description: 'Compra de 100 créditos',
      billingType: 'PIX',
      status: 'RECEIVED',
      confirmedDate: new Date().toISOString(),
      paymentDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      originalDueDate: new Date().toISOString(),
      invoiceUrl: 'https://example.com/invoice',
      deleted: false,
      anticipated: false,
      anticipable: false
    }
  };

  try {
    console.log('Enviando webhook de teste...');
    const response = await fetch('http://localhost:3001/api/webhooks/asaas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });

    const result = await response.json();
    console.log('Resposta do webhook:', result);
    
    if (response.ok) {
      console.log('✅ Webhook processado com sucesso!');
    } else {
      console.log('❌ Erro no webhook:', result);
    }
  } catch (error) {
    console.error('Erro ao enviar webhook:', error);
  }
};

// Testar API de transações
const testTransactionsAPI = async () => {
  try {
    console.log('\nTestando API de transações...');
    
    // Usar um ID de empresa que sabemos que existe (da query SQL anterior)
    // Vamos buscar diretamente do banco via uma query simples
    const companyId = await getFirstCompanyId();
    
    if (!companyId) {
      console.log('❌ Nenhuma empresa encontrada');
      return;
    }
    
    console.log(`🏢 Usando empresa ID: ${companyId}`);
    
    const response = await fetch(`http://localhost:3001/api/credits/transactions?ownerType=company&companyId=${companyId}&limit=10&offset=0`);
    
    const result = await response.json();
    console.log('Resposta da API de transações:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ API de transações funcionando!');
      console.log(`Encontradas ${result.data?.length || 0} transações`);
      
      if (result.data && result.data.length > 0) {
        console.log('\n📋 Transações encontradas:');
        result.data.forEach((transaction, index) => {
          console.log(`${index + 1}. ${transaction.transaction_type} - ${transaction.amount} créditos - ${transaction.description}`);
        });
      }
    } else {
      console.log('❌ Erro na API de transações:', result);
    }
  } catch (error) {
    console.error('Erro ao testar API de transações:', error);
  }
};

// Função para buscar o primeiro ID de empresa
const getFirstCompanyId = async () => {
  try {
    // Usar o company_id correto que descobrimos no teste anterior
    return '550e8400-e29b-41d4-a716-446655440001'; // ID correto com final 001
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    return null;
  }
};

// Executar testes
const runTests = async () => {
  console.log('🧪 Iniciando testes de webhook e transações\n');
  
  // Primeiro testar a API de transações
  await testTransactionsAPI();
  
  // Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Depois testar o webhook
  await testWebhook();
  
  // Aguardar processamento
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Testar novamente a API de transações para ver se foi criada
  console.log('\n🔍 Verificando se transação foi criada após webhook...');
  await testTransactionsAPI();
};

runTests().catch(console.error);