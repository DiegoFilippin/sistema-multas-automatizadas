// Teste final para verificar QR code sempre visível e botão de recurso
// Executar no console do navegador na página de cobranças

console.log('🧪 === TESTE FINAL: QR CODE + BOTÃO RECURSO ===');

// Função para testar uma cobrança específica
function testCobrancaCompleta(paymentId) {
  console.log(`\n🔍 Testando cobrança: ${paymentId}`);
  
  // 1. Encontrar a cobrança na lista
  const cobrancaRows = document.querySelectorAll('[data-payment-id], tr');
  let targetRow = null;
  
  for (const row of cobrancaRows) {
    const text = row.textContent || '';
    if (text.includes(paymentId)) {
      targetRow = row;
      break;
    }
  }
  
  if (!targetRow) {
    console.log('❌ Cobrança não encontrada na lista');
    return false;
  }
  
  console.log('✅ Cobrança encontrada na lista');
  
  // 2. Clicar no botão "Ver Detalhes"
  const detailsButton = targetRow.querySelector('button[title*="detalhes"], button:has(svg)');
  if (!detailsButton) {
    console.log('❌ Botão "Ver Detalhes" não encontrado');
    return false;
  }
  
  console.log('🖱️ Clicando em "Ver Detalhes"...');
  detailsButton.click();
  
  // 3. Aguardar modal abrir
  setTimeout(() => {
    const modal = document.querySelector('[role="dialog"], .fixed.inset-0, .modal');
    if (!modal) {
      console.log('❌ Modal não abriu');
      return;
    }
    
    console.log('✅ Modal aberto com sucesso');
    
    // 4. Verificar QR code PIX
    console.log('\n🔍 Verificando QR Code PIX...');
    const pixSection = modal.querySelector('.bg-gradient-to-br.from-green-50');
    
    if (pixSection) {
      console.log('✅ Seção PIX encontrada');
      
      const qrImage = pixSection.querySelector('img[alt*="QR"], img[src*="base64"], img[src*="data:image"]');
      if (qrImage) {
        console.log('✅ QR Code visível!');
        console.log('  - Src:', qrImage.src.substring(0, 50) + '...');
        console.log('  - Alt:', qrImage.alt);
      } else {
        console.log('❌ QR Code não encontrado');
        
        // Verificar se mostra "QR Code Indisponível"
        const unavailableMsg = pixSection.textContent;
        if (unavailableMsg.includes('QR Code Indisponível')) {
          console.log('⚠️ Mostra "QR Code Indisponível"');
        }
      }
      
      // Verificar código PIX para copiar
      const pixCode = pixSection.querySelector('.font-mono');
      if (pixCode) {
        console.log('✅ Código PIX para copiar encontrado');
        console.log('  - Código:', pixCode.textContent.substring(0, 30) + '...');
      } else {
        console.log('⚠️ Código PIX para copiar não encontrado');
      }
    } else {
      console.log('❌ Seção PIX não encontrada');
    }
    
    // 5. Verificar botão de recurso
    console.log('\n🔍 Verificando Botão de Recurso...');
    const recursoSection = modal.querySelector('.bg-gradient-to-br.from-blue-50');
    
    if (recursoSection) {
      console.log('✅ Seção de Recurso encontrada');
      
      const iniciarButton = recursoSection.querySelector('button:has(.lucide-scale), button[class*="green"]');
      const verButton = recursoSection.querySelector('button:has(.lucide-eye), button[class*="blue"]');
      
      if (iniciarButton) {
        console.log('✅ Botão "Iniciar Recurso" encontrado');
        console.log('  - Texto:', iniciarButton.textContent.trim());
      } else if (verButton) {
        console.log('✅ Botão "Ver Recurso Existente" encontrado');
        console.log('  - Texto:', verButton.textContent.trim());
      } else {
        console.log('❌ Nenhum botão de recurso encontrado');
      }
      
      // Verificar status do pagamento na seção
      const statusText = recursoSection.textContent;
      if (statusText.includes('Pagamento Confirmado')) {
        console.log('✅ Status: Pagamento Confirmado');
      } else if (statusText.includes('já possui um recurso')) {
        console.log('✅ Status: Recurso já existe');
      } else {
        console.log('⚠️ Status não identificado');
      }
    } else {
      console.log('❌ Seção de Recurso não encontrada');
      console.log('ℹ️ Isso pode ser normal se o pagamento não está confirmado');
    }
    
    // 6. Verificar logs no console
    console.log('\n📋 Resumo do Teste:');
    console.log('  - Modal: ✅ Abriu corretamente');
    console.log('  - QR Code:', qrImage ? '✅ Visível' : '❌ Não visível');
    console.log('  - Seção PIX:', pixSection ? '✅ Presente' : '❌ Ausente');
    console.log('  - Seção Recurso:', recursoSection ? '✅ Presente' : '❌ Ausente');
    
    // Fechar modal
    setTimeout(() => {
      const closeButton = modal.querySelector('button:has(.lucide-x), .close, [aria-label*="fechar"]');
      if (closeButton) {
        closeButton.click();
        console.log('🔒 Modal fechado');
      }
    }, 2000);
    
  }, 1500);
  
  return true;
}

// Função para testar múltiplas cobranças
function testMultiplasCobrancas() {
  const cobrancasParaTestar = [
    'pay_kxq6p35gavzescuz',
    'pay_nzlbc860tdx8sp34'
  ];
  
  console.log(`\n🎯 Testando ${cobrancasParaTestar.length} cobranças...`);
  
  cobrancasParaTestar.forEach((paymentId, index) => {
    setTimeout(() => {
      testCobrancaCompleta(paymentId);
    }, index * 8000); // 8 segundos entre cada teste
  });
}

// Função para verificar se estamos na página correta
function verificarPagina() {
  const url = window.location.href;
  if (url.includes('/cobrancas') || url.includes('/meus-servicos')) {
    console.log('✅ Página correta detectada:', url);
    return true;
  } else {
    console.log('❌ Página incorreta. Acesse /cobrancas ou /meus-servicos');
    return false;
  }
}

// Executar teste
if (verificarPagina()) {
  console.log('\n🚀 Iniciando testes em 2 segundos...');
  setTimeout(() => {
    testMultiplasCobrancas();
  }, 2000);
} else {
  console.log('\n📍 Para executar o teste:');
  console.log('1. Acesse http://localhost:5173/cobrancas');
  console.log('2. Execute este script novamente');
}

// Exportar funções para uso manual
window.testCobrancaCompleta = testCobrancaCompleta;
window.testMultiplasCobrancas = testMultiplasCobrancas;

console.log('\n💡 Funções disponíveis:');
console.log('- testCobrancaCompleta("pay_xxx") - Testa uma cobrança específica');
console.log('- testMultiplasCobrancas() - Testa múltiplas cobranças automaticamente');
console.log('\n=== FIM DO SCRIPT DE TESTE ===');