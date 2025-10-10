// Teste para criar um pagamento PIX e verificar QR code
import fetch from 'node-fetch';

async function testCreatePixPayment() {
  try {
    console.log('🔍 Testando criação de pagamento PIX...');
    
    // Dados para criar um pagamento de teste
    const paymentData = {
      packageId: '1', // ID de um pacote de créditos
      customerId: '1', // ID do cliente/empresa
      companyId: '1' // ID da empresa
    };
    
    console.log('📤 Enviando requisição para criar pagamento...');
    
    const response = await fetch('http://localhost:3001/api/credits/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });
    
    if (!response.ok) {
      console.error('❌ Erro na requisição:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Detalhes do erro:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ Pagamento criado com sucesso!');
    console.log('- Payment ID:', data.paymentId);
    console.log('- Asaas Payment ID:', data.asaasPaymentId);
    console.log('- Tem QR Code:', !!data.pixQrCode);
    
    if (data.pixQrCode) {
      console.log('🎉 QR Code gerado! Tamanho:', data.pixQrCode.length, 'caracteres');
      
      // Agora testar buscar os detalhes deste pagamento
      console.log('\n🔍 Buscando detalhes do pagamento recém-criado...');
      
      const detailsResponse = await fetch(`http://localhost:3001/api/payments/${data.paymentId}`);
      
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        console.log('✅ Detalhes obtidos:');
        console.log('- Status:', detailsData.payment?.status);
        console.log('- Asaas Status:', detailsData.payment?.asaas_status);
        console.log('- Tem QR Code nos detalhes:', !!detailsData.payment?.pix_qr_code);
        console.log('- Tem PIX Copy/Paste nos detalhes:', !!detailsData.payment?.pix_copy_paste);
      } else {
        console.error('❌ Erro ao buscar detalhes:', detailsResponse.status);
      }
    } else {
      console.log('⚠️ QR Code não foi gerado na criação');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testCreatePixPayment();