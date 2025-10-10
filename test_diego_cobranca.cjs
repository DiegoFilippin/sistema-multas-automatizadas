const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDiegoCobranca() {
  try {
    console.log('🧪 === TESTE DE COBRANÇA PARA DIEGO ===');
    
    const testData = {
      customer_id: '8fdb2182-d7a4-4cdb-9c76-323c1d0c9376', // ID do cliente Diego
      service_id: '3f1ae29d-05de-4f3a-ab5b-aad93d449cf1', // ID do serviço de multa leve
      company_id: 'c1f4c95f-1f16-4680-b568-aefc43390564', // ID da empresa Diego
      valor_cobranca: 50.00 // Valor de teste
    };
    
    console.log('📤 Enviando dados:', testData);
    
    const response = await fetch('http://localhost:3001/api/payments/create-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('📥 Status:', response.status);
    console.log('📥 Resposta:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ SUCESSO! Cobrança criada com sucesso!');
      console.log('💰 Valor:', result.payment?.amount);
      console.log('🏦 Wallet usado:', result.payment?.splits?.despachante || 'N/A');
    } else {
      console.log('❌ ERRO! Falha na criação da cobrança');
      console.log('🔍 Detalhes do erro:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
  }
}

testDiegoCobranca();