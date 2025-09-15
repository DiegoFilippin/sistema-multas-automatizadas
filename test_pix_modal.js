// Teste para simular dados PIX e verificar se o modal funcionaria
import QRCode from 'qrcode';

// Simular dados que chegam do backend
const mockPaymentData = {
  payment: {
    id: 'test-123',
    pix_qr_code: null, // Simular que não tem QR Code da API
    qr_code_image: null,
    pix_payload: '00020126580014br.gov.bcb.pix013636c4c14e-1c3a-4d4c-9d4e-7f8a9b0c1d2e3f4g5204000053039865802BR5925TESTE PAGAMENTO PIX6009SAO PAULO62070503***6304',
    pix_copy_paste: '00020126580014br.gov.bcb.pix013636c4c14e-1c3a-4d4c-9d4e-7f8a9b0c1d2e3f4g5204000053039865802BR5925TESTE PAGAMENTO PIX6009SAO PAULO62070503***6304',
    amount: 100.00,
    status: 'pending',
    payment_method: 'PIX'
  }
};

const mockCobranca = {
  id: 'cobranca-123',
  asaas_payment_id: 'asaas-456',
  client_name: 'João Silva',
  amount: 100.00,
  status: 'pending',
  payment_method: 'PIX',
  pix_qr_code: null,
  pix_code: null
};

async function testPixModal() {
  try {
    console.log('🔍 === TESTE DO MODAL PIX ===');
    console.log('Dados simulados do backend:', mockPaymentData);
    console.log('Dados da cobrança:', mockCobranca);
    
    // Simular a lógica do componente
    const paymentData = mockPaymentData.payment;
    const qrCodeFromApi = paymentData.pix_qr_code || paymentData.qr_code_image;
    const qrCodeFromCobranca = mockCobranca.pix_qr_code;
    const pixPayload = paymentData.pix_payload || paymentData.pix_copy_paste || mockCobranca.pix_code;
    
    console.log('\n🔍 === ANÁLISE DOS DADOS ===');
    console.log('QR Code da API (pix_qr_code):', paymentData.pix_qr_code);
    console.log('QR Code da API (qr_code_image):', paymentData.qr_code_image);
    console.log('QR Code da Cobrança:', qrCodeFromCobranca);
    console.log('PIX Payload:', pixPayload ? pixPayload.substring(0, 50) + '...' : null);
    
    const finalQrCode = qrCodeFromApi || qrCodeFromCobranca;
    
    if (finalQrCode) {
      console.log('\n✅ QR Code base64 encontrado!');
    } else if (pixPayload && pixPayload !== 'pix_copy_paste_test' && !pixPayload.includes('test')) {
      console.log('\n🔄 Gerando QR Code a partir do payload PIX...');
      
      const generatedQrCode = await QRCode.toDataURL(pixPayload, {
        type: 'image/png',
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      const base64Data = generatedQrCode.replace(/^data:image\/png;base64,/, '');
      
      console.log('✅ QR Code gerado com sucesso!');
      console.log('- Tamanho do base64:', base64Data.length);
      console.log('- Prefixo:', base64Data.substring(0, 50));
      
      // Simular o que seria salvo no estado
      const qrCodeData = {
        qr_code: base64Data,
        payload: pixPayload
      };
      
      console.log('\n✅ Estado do QR Code que seria definido:');
      console.log('- Tem qr_code:', !!qrCodeData.qr_code);
      console.log('- Tem payload:', !!qrCodeData.payload);
      
    } else {
      console.log('\n❌ QR Code não encontrado e payload não disponível');
      console.log('Campos verificados:', {
        pix_qr_code: !!paymentData.pix_qr_code,
        qr_code_image: !!paymentData.qr_code_image,
        cobranca_pix_qr_code: !!qrCodeFromCobranca,
        pixPayload: !!pixPayload,
        pixPayloadValue: pixPayload
      });
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testPixModal();