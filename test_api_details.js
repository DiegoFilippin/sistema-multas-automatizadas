// Teste para verificar se a API de detalhes está funcionando
import fetch from 'node-fetch';

async function testAPIDetails() {
  try {
    console.log('🔍 === TESTE DA API DE DETALHES ===');
    
    // Testar com um ID do Asaas que vimos nos logs
    const asaasPaymentId = 'pay_4c9chjp85zrpjjjr';
    
    console.log(`\n🔍 Testando com ID do Asaas: ${asaasPaymentId}`);
    
    const response = await fetch(`http://localhost:3001/api/payments/${asaasPaymentId}`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Status da resposta:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dados recebidos:');
      console.log('- Payment ID:', data.payment?.id);
      console.log('- Source:', data.payment?.source);
      console.log('- Tem QR Code:', !!data.payment?.pix_qr_code);
      console.log('- Tem QR Code Image:', !!data.payment?.qr_code_image);
      console.log('- Tem PIX Payload:', !!data.payment?.pix_payload);
      console.log('- Tem PIX Copy Paste:', !!data.payment?.pix_copy_paste);
      
      if (data.payment?.notes_data) {
        console.log('- Tem dados do webhook:', !!data.payment.notes_data.webhook_data);
        console.log('- Tem dados processados:', !!data.payment.notes_data.processed_data);
      }
    } else {
      const errorData = await response.json();
      console.log('❌ Erro na API:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testAPIDetails();