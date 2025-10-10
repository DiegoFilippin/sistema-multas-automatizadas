// Teste para verificar resposta da API Asaas na criação de subconta
// Usando fetch nativo do Node.js 18+

async function testAsaasSubaccountCreation() {
  try {
    console.log('🧪 Testando criação de subconta no Asaas...');
    
    // Usar proxy local
    const response = await fetch('http://localhost:3001/api/asaas-proxy/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': 'TESTE' // Será substituído pelo proxy
      },
      body: JSON.stringify({
        name: 'Teste API Key Response',
        email: `teste-${Date.now()}@exemplo.com`,
        cpfCnpj: '11111111111',
        companyType: 'MEI',
        incomeValue: 5000
      })
    });

    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers da resposta:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('📊 Resposta bruta:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Resposta parseada:', data);
      console.log('🔑 API Key presente?', data.apiKey ? 'SIM' : 'NÃO');
      console.log('🏦 Wallet ID presente?', data.walletId ? 'SIM' : 'NÃO');
      
      if (data.apiKey) {
        console.log('🔑 API Key (primeiros 10 chars):', data.apiKey.substring(0, 10) + '...');
      }
    } else {
      console.error('❌ Erro na requisição:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testAsaasSubaccountCreation();