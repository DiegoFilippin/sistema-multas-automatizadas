// Teste para verificar se a biblioteca qrcode está funcionando
import QRCode from 'qrcode';

async function testQRGeneration() {
  try {
    console.log('🔍 Testando geração de QR Code...');
    
    // Teste com dados PIX simples
    const pixCode = '00020126580014br.gov.bcb.pix013636c4c14e-1c3a-4d4c-9d4e-7f8a9b0c1d2e3f4g5204000053039865802BR5925TESTE PAGAMENTO PIX6009SAO PAULO62070503***6304';
    
    // Gerar QR Code como base64
    const qrCodeBase64 = await QRCode.toDataURL(pixCode, {
      type: 'image/png',
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    console.log('✅ QR Code gerado com sucesso!');
    console.log('- Tamanho:', qrCodeBase64.length);
    console.log('- Prefixo:', qrCodeBase64.substring(0, 50));
    
    // Testar também como buffer
    const qrCodeBuffer = await QRCode.toBuffer(pixCode);
    const qrCodeBase64FromBuffer = qrCodeBuffer.toString('base64');
    
    console.log('✅ QR Code buffer gerado com sucesso!');
    console.log('- Tamanho buffer:', qrCodeBase64FromBuffer.length);
    console.log('- Prefixo buffer:', qrCodeBase64FromBuffer.substring(0, 50));
    
  } catch (error) {
    console.error('❌ Erro ao gerar QR Code:', error);
  }
}

testQRGeneration();