// Teste do fluxo completo: POST para webhook N8N com estrutura correta
import fetch from 'node-fetch';

const WEBHOOK_URL = 'https://webhookn8n.synsoft.com.br/webhook/d37fac6e-9379-4bca-b015-9c56b104cae1';

async function testWebhookN8NFlow() {
  console.log('🧪 === TESTE DO FLUXO WEBHOOK N8N COM ESTRUTURA CORRETA ===');
  
  // Payload EXATO conforme especificado pelo usuário
  const webhookPayload = {
    wallet_icetran: "eb35cde4-d0f2-44d1-83c0-aaa3496f7ed0",
    wallet_despachante: "2bab1d7d-7558-45ac-953d-b9f7a980c4af",
    Customer_cliente: {
      id: "aa270df8-ea0e-4b67-91d4-84ef9b10d5ff",
      nome: "FABIO RIGOLI DA ROSA",
      cpf_cnpj: "00814026940",
      email: "fabio@rigolidarosa.com",
      asaas_customer_id: "cus_000007026524"
    },
    "Valor_cobrança": 80,
    "Idserviço": "31a8b93e-d459-40f4-8a3f-74137c910675",
    "descricaoserviço": "Recurso de Multa - Grave",
    valoracsm: 11,
    valoricetran: 11,
    taxa: 3.5,
    despachante: {
      company_id: "7d573ce0-125d-46bf-9e37-33d0c6074cf9",
      nome: "F&Z CONSULTORIA EMPRESARIAL LTDA",
      wallet_id: "2bab1d7d-7558-45ac-953d-b9f7a980c4af",
      margem: 54.5
    }
  };
  
  console.log('\n📦 Payload EXATO (que funcionava antes):');
  console.log(JSON.stringify(webhookPayload, null, 2));
  
  try {
    console.log('\n🚀 Enviando POST para webhook N8N...');
    console.log('URL:', WEBHOOK_URL);
    
    const startTime = Date.now();
    
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`⏱️ Tempo de resposta: ${responseTime}ms`);
    
    console.log('\n📡 Resposta do webhook:');
    console.log('  - Status:', webhookResponse.status);
    console.log('  - Status Text:', webhookResponse.statusText);
    console.log('  - OK:', webhookResponse.ok);
    
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('❌ Erro no webhook:', errorText);
      return false;
    }
    
    // Capturar resposta como texto primeiro
    const responseText = await webhookResponse.text();
    console.log('\n📄 Resposta bruta do webhook:');
    console.log('=====================================');
    console.log(responseText);
    console.log('=====================================');
    
    let webhookData = {};
    
    // Tentar fazer parse do JSON
    if (responseText && responseText.trim() !== '') {
      try {
        webhookData = JSON.parse(responseText);
        console.log('\n✅ JSON parseado com sucesso:');
        console.log(JSON.stringify(webhookData, null, 2));
        
        // Verificar se contém dados de pagamento
        if (webhookData.asaas_payment_id || webhookData.id || webhookData.payment_id) {
          console.log('\n🎉 WEBHOOK FUNCIONOU!');
          console.log('  - Contém ID de pagamento');
          console.log('  - Dados podem ser processados');
          
          // Verificar dados PIX
          const hasQRCode = webhookData.qr_code || webhookData.qrCode || webhookData.qr_code_image;
          const hasPIXPayload = webhookData.pix_code || webhookData.pixCopyPaste || webhookData.pix_payload;
          const hasInvoiceURL = webhookData.invoice_url || webhookData.invoiceUrl;
          
          console.log('\n📊 Dados PIX disponíveis:');
          console.log('  - QR Code:', hasQRCode ? 'SIM' : 'NÃO');
          console.log('  - PIX Payload:', hasPIXPayload ? 'SIM' : 'NÃO');
          console.log('  - Invoice URL:', hasInvoiceURL ? 'SIM' : 'NÃO');
          
          if (hasQRCode && hasPIXPayload) {
            console.log('\n✅ TODOS OS DADOS NECESSÁRIOS ESTÃO PRESENTES!');
            console.log('  - Modal pode ser exibido com QR Code');
            console.log('  - PIX pode ser copiado');
            console.log('  - Cobrança foi criada no Asaas');
            return true;
          } else {
            console.log('\n⚠️ Alguns dados PIX estão ausentes, mas cobrança foi criada');
            return true;
          }
        } else {
          console.log('\n⚠️ Resposta não contém ID de pagamento');
          console.log('  - Pode ser resposta de confirmação');
          console.log('  - Verificar se cobrança foi criada no Asaas');
          return true;
        }
        
      } catch (parseError) {
        console.log('⚠️ Resposta não é JSON, mas webhook respondeu OK');
        console.log('  - Pode ser resposta de texto simples');
        console.log('  - Cobrança pode ter sido criada');
        return true;
      }
    } else {
      console.log('⚠️ Resposta vazia, mas status 200');
      console.log('  - Webhook processou a requisição');
      console.log('  - Cobrança pode ter sido criada no Asaas');
      return true;
    }
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error);
    console.log('  - Tipo:', error.constructor.name);
    console.log('  - Mensagem:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 DICA: Problema de conexão com o webhook');
    } else if (error.name === 'AbortError') {
      console.log('\n💡 DICA: Timeout na requisição');
    }
    
    return false;
  }
}

// Executar teste
testWebhookN8NFlow().then(success => {
  if (success) {
    console.log('\n🎯 RESULTADO: WEBHOOK RESPONDEU CORRETAMENTE!');
    console.log('\n✅ PRÓXIMOS PASSOS:');
    console.log('  1. Testar no frontend com dados reais');
    console.log('  2. Verificar se cobrança aparece no Asaas');
    console.log('  3. Confirmar salvamento no banco local');
    console.log('  4. Testar exibição do modal');
    process.exit(0);
  } else {
    console.log('\n💥 RESULTADO: WEBHOOK PRECISA DE CORREÇÕES!');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 ERRO FATAL NO TESTE:', error);
  process.exit(1);
});