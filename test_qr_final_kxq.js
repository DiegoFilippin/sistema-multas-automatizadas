// Teste final para verificar se o QR code pay_kxq6p35gavzescuz está visível
// Executar no console do navegador na página Meus Serviços

console.log('🧪 === TESTE FINAL QR CODE pay_kxq6p35gavzescuz ===');

// Função para encontrar e testar a cobrança específica
function testCobrancaKxq() {
  console.log('🔍 Procurando cobrança pay_kxq6p35gavzescuz...');
  
  // Procurar por elementos que contenham o ID da cobrança
  const allElements = document.querySelectorAll('*');
  let cobrancaElement = null;
  
  for (let element of allElements) {
    if (element.textContent && element.textContent.includes('pay_kxq6p35gavzescuz')) {
      cobrancaElement = element;
      break;
    }
  }
  
  if (cobrancaElement) {
    console.log('✅ Cobrança encontrada na página!');
    
    // Procurar pelo botão "Ver Detalhes" próximo
    const parent = cobrancaElement.closest('div, tr, li');
    const detailsButton = parent?.querySelector('button[title*="detalhes"], button[title*="Detalhes"], button:has(svg)');
    
    if (detailsButton) {
      console.log('✅ Botão de detalhes encontrado! Clicando...');
      detailsButton.click();
      
      // Aguardar modal abrir
      setTimeout(() => {
        console.log('🔍 Verificando modal...');
        
        const modal = document.querySelector('[role="dialog"], .modal, .fixed.inset-0');
        if (modal) {
          console.log('✅ Modal aberto!');
          
          // Verificar se há seção PIX
          const modalText = modal.textContent || modal.innerText;
          if (modalText.includes('Pagamento via PIX')) {
            console.log('✅ Seção PIX encontrada!');
            
            // Verificar se QR code está visível
            const qrImage = modal.querySelector('img[alt*="QR"], img[src*="base64"], img[src*="data:image"]');
            if (qrImage) {
              console.log('🎉 QR CODE VISÍVEL! SUCESSO TOTAL!');
              console.log('  - Imagem encontrada:', qrImage.tagName);
              console.log('  - Src (primeiros 100 chars):', qrImage.src.substring(0, 100) + '...');
              console.log('  - Alt text:', qrImage.alt);
            } else {
              console.log('❌ QR code não encontrado como imagem');
              
              // Verificar se há mensagem de indisponível
              if (modalText.includes('QR Code Indisponível')) {
                console.log('❌ Ainda mostra "QR Code Indisponível"');
              } else {
                console.log('🤔 Seção PIX existe mas QR code não foi encontrado');
              }
            }
            
            // Verificar código PIX para copiar
            if (modalText.includes('Copiar Código PIX')) {
              console.log('✅ Botão "Copiar Código PIX" encontrado!');
            }
            
          } else {
            console.log('❌ Seção PIX não encontrada no modal');
            console.log('  - Conteúdo do modal:', modalText.substring(0, 200) + '...');
          }
        } else {
          console.log('❌ Modal não encontrado');
        }
      }, 2000);
    } else {
      console.log('❌ Botão de detalhes não encontrado');
    }
  } else {
    console.log('❌ Cobrança pay_kxq6p35gavzescuz não encontrada na página');
    console.log('💡 Certifique-se de estar na página "Meus Serviços"');
  }
}

// Executar teste
testCobrancaKxq();

console.log('🧪 === FIM TESTE ===');