import fetch from 'node-fetch';

async function testApiDirect() {
  console.log('🧪 Testando API diretamente...');
  
  try {
    const paymentId = 'pay_hs8lhhu2kj18m80d';
    const url = `http://localhost:3001/api/payments/${paymentId}`;
    
    console.log('📡 Fazendo requisição para:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers da resposta:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('📄 Resposta bruta:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('\n📋 Resposta JSON:');
      console.log('- Success:', responseJson.success);
      console.log('- Has payment:', !!responseJson.payment);
      
      if (responseJson.payment) {
        console.log('\n🎯 Dados do pagamento:');
        console.log('- ID:', responseJson.payment.id);
        console.log('- Asaas Payment ID:', responseJson.payment.asaas_payment_id);
        console.log('- QR Code Image:', !!responseJson.payment.qr_code_image);
        console.log('- PIX Payload:', !!responseJson.payment.pix_payload);
        console.log('- PIX QR Code:', !!responseJson.payment.pix_qr_code);
        console.log('- PIX Copy Paste:', !!responseJson.payment.pix_copy_paste);
        console.log('- Invoice URL:', responseJson.payment.invoice_url);
        console.log('- Amount:', responseJson.payment.amount);
        console.log('- Status:', responseJson.payment.status);
        
        if (responseJson.payment.qr_code_image) {
          console.log('\n✅ QR Code encontrado!');
          console.log('Tamanho:', responseJson.payment.qr_code_image.length, 'caracteres');
          console.log('Início:', responseJson.payment.qr_code_image.substring(0, 50) + '...');
        } else {
          console.log('\n❌ QR Code não encontrado!');
        }
        
        if (responseJson.payment.pix_payload) {
          console.log('\n✅ PIX Payload encontrado!');
          console.log('Tamanho:', responseJson.payment.pix_payload.length, 'caracteres');
          console.log('Início:', responseJson.payment.pix_payload.substring(0, 50) + '...');
        } else {
          console.log('\n❌ PIX Payload não encontrado!');
        }
      } else {
        console.log('\n❌ Nenhum dado de pagamento retornado');
        if (responseJson.error) {
          console.log('Erro:', responseJson.error);
        }
      }
      
    } catch (parseError) {
      console.error('❌ Erro ao parsear JSON:', parseError);
      console.log('Resposta não é JSON válido');
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

testApiDirect();