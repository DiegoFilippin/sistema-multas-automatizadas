// Script para testar o modal de QR code após as correções
// Execute este script no console do navegador na página Meus Serviços

console.log('🧪 TESTE DO MODAL QR CODE - INICIANDO');

// Função para simular clique no botão de detalhes
function testQrModal() {
  console.log('🔍 Procurando botões de "Ver detalhes"...');
  
  // Procurar botões de ver detalhes
  const detailButtons = document.querySelectorAll('button');
  let foundButton = null;
  
  detailButtons.forEach(button => {
    if (button.textContent.includes('Ver detalhes') || button.textContent.includes('Ver Detalhes')) {
      foundButton = button;
    }
  });
  
  if (foundButton) {
    console.log('✅ Botão "Ver detalhes" encontrado, clicando...');
    foundButton.click();
    
    // Aguardar um pouco e verificar se o modal abriu
    setTimeout(() => {
      const modal = document.querySelector('[class*="fixed inset-0"]');
      if (modal) {
        console.log('✅ Modal aberto com sucesso!');
        console.log('🔍 Verificando se a seção PIX está visível...');
        
        const pixSection = modal.querySelector('[class*="from-green-50"]');
        if (pixSection) {
          console.log('✅ Seção PIX encontrada no modal!');
          
          const qrCodeImg = pixSection.querySelector('img[alt="QR Code PIX"]');
          if (qrCodeImg) {
            console.log('✅ Imagem do QR Code encontrada!');
            console.log('📊 Dados da imagem:', {
              src: qrCodeImg.src.substring(0, 100) + '...',
              width: qrCodeImg.width,
              height: qrCodeImg.height
            });
          } else {
            console.log('❌ Imagem do QR Code NÃO encontrada');
            
            const loadingText = pixSection.querySelector('p');
            if (loadingText && loadingText.textContent.includes('Carregando')) {
              console.log('⏳ QR Code ainda carregando...');
            } else {
              console.log('❌ QR Code indisponível ou erro');
            }
          }
        } else {
          console.log('❌ Seção PIX NÃO encontrada no modal');
        }
      } else {
        console.log('❌ Modal não foi aberto');
      }
    }, 2000);
  } else {
    console.log('❌ Botão "Ver detalhes" não encontrado');
    console.log('💡 Certifique-se de estar na página "Meus Serviços" com cobranças listadas');
  }
}

// Executar o teste
testQrModal();

console.log('\n📋 INSTRUÇÕES PARA TESTE MANUAL:');
console.log('1. Navegue até "Meus Serviços" no menu lateral');
console.log('2. Clique em "Ver detalhes" de qualquer cobrança PIX');
console.log('3. Verifique se o QR code aparece no modal');
console.log('4. Abra o console do navegador (F12) para ver os logs de debug');
console.log('5. Procure por logs que começam com "🔍 === DEBUG QR CODE"');