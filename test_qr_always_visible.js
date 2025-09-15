// Teste para verificar se o QR code está sempre visível
// Executar no console do navegador na página Meus Serviços

console.log('🧪 === TESTE QR CODE SEMPRE VISÍVEL ===');

// Função para testar o modal da cobrança específica
function testQrCodeModal() {
  // Procurar pela cobrança pay_kxq6p35gavzescuz
  const cobrancaButtons = document.querySelectorAll('[data-testid="view-details"], button');
  let targetButton = null;
  
  cobrancaButtons.forEach(button => {
    const text = button.textContent || button.innerText;
    if (text.includes('Ver Detalhes') || text.includes('👁️')) {
      // Verificar se é a cobrança correta procurando pelo ID próximo
      const parent = button.closest('div');
      if (parent && parent.textContent.includes('pay_kxq6p35gavzescuz')) {
        targetButton = button;
      }
    }
  });
  
  if (targetButton) {
    console.log('✅ Botão da cobrança pay_kxq6p35gavzescuz encontrado!');
    targetButton.click();
    
    // Aguardar o modal abrir e verificar o QR code
    setTimeout(() => {
      const modal = document.querySelector('[role="dialog"], .modal, .fixed');
      if (modal) {
        console.log('✅ Modal aberto!');
        
        // Verificar se a seção PIX está visível
        const pixSection = modal.querySelector('*');
        const pixText = modal.textContent || modal.innerText;
        
        if (pixText.includes('Pagamento via PIX')) {
          console.log('✅ Seção PIX encontrada!');
          
          // Verificar se o QR code está visível
          const qrImage = modal.querySelector('img[alt*="QR"], img[src*="base64"]');
          if (qrImage) {
            console.log('✅ QR CODE VISÍVEL! Sucesso!');
            console.log('  - Src:', qrImage.src.substring(0, 100) + '...');
          } else {
            console.log('❌ QR code não encontrado');
            console.log('  - Verificando se há mensagem de indisponível...');
            if (pixText.includes('QR Code Indisponível')) {
              console.log('❌ Ainda mostra "QR Code Indisponível"');
            }
          }
          
          // Verificar logs no console
          console.log('📋 Verificar logs do componente CobrancaDetalhes no console');
        } else {
          console.log('❌ Seção PIX não encontrada no modal');
        }
      } else {
        console.log('❌ Modal não encontrado');
      }
    }, 2000);
  } else {
    console.log('❌ Cobrança pay_kxq6p35gavzescuz não encontrada na lista');
    console.log('💡 Certifique-se de estar na página "Meus Serviços"');
  }
}

// Executar o teste
testQrCodeModal();

console.log('🧪 === FIM TESTE ===');