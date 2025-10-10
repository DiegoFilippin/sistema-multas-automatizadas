import fetch from 'node-fetch';

// Dados de teste para criar uma cobrança (usando ACSM que tem wallet configurado)
const testPaymentData = {
  customer_id: '11d64113-575f-4618-8f81-a301ec3ec881', // ID de cliente existente
  service_id: '31a8b93e-d459-40f4-8a3f-74137c910675', // ID de serviço existente
  company_id: '8e6d04a6-251f-457e-a2c2-84fc3d861f5f', // ACSM - tem wallet configurado
  valor_cobranca: 80.00,
  descricaoservico: 'Recurso de Multa - Grave'
};

async function testWebhookCompleteData() {
  try {
    console.log('🧪 Testando criação de cobrança com dados completos do webhook...');
    console.log('📋 Dados da requisição:', testPaymentData);
    
    // Fazer requisição para criar cobrança
    const response = await fetch('http://localhost:3001/api/payments/create-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPaymentData)
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na requisição:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Resposta recebida:');
    console.log('🆔 ID da cobrança:', result.payment?.id);
    console.log('💰 Valor:', result.payment?.amount);
    console.log('🔗 QR Code disponível:', !!result.payment?.qr_code);
    console.log('📋 PIX Copia e Cola disponível:', !!result.payment?.pix_code);
    console.log('📄 Webhook Response disponível:', !!result.payment?.webhook_response);
    
    // Mostrar dados completos se disponíveis
    if (result.payment?.webhook_response) {
      console.log('\n📊 Dados do webhook salvos:');
      const webhookData = result.payment.webhook_response;
      
      if (Array.isArray(webhookData) && webhookData.length > 0) {
        const payment = webhookData[0];
        console.log('  🆔 ID Asaas:', payment.id);
        console.log('  📅 Data criação:', payment.dateCreated);
        console.log('  💳 Tipo cobrança:', payment.billingType);
        console.log('  📊 Status:', payment.status);
        console.log('  🔗 URL fatura:', payment.invoiceUrl);
        console.log('  📄 Número fatura:', payment.invoiceNumber);
        console.log('  🔑 Referência externa:', payment.externalReference);
        console.log('  🖼️ QR Code (base64):', payment.encodedImage ? 'Disponível' : 'Não disponível');
        console.log('  📋 PIX Payload:', payment.payload ? 'Disponível' : 'Não disponível');
        console.log('  📝 Descrição:', payment.description);
        
        if (payment.split && payment.split.length > 0) {
          console.log('  💰 Splits:');
          payment.split.forEach((split, index) => {
            console.log(`    ${index + 1}. ID: ${split.id}, Valor: R$ ${split.totalValue}, Status: ${split.status}`);
          });
        }
      }
    }
    
    console.log('\n🎉 Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
  }
}

testWebhookCompleteData();