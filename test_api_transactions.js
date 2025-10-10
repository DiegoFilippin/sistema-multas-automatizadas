// Teste da API /api/credits/transactions

async function testTransactionsAPI() {
  console.log('🧪 Testando API /api/credits/transactions...');
  
  // IDs das empresas encontradas no banco
  const companyIds = [
    'c1f4c95f-1f16-4680-b568-aefc43390564', // Diego da Silva Filippin
    '550e8400-e29b-41d4-a716-446655440001', // Empresa Demo
    '550e8400-e29b-41d4-a716-446655440000'  // Empresa de teste
  ];
  
  for (const companyId of companyIds) {
    console.log(`\n🔍 Testando para empresa: ${companyId}`);
    
    try {
      const params = new URLSearchParams({
        ownerType: 'company',
        companyId: companyId,
        limit: '10',
        offset: '0'
      });
      
      const url = `http://localhost:3001/api/credits/transactions?${params}`;
      console.log(`📡 URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📊 Status: ${response.status}`);
      
      const data = await response.json();
      console.log(`📋 Resposta:`, JSON.stringify(data, null, 2));
      
      if (data.success && data.data && data.data.length > 0) {
        console.log(`✅ Encontradas ${data.data.length} transações para esta empresa`);
        data.data.forEach((transaction, index) => {
          console.log(`  ${index + 1}. ${transaction.transaction_type} - ${transaction.amount} - ${transaction.description}`);
        });
      } else {
        console.log(`❌ Nenhuma transação encontrada para esta empresa`);
      }
      
    } catch (error) {
      console.error(`❌ Erro ao testar API para empresa ${companyId}:`, error.message);
    }
  }
  
  // Teste com parâmetros inválidos
  console.log('\n🧪 Testando com parâmetros inválidos...');
  try {
    const response = await fetch('http://localhost:3001/api/credits/transactions?ownerType=invalid', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`📊 Status para parâmetros inválidos: ${response.status}`);
    console.log(`📋 Resposta:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`❌ Erro no teste de parâmetros inválidos:`, error.message);
  }
}

testTransactionsAPI();