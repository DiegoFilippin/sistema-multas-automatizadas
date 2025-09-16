// Teste para verificar se a criação de cobrança está funcionando
import fetch from 'node-fetch';

async function testCreateCobranca() {
  console.log('🧪 Testando criação de cobrança...');
  
  const testData = {
    customer_id: 'fbd0236a-0d1f-4faf-a610-11d3dd8c433d',
    service_id: '55be251f-9287-452c-b2db-f078791a777c',
    company_id: '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
    valor_cobranca: 58
  };
  
  console.log('📦 Dados de teste:', testData);
  
  try {
    const response = await fetch('http://localhost:3001/api/payments/create-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📡 Status da resposta:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('📄 Resposta bruta:', responseText);
    
    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('✅ Sucesso! Resultado:', result);
      } catch (e) {
        console.log('⚠️ Resposta não é JSON válido');
      }
    } else {
      console.log('❌ Erro na requisição');
      try {
        const error = JSON.parse(responseText);
        console.log('Erro detalhado:', error);
      } catch (e) {
        console.log('Erro não é JSON:', responseText);
      }
    }
    
  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
  }
}

testCreateCobranca();