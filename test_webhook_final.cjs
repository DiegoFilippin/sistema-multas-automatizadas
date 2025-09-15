// Importação dinâmica do node-fetch para compatibilidade
let fetch;

async function initFetch() {
  if (!fetch) {
    const nodeFetch = await import('node-fetch');
    fetch = nodeFetch.default;
  }
  return fetch;
}

// Teste final do webhook após criação de cobrança
async function testWebhookIntegration() {
  console.log('🔗 === TESTE FINAL DE INTEGRAÇÃO WEBHOOK ===');
  
  // Inicializar fetch
  await initFetch();
  
  const WEBHOOK_URL = 'https://webhookn8n.synsoft.com.br/webhook/d37fac6e-9379-4bca-b015-9c56b104cae1';
  
  // 1. Testar conectividade básica
  console.log('\n1. 🌐 Testando conectividade com webhook...');
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'GET'
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`   Resposta: ${responseText}`);
  } catch (error) {
    console.log(`   ❌ Erro de conectividade: ${error.message}`);
  }
  
  // 2. Testar envio de webhook com dados reais
  console.log('\n2. 📤 Testando envio de webhook com dados de teste...');
  
  const webhookData = {
    wallet_icetran: 'eb35cde4-d0f2-44d1-83c0-aaa3496f7ed0',
    wallet_despachante: 'da8284f1-8c7b-4d86-8abc-e4c52257a332',
    Customer_cliente: {
      id: '8fdb2182-d7a4-4cdb-9c76-323c1d0c9376',
      nome: 'DIEGO DA SILVA FILIPPIN',
      cpf: '00230049968',
      email: 'diegofilippin@hotmail.com',
      telefone: '47981424151'
    },
    Valor_cobrança: 50.00,
    Idserviço: '3f1ae29d-05de-4f3a-ab5b-aad93d449cf1'
  };
  
  console.log('   📋 Dados a enviar:');
  console.log(JSON.stringify(webhookData, null, 4));
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });
    
    console.log(`\n   📥 Resposta do webhook:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    console.log(`   OK: ${response.ok}`);
    
    const responseText = await response.text();
    console.log(`   Corpo da resposta: ${responseText}`);
    
    if (response.ok) {
      console.log('\n   ✅ WEBHOOK ENVIADO COM SUCESSO!');
    } else {
      console.log('\n   ⚠️ Webhook retornou erro, mas pode estar funcionando');
    }
    
  } catch (error) {
    console.log(`\n   ❌ Erro ao enviar webhook: ${error.message}`);
  }
  
  // 3. Testar busca de wallet da empresa
  console.log('\n3. 🏢 Testando busca de wallet da empresa...');
  
  const COMPANY_ID = 'c1f4c95f-1f16-4680-b568-aefc43390564';
  
  try {
    const response = await fetch(`http://localhost:3001/api/companies/${COMPANY_ID}/wallet`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Dados:`, JSON.stringify(data, null, 4));
    
    if (response.ok && data.success) {
      console.log(`\n   ✅ Wallet encontrado: ${data.wallet_id}`);
    } else {
      console.log(`\n   ❌ Erro ao buscar wallet: ${data.error}`);
    }
    
  } catch (error) {
    console.log(`\n   ❌ Erro na requisição: ${error.message}`);
  }
  
  // 4. Criar uma cobrança real e verificar se webhook é enviado
  console.log('\n4. 💳 Criando cobrança real para testar webhook...');
  
  const chargeData = {
    customer_id: '8fdb2182-d7a4-4cdb-9c76-323c1d0c9376',
    service_id: '3f1ae29d-05de-4f3a-ab5b-aad93d449cf1',
    company_id: 'c1f4c95f-1f16-4680-b568-aefc43390564',
    valor_cobranca: 50
  };
  
  try {
    console.log('   📤 Criando cobrança...');
    const response = await fetch('http://localhost:3001/api/payments/create-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chargeData)
    });
    
    const result = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Resultado:`, JSON.stringify(result, null, 4));
    
    if (response.ok && result.success) {
      console.log('\n   ✅ Cobrança criada com sucesso!');
      console.log('   ⚠️ IMPORTANTE: Verifique se o webhook foi enviado nos logs do frontend!');
      console.log('   💡 O webhook é enviado pelo frontend após receber a resposta de sucesso.');
    } else {
      console.log(`\n   ❌ Erro ao criar cobrança: ${result.error}`);
    }
    
  } catch (error) {
    console.log(`\n   ❌ Erro na criação da cobrança: ${error.message}`);
  }
  
  console.log('\n🏁 === FIM DO TESTE DE INTEGRAÇÃO ===');
  console.log('\n📋 RESUMO:');
  console.log('   1. Webhook URL testada');
  console.log('   2. Envio de dados testado');
  console.log('   3. API de wallet testada');
  console.log('   4. Criação de cobrança testada');
  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('   - Acesse http://localhost:5173 e crie uma cobrança');
  console.log('   - Verifique o console do navegador para logs do webhook');
  console.log('   - Confirme se o webhook está sendo enviado após o sucesso');
}

testWebhookIntegration().catch(console.error);