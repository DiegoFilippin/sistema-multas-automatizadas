// Script para executar no console do navegador na página Meus Serviços
// Para debugar o problema do QR Code da cobrança pay_sjrxdyf47n4xe0o3

console.log('🔍 === DEBUG QR CODE NO FRONTEND ===');
console.log('Payment ID: pay_sjrxdyf47n4xe0o3');

// 1. Verificar se a cobrança existe na lista
function findCobrancaInDOM() {
  console.log('\n1️⃣ === PROCURANDO COBRANÇA NO DOM ===');
  
  // Procurar por elementos que contenham o payment ID
  const allElements = document.querySelectorAll('*');
  let foundElements = [];
  
  allElements.forEach(element => {
    if (element.textContent && element.textContent.includes('pay_sjrxdyf47n4xe0o3')) {
      foundElements.push(element);
    }
  });
  
  console.log('Elementos encontrados com o payment ID:', foundElements.length);
  foundElements.forEach((el, index) => {
    console.log(`Elemento ${index + 1}:`, el.tagName, el.className, el.textContent.substring(0, 100));
  });
  
  return foundElements;
}

// 2. Verificar dados no localStorage/sessionStorage
function checkLocalStorage() {
  console.log('\n2️⃣ === VERIFICANDO LOCAL STORAGE ===');
  
  // Verificar localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    if (value && value.includes('pay_sjrxdyf47n4xe0o3')) {
      console.log('Encontrado no localStorage:', key, value.substring(0, 200));
    }
  }
  
  // Verificar sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    const value = sessionStorage.getItem(key);
    if (value && value.includes('pay_sjrxdyf47n4xe0o3')) {
      console.log('Encontrado no sessionStorage:', key, value.substring(0, 200));
    }
  }
}

// 3. Simular clique no botão "Ver Detalhes" se a cobrança existir
function simulateViewDetails() {
  console.log('\n3️⃣ === SIMULANDO CLIQUE EM VER DETALHES ===');
  
  // Procurar botões "Ver Detalhes"
  const detailButtons = document.querySelectorAll('button');
  let targetButton = null;
  
  detailButtons.forEach(button => {
    if (button.textContent && button.textContent.includes('Ver Detalhes')) {
      // Verificar se o botão está na mesma linha/card da cobrança
      const parentCard = button.closest('[data-payment-id], .card, .border');
      if (parentCard && parentCard.textContent.includes('pay_sjrxdyf47n4xe0o3')) {
        targetButton = button;
      }
    }
  });
  
  if (targetButton) {
    console.log('✅ Botão "Ver Detalhes" encontrado, clicando...');
    targetButton.click();
    
    // Aguardar modal abrir e verificar QR Code
    setTimeout(() => {
      checkQRCodeInModal();
    }, 1000);
  } else {
    console.log('❌ Botão "Ver Detalhes" não encontrado para esta cobrança');
  }
}

// 4. Verificar QR Code no modal
function checkQRCodeInModal() {
  console.log('\n4️⃣ === VERIFICANDO QR CODE NO MODAL ===');
  
  // Procurar modal aberto
  const modal = document.querySelector('[role="dialog"], .modal, .fixed');
  if (!modal) {
    console.log('❌ Modal não encontrado');
    return;
  }
  
  console.log('✅ Modal encontrado');
  
  // Procurar imagem do QR Code
  const qrImages = modal.querySelectorAll('img');
  console.log('Imagens encontradas no modal:', qrImages.length);
  
  qrImages.forEach((img, index) => {
    console.log(`Imagem ${index + 1}:`);
    console.log('  - src:', img.src.substring(0, 100) + '...');
    console.log('  - alt:', img.alt);
    console.log('  - className:', img.className);
    console.log('  - width:', img.width, 'height:', img.height);
    console.log('  - naturalWidth:', img.naturalWidth, 'naturalHeight:', img.naturalHeight);
    console.log('  - complete:', img.complete);
    
    if (img.src.includes('data:image/')) {
      console.log('  ✅ É uma imagem base64');
    } else if (img.src.includes('blob:')) {
      console.log('  ✅ É uma imagem blob');
    } else {
      console.log('  ⚠️ Tipo de imagem desconhecido');
    }
  });
  
  // Procurar texto "QR Code não disponível"
  const noQrText = modal.textContent;
  if (noQrText.includes('QR Code não disponível')) {
    console.log('❌ PROBLEMA IDENTIFICADO: "QR Code não disponível" encontrado no modal');
  }
  
  // Procurar seção PIX
  const pixSection = modal.querySelector('[class*="green"], [class*="pix"]');
  if (pixSection) {
    console.log('✅ Seção PIX encontrada');
    console.log('  - Conteúdo:', pixSection.textContent.substring(0, 200));
  } else {
    console.log('❌ Seção PIX não encontrada');
  }
}

// 5. Verificar dados da cobrança via React DevTools (se disponível)
function checkReactState() {
  console.log('\n5️⃣ === VERIFICANDO ESTADO REACT ===');
  
  // Tentar acessar dados do React (se React DevTools estiver disponível)
  if (window.React) {
    console.log('✅ React detectado');
    // Aqui poderia acessar o estado do componente se necessário
  } else {
    console.log('⚠️ React não detectado diretamente');
  }
  
  // Verificar se há dados globais
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools detectado');
  }
}

// Executar todas as verificações
function runAllChecks() {
  console.log('🚀 === INICIANDO VERIFICAÇÕES COMPLETAS ===');
  
  findCobrancaInDOM();
  checkLocalStorage();
  checkReactState();
  
  // Tentar simular clique após um delay
  setTimeout(() => {
    simulateViewDetails();
  }, 2000);
}

// Executar
runAllChecks();

// Também disponibilizar funções individuais
window.debugQR = {
  findCobrancaInDOM,
  checkLocalStorage,
  simulateViewDetails,
  checkQRCodeInModal,
  checkReactState,
  runAllChecks
};

console.log('\n💡 === FUNÇÕES DISPONÍVEIS ===');
console.log('Use window.debugQR.functionName() para executar funções individuais');
console.log('Exemplo: window.debugQR.checkQRCodeInModal()');