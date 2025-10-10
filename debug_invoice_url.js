// Debug para verificar se invoice_url está sendo passado corretamente
// Executar no console do navegador

console.log('🔍 === DEBUG INVOICE URL NO MODAL ===');

// Função para testar uma cobrança específica
function debugInvoiceUrl() {
  console.log('\n🎯 Procurando modal de cobrança aberto...');
  
  // Procurar pelo modal aberto
  const modal = document.querySelector('[class*="fixed inset-0"][class*="z-50"]');
  if (!modal) {
    console.log('❌ Modal não encontrado. Abra um modal de cobrança primeiro.');
    return;
  }
  
  console.log('✅ Modal encontrado!');
  
  // Verificar se há seção PIX visível
  const pixSection = modal.querySelector('[class*="bg-gradient-to-br from-green-50"]');
  console.log('📱 Seção PIX visível:', !!pixSection);
  
  // Verificar se há QR code
  const qrImage = modal.querySelector('img[alt*="QR"], img[src*="data:image"]');
  console.log('🔲 QR Code visível:', !!qrImage);
  if (qrImage) {
    console.log('  - QR Code src:', qrImage.src.substring(0, 50) + '...');
  }
  
  // Verificar se há seção de External Links
  const externalLinksSection = modal.querySelector('div:has(a[href]):last-of-type');
  console.log('🔗 Seção External Links encontrada:', !!externalLinksSection);
  
  // Procurar especificamente pelo botão "Ver Fatura"
  const verFaturaButton = Array.from(modal.querySelectorAll('a')).find(a => 
    a.textContent && a.textContent.includes('Ver Fatura')
  );
  console.log('📄 Botão "Ver Fatura" visível:', !!verFaturaButton);
  
  if (verFaturaButton) {
    console.log('  - URL da fatura:', verFaturaButton.href);
    console.log('  - Elemento pai:', verFaturaButton.parentElement?.className);
  } else {
    console.log('❌ Botão "Ver Fatura" não encontrado!');
    
    // Verificar se existe algum link com href
    const allLinks = modal.querySelectorAll('a[href]');
    console.log('🔍 Todos os links encontrados no modal:', allLinks.length);
    allLinks.forEach((link, index) => {
      console.log(`  ${index + 1}. ${link.textContent?.trim()} - ${link.href}`);
    });
  }
  
  // Verificar se há botão "Baixar Boleto"
  const baixarBoletoButton = Array.from(modal.querySelectorAll('a')).find(a => 
    a.textContent && a.textContent.includes('Baixar Boleto')
  );
  console.log('📋 Botão "Baixar Boleto" visível:', !!baixarBoletoButton);
  
  // Verificar a estrutura da seção de botões
  const actionButtons = modal.querySelector('.px-6.py-4.border-t');
  if (actionButtons) {
    console.log('🎛️ Seção de botões encontrada');
    console.log('  - Conteúdo:', actionButtons.textContent?.replace(/\s+/g, ' ').trim());
    
    // Verificar se há div com External Links
    const externalLinksDiv = actionButtons.querySelector('div:has(a[href])');
    console.log('  - Div External Links:', !!externalLinksDiv);
    if (externalLinksDiv) {
      console.log('    - Classes:', externalLinksDiv.className);
      console.log('    - Filhos:', externalLinksDiv.children.length);
    }
  }
}

// Executar o debug
debugInvoiceUrl();

// Função para monitorar mudanças no modal
function monitorModal() {
  console.log('\n👀 Monitorando mudanças no modal...');
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        const addedNode = mutation.addedNodes[0];
        if (addedNode.nodeType === 1 && addedNode.querySelector) {
          const modal = addedNode.querySelector('[class*="fixed inset-0"][class*="z-50"]') || 
                       (addedNode.matches && addedNode.matches('[class*="fixed inset-0"][class*="z-50"]') ? addedNode : null);
          if (modal) {
            console.log('🔄 Modal detectado! Executando debug...');
            setTimeout(debugInvoiceUrl, 500); // Aguardar renderização
          }
        }
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Monitor ativo. Abra um modal de cobrança para ver o debug.');
}

// Iniciar monitoramento
monitorModal();