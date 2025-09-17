import fetch from 'node-fetch';

// Teste da API create-service-order
async function testCreateCobranca() {
  console.log('🧪 === TESTE DA API CREATE-SERVICE-ORDER ===');
  
  // Dados de teste (substitua pelos IDs reais do seu sistema)
  const testData = {
    customer_id: '1', // ID de um cliente existente
    service_id: '1',  // ID de um serviço existente
    company_id: '1',  // ID da empresa
    valor_cobranca: 89.00 // Valor da cobrança
  };
  
  console.log('📋 Dados de teste:', testData);
  
  try {
    console.log('\n🚀 Enviando requisição para API local...');
    
    const response = await fetch('http://localhost:3001/api/payments/create-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Substitua por um token válido se necessário
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📡 Status da resposta:', response.status);
    console.log('📡 Status text:', response.statusText);
    
    const responseText = await response.text();
    console.log('\n📄 Resposta bruta:');
    console.log('=====================================');
    console.log(responseText);
    console.log('=====================================');
    
    if (!response.ok) {
      console.error('❌ ERRO HTTP:', response.status);
      return;
    }
    
    // Tentar parsear JSON
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('\n✅ JSON parseado com sucesso:');
      console.log(JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', parseError.message);
      return;
    }
    
    // Verificar se a cobrança foi criada com sucesso
    if (result.success && result.payment) {
      console.log('\n🎉 COBRANÇA CRIADA COM SUCESSO!');
      console.log('📋 Dados do pagamento:');
      console.log('  - ID:', result.payment.id);
      console.log('  - Asaas Payment ID:', result.payment.asaas_payment_id);
      console.log('  - Valor:', result.payment.amount);
      console.log('  - QR Code:', result.payment.qr_code ? 'PRESENTE (' + result.payment.qr_code.length + ' chars)' : 'AUSENTE');
      console.log('  - PIX Payload:', result.payment.pix_payload ? 'PRESENTE (' + result.payment.pix_payload.length + ' chars)' : 'AUSENTE');
      console.log('  - Invoice URL:', result.payment.invoice_url ? 'PRESENTE' : 'AUSENTE');
      
      // Agora vamos verificar se foi salvo no banco
      console.log('\n🔍 Verificando se foi salvo no banco...');
      await checkDatabase(result.payment.id);
      
    } else {
      console.error('❌ ERRO: Resposta não contém dados válidos');
      console.log('  - success:', result.success);
      console.log('  - payment:', result.payment);
    }
    
  } catch (error) {
    console.error('💥 ERRO GERAL:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Função para verificar se os dados foram salvos no banco
async function checkDatabase(paymentId) {
  try {
    console.log('🔍 Verificando dados no banco para payment ID:', paymentId);
    
    // Fazer uma consulta para verificar se o pagamento foi salvo
    const checkResponse = await fetch(`http://localhost:3001/api/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (checkResponse.ok) {
      const savedData = await checkResponse.json();
      console.log('✅ DADOS ENCONTRADOS NO BANCO:');
      console.log(JSON.stringify(savedData, null, 2));
    } else {
      console.log('⚠️ Dados não encontrados no banco ou erro na consulta');
      console.log('Status:', checkResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error.message);
  }
}

// Executar o teste
testCreateCobranca().catch(console.error);