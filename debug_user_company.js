// Debug do company_id do usuário atual

async function debugUserCompany() {
  console.log('🔍 Debugando company_id do usuário atual...');
  
  try {
    // Simular login para obter dados do usuário
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'diego@icetran.com.br', // Email do usuário de teste
        password: '123456' // Senha padrão
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Erro no login, tentando com outros emails...');
      
      // Tentar com outros emails possíveis
      const testEmails = [
        'admin@icetran.com.br',
        'diego.filippin@icetran.com.br',
        'test@test.com'
      ];
      
      for (const email of testEmails) {
        console.log(`🔄 Tentando login com: ${email}`);
        const testResponse = await fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email,
            password: '123456'
          })
        });
        
        if (testResponse.ok) {
          const userData = await testResponse.json();
          console.log(`✅ Login bem-sucedido com ${email}:`);
          console.log('📋 Dados do usuário:', JSON.stringify(userData, null, 2));
          
          if (userData.user && userData.user.company_id) {
            console.log(`\n🏢 Company ID encontrado: ${userData.user.company_id}`);
            
            // Testar API de transações com este company_id
            await testTransactionsForUser(userData.user.company_id);
          }
          return;
        }
      }
      
      console.log('❌ Não foi possível fazer login com nenhum email');
      return;
    }
    
    const userData = await loginResponse.json();
    console.log('✅ Login bem-sucedido:');
    console.log('📋 Dados do usuário:', JSON.stringify(userData, null, 2));
    
    if (userData.user && userData.user.company_id) {
      console.log(`\n🏢 Company ID encontrado: ${userData.user.company_id}`);
      
      // Testar API de transações com este company_id
      await testTransactionsForUser(userData.user.company_id);
    } else {
      console.log('❌ Company ID não encontrado nos dados do usuário');
    }
    
  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
  }
}

async function testTransactionsForUser(companyId) {
  console.log(`\n🧪 Testando API de transações para company_id: ${companyId}`);
  
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
      console.log(`✅ Encontradas ${data.data.length} transações para este usuário`);
    } else {
      console.log(`❌ Nenhuma transação encontrada para este usuário`);
      console.log('💡 Isso explica por que o histórico está vazio!');
    }
    
  } catch (error) {
    console.error(`❌ Erro ao testar API:`, error.message);
  }
}

debugUserCompany();