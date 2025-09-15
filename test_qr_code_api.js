// Teste para verificar se a API está retornando QR code PIX
import fetch from 'node-fetch';

async function testQrCodeAPI() {
  try {
    console.log('🔍 Testando API de QR Code PIX...');
    
    // ID de um pagamento pendente (baseado nos logs)
    const paymentId = '8b757787-c1f0-4481-b19f-e6ab23da6268';
    
    const response = await fetch(`http://localhost:3001/api/payments/${paymentId}`);
    
    if (!response.ok) {
      console.error('❌ Erro na requisição:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ Resposta da API:');
    console.log('- Status:', data.payment?.status);
    console.log('- Asaas Status:', data.payment?.asaas_status);
    console.log('- Tem QR Code:', !!data.payment?.pix_qr_code);
    console.log('- Tem PIX Copy/Paste:', !!data.payment?.pix_copy_paste);
    
    if (data.payment?.pix_qr_code) {
      console.log('🎉 QR Code encontrado! Tamanho:', data.payment.pix_qr_code.length, 'caracteres');
    } else {
      console.log('⚠️ QR Code não encontrado na resposta');
    }
    
    if (data.payment?.pix_copy_paste) {
      console.log('📋 Código PIX encontrado! Tamanho:', data.payment.pix_copy_paste.length, 'caracteres');
    } else {
      console.log('⚠️ Código PIX não encontrado na resposta');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testQrCodeAPI();