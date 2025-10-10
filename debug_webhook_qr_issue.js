// Script para debugar o problema do QR code no webhook
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const WEBHOOK_URL = 'https://webhookn8n.synsoft.com.br/webhook/d37fac6e-9379-4bca-b015-9c56b104cae1';

async function debugWebhookQRIssue() {
  console.log('🔍 === DEBUG WEBHOOK QR CODE ISSUE ===\n');
  
  try {
    // 1. Verificar se o proxy server está rodando
    console.log('1️⃣ VERIFICANDO PROXY SERVER:');
    try {
      const healthResponse = await fetch(`${API_BASE}/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Proxy server está rodando');
        console.log(`   - Status: ${healthData.status}`);
        console.log(`   - Service: ${healthData.service}`);
      } else {
        console.log('❌ Proxy server não está respondendo');
        return;
      }
    } catch (error) {
      console.log('❌ Proxy server não está acessível:', error.message);
      return;
    }
    
    // 2. Verificar cobranças recentes
    console.log('\n2️⃣ VERIFICANDO COBRANÇAS RECENTES:');
    
    // Buscar empresa do Diego para teste
    const diegoCompanyId = '4d4e7f8a-9b2c-4d5e-8f9a-1b2c3d4e5f6a';
    
    try {
      const paymentsResponse = await fetch(`${API_BASE}/api/payments/company/${diegoCompanyId}`);
      
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        console.log(`✅ Encontradas ${paymentsData.data?.length || 0} cobranças`);
        
        if (paymentsData.data && paymentsData.data.length > 0) {
          const recentPayment = paymentsData.data[0];
          console.log('   - Cobrança mais recente:');
          console.log(`     * ID: ${recentPayment.payment_id}`);
          console.log(`     * Cliente: ${recentPayment.client_name}`);
          console.log(`     * Valor: R$ ${recentPayment.amount}`);
          console.log(`     * Status: ${recentPayment.status}`);
          console.log(`     * Asaas Payment ID: ${recentPayment.asaas_payment_id}`);
          console.log(`     * QR Code: ${recentPayment.qr_code ? 'SIM' : 'NÃO'}`);
          console.log(`     * PIX Code: ${recentPayment.pix_code ? 'SIM' : 'NÃO'}`);
          
          // 3. Testar API de detalhes
          if (recentPayment.asaas_payment_id) {
            console.log('\n3️⃣ TESTANDO API DE DETALHES:');
            
            try {
              const detailsResponse = await fetch(`${API_BASE}/api/payments/${recentPayment.asaas_payment_id}`);
              
              if (detailsResponse.ok) {
                const detailsData = await detailsResponse.json();
                console.log('✅ API de detalhes funcionando');
                console.log(`   - Source: ${detailsData.payment?.source}`);
                console.log(`   - QR Code Image: ${detailsData.payment?.qr_code_image ? 'SIM' : 'NÃO'}`);
                console.log(`   - PIX QR Code: ${detailsData.payment?.pix_qr_code ? 'SIM' : 'NÃO'}`);
                console.log(`   - PIX Payload: ${detailsData.payment?.pix_payload ? 'SIM' : 'NÃO'}`);
                console.log(`   - Invoice URL: ${detailsData.payment?.invoice_url ? 'SIM' : 'NÃO'}`);
                
                if (detailsData.payment?.webhook_response) {
                  console.log('   - Webhook Response: SIM');
                  const webhook = detailsData.payment.webhook_response;
                  console.log(`     * Event: ${webhook.event || 'N/A'}`);
                  console.log(`     * Payment Status: ${webhook.payment?.status || 'N/A'}`);
                  console.log(`     * PIX Transaction: ${webhook.payment?.pixTransaction ? 'SIM' : 'NÃO'}`);
                  
                  if (webhook.payment?.pixTransaction?.qrCode) {
                    const qrCode = webhook.payment.pixTransaction.qrCode;
                    console.log(`     * QR Code Encoded Image: ${qrCode.encodedImage ? 'SIM' : 'NÃO'}`);
                    console.log(`     * QR Code Payload: ${qrCode.payload ? 'SIM' : 'NÃO'}`);
                  }
                } else {
                  console.log('   - Webhook Response: NÃO');
                }
              } else {
                console.log(`❌ Erro na API de detalhes: ${detailsResponse.status}`);
              }
            } catch (error) {
              console.log('❌ Erro ao chamar API de detalhes:', error.message);
            }
          }
        }
      } else {
        console.log(`❌ Erro ao buscar cobranças: ${paymentsResponse.status}`);
      }
    } catch (error) {
      console.log('❌ Erro ao buscar cobranças:', error.message);
    }
    
    // 4. Verificar configuração do webhook
    console.log('\n4️⃣ VERIFICANDO CONFIGURAÇÃO DO WEBHOOK:');
    console.log(`   - Webhook URL: ${WEBHOOK_URL}`);
    console.log('   - Endpoint local: /api/webhooks/asaas');
    
    // Testar se o webhook endpoint está funcionando
    try {
      const webhookTestResponse = await fetch(`${API_BASE}/api/webhooks/asaas`, {
        method: 'GET'
      });
      
      if (webhookTestResponse.status === 405) {
        console.log('✅ Endpoint webhook está ativo (Method Not Allowed é esperado para GET)');
      } else {
        console.log(`⚠️ Endpoint webhook respondeu com status: ${webhookTestResponse.status}`);
      }
    } catch (error) {
      console.log('❌ Endpoint webhook não está acessível:', error.message);
    }
    
    console.log('\n✅ DEBUG CONCLUÍDO!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('   1. Verificar se o webhook está sendo chamado quando cobrança é criada');
    console.log('   2. Verificar se os dados PIX estão chegando no webhook');
    console.log('   3. Corrigir o processamento do webhook para salvar QR code');
    console.log('   4. Testar criação de nova cobrança');
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }
}

// Executar o debug
debugWebhookQRIssue();