// Script para corrigir completamente o problema do QR code no webhook
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function fixWebhookQRComplete() {
  console.log('🔧 === CORREÇÃO COMPLETA DO WEBHOOK QR CODE ===\n');
  
  try {
    // 1. Identificar o problema principal
    console.log('1️⃣ IDENTIFICANDO O PROBLEMA:');
    console.log('   ❌ Cobrança criada via webhook externo não salva QR code');
    console.log('   ❌ Webhook do Asaas recebe dados mas cobrança já existe sem QR');
    console.log('   ❌ Modal busca dados mas não encontra QR code');
    
    // 2. Analisar o fluxo atual
    console.log('\n2️⃣ FLUXO ATUAL (PROBLEMÁTICO):');
    console.log('   1. Usuário cria cobrança → POST /api/payments/create-service-order');
    console.log('   2. Sistema envia dados → webhook externo (n8n)');
    console.log('   3. Webhook externo cria cobrança no Asaas');
    console.log('   4. Sistema salva service_order SEM dados PIX');
    console.log('   5. Asaas envia webhook → /api/webhooks/asaas');
    console.log('   6. Webhook do Asaas tenta atualizar mas dados já estão incompletos');
    
    // 3. Solução proposta
    console.log('\n3️⃣ SOLUÇÃO PROPOSTA:');
    console.log('   ✅ Modificar criação de cobrança para aguardar resposta do webhook externo');
    console.log('   ✅ Salvar dados PIX retornados pelo webhook externo');
    console.log('   ✅ Garantir que service_order seja criado com QR code');
    console.log('   ✅ Webhook do Asaas apenas confirma pagamento');
    
    // 4. Implementar correção
    console.log('\n4️⃣ IMPLEMENTANDO CORREÇÃO:');
    
    // Primeiro, vamos verificar se há cobranças sem QR code para corrigir
    console.log('   - Buscando cobranças sem QR code...');
    
    const diegoCompanyId = '4d4e7f8a-9b2c-4d5e-8f9a-1b2c3d4e5f6a';
    const paymentsResponse = await fetch(`${API_BASE}/api/payments/company/${diegoCompanyId}`);
    
    if (paymentsResponse.ok) {
      const paymentsData = await paymentsResponse.json();
      const paymentsWithoutQR = paymentsData.data?.filter(p => !p.qr_code && !p.pix_code) || [];
      
      console.log(`   - Cobranças sem QR code: ${paymentsWithoutQR.length}`);
      
      if (paymentsWithoutQR.length > 0) {
        console.log('   - Tentando corrigir cobranças existentes...');
        
        for (const payment of paymentsWithoutQR.slice(0, 3)) { // Corrigir apenas as 3 primeiras
          console.log(`\n   🔄 Corrigindo cobrança: ${payment.payment_id}`);
          
          if (payment.asaas_payment_id) {
            // Buscar detalhes via API
            const detailsResponse = await fetch(`${API_BASE}/api/payments/${payment.asaas_payment_id}`);
            
            if (detailsResponse.ok) {
              const detailsData = await detailsResponse.json();
              
              if (detailsData.payment?.webhook_response) {
                const webhook = detailsData.payment.webhook_response;
                
                if (webhook.payment?.pixTransaction?.qrCode) {
                  const qrCode = webhook.payment.pixTransaction.qrCode;
                  
                  console.log(`     - QR Code encontrado no webhook!`);
                  console.log(`     - Encoded Image: ${qrCode.encodedImage ? 'SIM' : 'NÃO'}`);
                  console.log(`     - Payload: ${qrCode.payload ? 'SIM' : 'NÃO'}`);
                  
                  // Aqui normalmente atualizaríamos o banco, mas como estamos usando o proxy,
                  // vamos apenas mostrar que os dados estão disponíveis
                  console.log(`     ✅ Dados PIX disponíveis para correção`);
                } else {
                  console.log(`     ❌ Dados PIX não encontrados no webhook`);
                }
              } else {
                console.log(`     ❌ Webhook response não encontrado`);
              }
            }
          }
        }
      }
    }
    
    console.log('\n5️⃣ PRÓXIMAS AÇÕES NECESSÁRIAS:');
    console.log('   1. 🔧 Modificar /api/payments/create-service-order para:');
    console.log('      - Aguardar resposta completa do webhook externo');
    console.log('      - Extrair QR code da resposta');
    console.log('      - Salvar service_order com dados PIX completos');
    
    console.log('   2. 🔧 Modificar webhook do Asaas para:');
    console.log('      - Apenas confirmar pagamentos existentes');
    console.log('      - Não tentar criar dados PIX (já devem existir)');
    
    console.log('   3. 🔧 Garantir que modal busque dados de:');
    console.log('      - service_orders (fonte principal)');
    console.log('      - Campos: qr_code_image, pix_payload, invoice_url');
    
    console.log('\n✅ ANÁLISE COMPLETA!');
    console.log('\n🎯 PROBLEMA RAIZ IDENTIFICADO:');
    console.log('   O webhook externo (n8n) retorna dados PIX, mas o sistema');
    console.log('   não está salvando esses dados no service_order inicial.');
    console.log('   O webhook do Asaas chega depois, mas a cobrança já foi');
    console.log('   criada sem os dados PIX.');
    
    console.log('\n🔧 CORREÇÃO PRINCIPAL NECESSÁRIA:');
    console.log('   Modificar a criação de cobrança para salvar os dados PIX');
    console.log('   retornados pelo webhook externo IMEDIATAMENTE.');
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
  }
}

// Executar a correção
fixWebhookQRComplete();