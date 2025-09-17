// Teste para verificar se invoice_url está chegando ao modal
// Executar no console do navegador

console.log('🔍 === TESTE INVOICE URL NO MODAL ===');

// Função para interceptar dados do modal
function interceptModalData() {
  // Interceptar chamadas de API
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('/api/payments/')) {
      console.log('🌐 API Call interceptada:', url);
      return originalFetch.apply(this, args).then(response => {
        return response.clone().json().then(data => {
          console.log('📊 Resposta da API:', data);
          if (data.payment) {
            console.log('💰 Payment data:');
            console.log('  - ID:', data.payment.id);
            console.log('  - Invoice URL:', data.payment.invoice_url || 'AUSENTE');
            console.log('  - Bank Slip URL:', data.payment.bank_slip_url || 'AUSENTE');
          }
          if (data.service_order) {
            console.log('📋 Service Order data:');
            console.log('  - ID:', data.service_order.id);
            console.log('  - Invoice URL:', data.service_order.invoice_url || 'AUSENTE');
            console.log('  - Bank Slip URL:', data.service_order.bank_slip_url || 'AUSENTE');
          }
          return new Response(JSON.stringify(data), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        });
      });
    }
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ Interceptor de API ativado');
}

// Função para monitorar props do modal
function monitorModalProps() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Procurar pelo modal
            const modal = node.querySelector ? node.querySelector('[class*="fixed inset-0"][class*="z-50"]') : null;
            if (modal || (node.matches && node.matches('[class*="fixed inset-0"][class*="z-50"]'))) {
              console.log('🎭 Modal detectado!');
              setTimeout(() => {
                analyzeModal();
              }, 1000);
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('👀 Monitor de modal ativado');
}

// Função para analisar o modal atual
function analyzeModal() {
  console.log('\n🔍 === ANÁLISE DO MODAL ===');
  
  const modal = document.querySelector('[class*="fixed inset-0"][class*="z-50"]');
  if (!modal) {
    console.log('❌ Modal não encontrado');
    return;
  }
  
  console.log('✅ Modal encontrado');
  
  // Verificar título do modal
  const title = modal.querySelector('h2');
  console.log('📋 Título:', title?.textContent || 'Não encontrado');
  
  // Verificar seção PIX
  const pixSection = modal.querySelector('[class*="bg-gradient-to-br from-green-50"]');
  console.log('💚 Seção PIX:', !!pixSection);
  
  // Verificar QR Code
  const qrImage = modal.querySelector('img[alt*="QR"], img[src*="data:image"]');
  console.log('🔲 QR Code:', !!qrImage);
  
  // Verificar seção de External Links
  const actionButtons = modal.querySelector('.px-6.py-4.border-t');
  console.log('🎛️ Seção de botões:', !!actionButtons);
  
  if (actionButtons) {
    // Procurar por links externos
    const externalLinks = actionButtons.querySelectorAll('a[href]');
    console.log('🔗 Links externos encontrados:', externalLinks.length);
    
    externalLinks.forEach((link, index) => {
      console.log(`  ${index + 1}. ${link.textContent?.trim()} - ${link.href}`);
    });
    
    // Verificar especificamente por "Ver Fatura"
    const verFaturaLink = Array.from(externalLinks).find(link => 
      link.textContent && link.textContent.includes('Ver Fatura')
    );
    
    if (verFaturaLink) {
      console.log('✅ Botão "Ver Fatura" encontrado!');
      console.log('  - URL:', verFaturaLink.href);
    } else {
      console.log('❌ Botão "Ver Fatura" NÃO encontrado!');
      
      // Verificar se a div de external links existe mas está vazia
      const externalLinksDiv = actionButtons.querySelector('div:has(a[href])');
      if (!externalLinksDiv) {
        console.log('❌ Div de External Links não existe');
        console.log('🔍 Estrutura da seção de botões:');
        console.log(actionButtons.innerHTML);
      }
    }
  }
}

// Função para testar uma cobrança específica
function testSpecificCobranca(paymentId) {
  console.log(`\n🎯 Testando cobrança específica: ${paymentId}`);
  
  // Procurar pelo botão "Ver detalhes" desta cobrança
  const allButtons = document.querySelectorAll('button, a');
  let targetButton = null;
  
  for (const button of allButtons) {
    const row = button.closest('tr, div');
    if (row && row.textContent && row.textContent.includes(paymentId)) {
      if (button.textContent && button.textContent.includes('Ver detalhes')) {
        targetButton = button;
        break;
      }
    }
  }
  
  if (targetButton) {
    console.log('✅ Botão "Ver detalhes" encontrado, clicando...');
    targetButton.click();
  } else {
    console.log('❌ Botão "Ver detalhes" não encontrado para esta cobrança');
  }
}

// Inicializar testes
interceptModalData();
monitorModalProps();

// Analisar modal atual se já estiver aberto
if (document.querySelector('[class*="fixed inset-0"][class*="z-50"]')) {
  console.log('🎭 Modal já está aberto, analisando...');
  analyzeModal();
}

console.log('\n🚀 Teste iniciado!');
console.log('📝 Para testar uma cobrança específica, use: testSpecificCobranca("payment_id")');
console.log('🔍 Para analisar o modal atual, use: analyzeModal()');

// Exportar funções para uso manual
window.testSpecificCobranca = testSpecificCobranca;
window.analyzeModal = analyzeModal;