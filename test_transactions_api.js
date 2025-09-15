import fetch from 'node-fetch';

async function testTransactionsAPI() {
  try {
    console.log('🧪 Testando API de transações...');
    
    const companyId = 'c1f4c95f-1f16-4680-b568-aefc43390564';
    const url = `http://localhost:3001/api/credits/transactions?ownerType=company&companyId=${companyId}&limit=10&offset=0`;
    
    console.log('📡 URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📊 Status:', response.status);
    console.log('📋 Resposta:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log(`✅ Transações encontradas: ${data.data.length}`);
      data.data.forEach((transaction, index) => {
        console.log(`  ${index + 1}. ${transaction.transaction_type} - ${transaction.amount} - ${transaction.description}`);
      });
    } else {
      console.log('❌ Nenhuma transação encontrada ou erro na API');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
  }
}

testTransactionsAPI();