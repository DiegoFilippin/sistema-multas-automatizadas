// Script para testar se o botão "Ver Fatura" está agora visível

function testButtonVisibility() {
  console.log('🧪 Testando visibilidade do botão "Ver Fatura" após correção...');
  
  // Aguardar um pouco para garantir que a página carregou
  setTimeout(() => {
    // Procurar por modais abertos
    const modal = document.querySelector('[role="dialog"]') || 
                 document.querySelector('.fixed.inset-0.z-50') ||
                 document.querySelector('.fixed.inset-0');
    
    if (!modal) {
      console.log('ℹ️ Nenhum modal encontrado. Abra um modal de cobrança para testar.');
      return;
    }
    
    console.log('✅ Modal encontrado');
    
    // Procurar pelo botão "Ver Fatura"
    const verFaturaButton = modal.querySelector('a[href*="asaas.com"]') ||
                           modal.querySelector('a:has(span)')?.textContent?.includes('Ver Fatura') ? 
                           modal.querySelector('a:has(span)') : null;
    
    if (!verFaturaButton) {
      console.log('❌ Botão "Ver Fatura" não encontrado');
      
      // Listar todos os links no modal
      const allLinks = modal.querySelectorAll('a');
      console.log('🔗 Links encontrados no modal:', allLinks.length);
      allLinks.forEach((link, index) => {
        console.log(`  Link ${index + 1}:`, {
          href: link.href,
          text: link.textContent.trim(),
          visible: window.getComputedStyle(link).display !== 'none'
        });
      });
      return;
    }
    
    console.log('✅ Botão "Ver Fatura" encontrado!');
    
    // Verificar estilos aplicados
    const computedStyles = window.getComputedStyle(verFaturaButton);
    const inlineStyles = verFaturaButton.style;
    
    console.log('🎨 Estilos do botão:', {
      backgroundColor: {
        computed: computedStyles.backgroundColor,
        inline: inlineStyles.backgroundColor
      },
      color: {
        computed: computedStyles.color,
        inline: inlineStyles.color
      },
      display: {
        computed: computedStyles.display,
        inline: inlineStyles.display
      },
      visibility: computedStyles.visibility,
      opacity: computedStyles.opacity
    });
    
    // Verificar se o botão está visível
    const rect = verFaturaButton.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 && 
                     computedStyles.display !== 'none' && 
                     computedStyles.visibility !== 'hidden' && 
                     computedStyles.opacity !== '0';
    
    console.log('👁️ Status de visibilidade:', {
      dimensões: `${rect.width}x${rect.height}`,
      posição: `${rect.left}, ${rect.top}`,
      visível: isVisible
    });
    
    if (isVisible) {
      console.log('🎉 SUCESSO! O botão "Ver Fatura" está visível!');
      
      // Destacar o botão brevemente
      verFaturaButton.style.boxShadow = '0 0 10px 2px #22c55e';
      setTimeout(() => {
        verFaturaButton.style.boxShadow = '';
      }, 2000);
    } else {
      console.log('❌ PROBLEMA: O botão ainda não está visível');
    }
    
  }, 1000);
}

// Executar o teste
testButtonVisibility();

// Também monitorar mudanças no DOM
const observer = new MutationObserver(() => {
  testButtonVisibility();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('🔍 Teste de visibilidade do botão iniciado. Abra um modal de cobrança para verificar.');