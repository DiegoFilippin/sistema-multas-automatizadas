// Teste para verificar e corrigir o problema do botão "Ver Fatura"
// Executar no console do navegador

console.log('🔧 === TESTE E CORREÇÃO DO BOTÃO VER FATURA ===');

// Função para interceptar e debugar dados do modal
function debugModalData() {
  // Interceptar React props
  const originalCreateElement = React.createElement;
  React.createElement = function(type, props, ...children) {
    if (type && type.name === 'CobrancaDetalhes' && props) {
      console.log('🎭 Props do CobrancaDetalhes interceptadas:');
      console.log('  - Cobrança:', props.cobranca);
      if (props.cobranca) {
        console.log('  - Invoice URL:', props.cobranca.invoice_url || 'AUSENTE');
        console.log('  - Bank Slip URL:', props.cobranca.bank_slip_url || 'AUSENTE');
        console.log('  - QR Code Image:', props.cobranca.qr_code_image ? 'PRESENTE' : 'AUSENTE');
        console.log('  - PIX Payload:', props.cobranca.pix_payload ? 'PRESENTE' : 'AUSENTE');
      }
    }
    return originalCreateElement.apply(this, arguments);
  };
  
  console.log('✅ Interceptor de React props ativado');
}

// Função para analisar modal atual
function analyzeCurrentModal() {
  console.log('\n🔍 === ANÁLISE DETALHADA DO MODAL ===');
  
  const modal = document.querySelector('[class*="fixed inset-0"][class*="z-50"]');
  if (!modal) {
    console.log('❌ Modal não encontrado');
    return null;
  }
  
  console.log('✅ Modal encontrado');
  
  // Verificar seção PIX
  const pixSection = modal.querySelector('[class*="bg-gradient-to-br from-green-50"]');
  console.log('💚 Seção PIX visível:', !!pixSection);
  
  // Verificar QR Code
  const qrImage = modal.querySelector('img[alt*="QR"], img[src*="data:image"]');
  console.log('🔲 QR Code visível:', !!qrImage);
  
  // Verificar seção de botões de ação
  const actionSection = modal.querySelector('.px-6.py-4.border-t');
  console.log('🎛️ Seção de ações encontrada:', !!actionSection);
  
  if (actionSection) {
    console.log('\n📋 Estrutura da seção de ações:');
    
    // Verificar botões de ação regulares
    const regularButtons = actionSection.querySelectorAll('button');
    console.log(`  - Botões regulares: ${regularButtons.length}`);
    regularButtons.forEach((btn, i) => {
      console.log(`    ${i + 1}. ${btn.textContent?.trim()}`);
    });
    
    // Verificar links externos
    const externalLinks = actionSection.querySelectorAll('a[href]');
    console.log(`  - Links externos: ${externalLinks.length}`);
    externalLinks.forEach((link, i) => {
      console.log(`    ${i + 1}. ${link.textContent?.trim()} - ${link.href}`);
    });
    
    // Verificar se existe div de External Links
    const externalLinksDiv = actionSection.querySelector('div:has(a[href])');
    console.log(`  - Div External Links existe: ${!!externalLinksDiv}`);
    
    if (!externalLinksDiv) {
      console.log('\n❌ PROBLEMA IDENTIFICADO: Div de External Links não existe!');
      console.log('🔍 HTML da seção de ações:');
      console.log(actionSection.innerHTML);
      
      // Verificar se há condição que impede a criação da div
      console.log('\n🔍 Verificando possíveis causas:');
      
      // Simular dados de teste
      const testData = {
        invoice_url: 'https://test.com/invoice',
        bank_slip_url: null
      };
      
      const shouldShowExternalLinks = testData.invoice_url || testData.bank_slip_url;
      console.log('  - Condição (invoice_url || bank_slip_url):', shouldShowExternalLinks);
      
      return {
        problem: 'external_links_div_missing',
        actionSection,
        hasPixSection: !!pixSection,
        hasQrCode: !!qrImage
      };
    }
  }
  
  return {
    modal,
    actionSection,
    hasPixSection: !!pixSection,
    hasQrCode: !!qrImage,
    externalLinksCount: actionSection?.querySelectorAll('a[href]').length || 0
  };
}

// Função para injetar botão de teste
function injectTestButton(modalData) {
  if (!modalData || !modalData.actionSection) {
    console.log('❌ Não é possível injetar botão de teste');
    return;
  }
  
  console.log('\n🧪 Injetando botão de teste "Ver Fatura"...');
  
  // Criar div de External Links se não existir
  let externalLinksDiv = modalData.actionSection.querySelector('div:has(a[href])');
  
  if (!externalLinksDiv) {
    externalLinksDiv = document.createElement('div');
    externalLinksDiv.className = 'flex space-x-3 pb-2';
    modalData.actionSection.appendChild(externalLinksDiv);
    console.log('✅ Div External Links criada');
  }
  
  // Criar botão "Ver Fatura" de teste
  const testButton = document.createElement('a');
  testButton.href = 'https://test.com/invoice';
  testButton.target = '_blank';
  testButton.rel = 'noopener noreferrer';
  testButton.className = 'flex-1 flex items-center justify-center space-x-2 p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors';
  testButton.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14"></path>
    </svg>
    <span>Ver Fatura (TESTE)</span>
  `;
  
  externalLinksDiv.appendChild(testButton);
  console.log('✅ Botão "Ver Fatura" de teste adicionado');
  
  // Adicionar estilo para destacar
  testButton.style.border = '2px solid #10B981';
  testButton.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.3)';
}

// Função para testar uma cobrança específica
function testSpecificCobranca(paymentId) {
  console.log(`\n🎯 Testando cobrança: ${paymentId}`);
  
  // Procurar pelo botão "Ver detalhes"
  const allButtons = document.querySelectorAll('button');
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
    
    // Aguardar modal abrir e analisar
    setTimeout(() => {
      const modalData = analyzeCurrentModal();
      if (modalData && modalData.problem === 'external_links_div_missing') {
        injectTestButton(modalData);
      }
    }, 1000);
  } else {
    console.log('❌ Botão "Ver detalhes" não encontrado');
  }
}

// Função para monitorar modais
function monitorModals() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const modal = node.querySelector ? node.querySelector('[class*="fixed inset-0"][class*="z-50"]') : null;
            if (modal || (node.matches && node.matches('[class*="fixed inset-0"][class*="z-50"]'))) {
              console.log('🎭 Novo modal detectado!');
              setTimeout(() => {
                const modalData = analyzeCurrentModal();
                if (modalData && modalData.problem === 'external_links_div_missing') {
                  injectTestButton(modalData);
                }
              }, 500);
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
  
  console.log('👀 Monitor de modais ativado');
}

// Inicializar testes
debugModalData();
monitorModals();

// Analisar modal atual se existir
if (document.querySelector('[class*="fixed inset-0"][class*="z-50"]')) {
  console.log('🎭 Modal já aberto, analisando...');
  const modalData = analyzeCurrentModal();
  if (modalData && modalData.problem === 'external_links_div_missing') {
    injectTestButton(modalData);
  }
}

console.log('\n🚀 Teste iniciado!');
console.log('📝 Para testar uma cobrança específica: testSpecificCobranca("payment_id")');
console.log('🔍 Para analisar modal atual: analyzeCurrentModal()');
console.log('🧪 Para injetar botão de teste: injectTestButton(analyzeCurrentModal())');

// Exportar funções
window.testSpecificCobranca = testSpecificCobranca;
window.analyzeCurrentModal = analyzeCurrentModal;
window.injectTestButton = injectTestButton;