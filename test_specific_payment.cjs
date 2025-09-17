const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDYzMTg3NywiZXhwIjoyMDUwMjA3ODc3fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSpecificPayment() {
  console.log('🔍 === TESTANDO COBRANÇA ESPECÍFICA ===');
  console.log('Payment ID: pay_sjrxdyf47n4xe0o3');
  
  try {
    // 1. Buscar na tabela service_orders
    console.log('\n1️⃣ === BUSCANDO EM SERVICE_ORDERS ===');
    const { data: serviceOrders, error: serviceError } = await supabase
      .from('service_orders')
      .select('*')
      .eq('asaas_payment_id', 'pay_sjrxdyf47n4xe0o3');
    
    if (serviceError) {
      console.error('❌ Erro ao buscar em service_orders:', serviceError);
    } else if (serviceOrders && serviceOrders.length > 0) {
      console.log('✅ Encontrado em service_orders:', serviceOrders.length, 'registros');
      serviceOrders.forEach((order, index) => {
        console.log(`\n📋 Registro ${index + 1}:`);
        console.log('  - ID:', order.id);
        console.log('  - Cliente:', order.customer_name);
        console.log('  - Valor:', order.amount);
        console.log('  - Status:', order.status);
        console.log('  - QR Code Image:', order.qr_code_image ? 'PRESENTE (' + order.qr_code_image.length + ' chars)' : 'AUSENTE');
        console.log('  - PIX Payload:', order.pix_payload ? 'PRESENTE (' + order.pix_payload.length + ' chars)' : 'AUSENTE');
        console.log('  - Invoice URL:', order.invoice_url || 'AUSENTE');
        
        if (order.qr_code_image) {
          console.log('  - QR Code começa com:', order.qr_code_image.substring(0, 50) + '...');
          console.log('  - Tem prefixo data:image:', order.qr_code_image.startsWith('data:image/'));
          console.log('  - É Base64 puro:', /^[A-Za-z0-9+/]+=*$/.test(order.qr_code_image));
        }
        
        if (order.webhook_response) {
          console.log('  - Webhook Response: PRESENTE');
          try {
            const webhookData = typeof order.webhook_response === 'string' 
              ? JSON.parse(order.webhook_response) 
              : order.webhook_response;
            console.log('  - Webhook encodedImage:', webhookData.encodedImage ? 'PRESENTE' : 'AUSENTE');
            console.log('  - Webhook payload:', webhookData.payload ? 'PRESENTE' : 'AUSENTE');
          } catch (e) {
            console.log('  - Erro ao parsear webhook_response:', e.message);
          }
        }
      });
    } else {
      console.log('❌ Não encontrado em service_orders');
    }
    
    // 2. Buscar em outras tabelas possíveis
    console.log('\n2️⃣ === BUSCANDO EM OUTRAS TABELAS ===');
    
    // Buscar em payments (se existir)
    try {
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('asaas_payment_id', 'pay_sjrxdyf47n4xe0o3');
      
      if (paymentsError) {
        console.log('⚠️ Tabela payments não existe ou erro:', paymentsError.message);
      } else if (payments && payments.length > 0) {
        console.log('✅ Encontrado em payments:', payments.length, 'registros');
        console.log('  - Dados:', payments[0]);
      } else {
        console.log('❌ Não encontrado em payments');
      }
    } catch (e) {
      console.log('⚠️ Erro ao buscar em payments:', e.message);
    }
    
    // 3. Buscar por qualquer referência ao ID
    console.log('\n3️⃣ === BUSCA GERAL POR ID ===');
    
    // Listar todas as tabelas que podem conter este ID
    const tablesToCheck = ['multas', 'recursos', 'cobrancas', 'asaas_payments'];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .or(`id.eq.pay_sjrxdyf47n4xe0o3,asaas_payment_id.eq.pay_sjrxdyf47n4xe0o3,payment_id.eq.pay_sjrxdyf47n4xe0o3`);
        
        if (error) {
          console.log(`⚠️ Tabela ${table} não existe ou erro:`, error.message);
        } else if (data && data.length > 0) {
          console.log(`✅ Encontrado em ${table}:`, data.length, 'registros');
          console.log('  - Primeiro registro:', data[0]);
        } else {
          console.log(`❌ Não encontrado em ${table}`);
        }
      } catch (e) {
        console.log(`⚠️ Erro ao buscar em ${table}:`, e.message);
      }
    }
    
    console.log('\n🎯 === DIAGNÓSTICO FINAL ===');
    if (serviceOrders && serviceOrders.length > 0) {
      const order = serviceOrders[0];
      if (!order.qr_code_image) {
        console.log('❌ PROBLEMA: Campo qr_code_image está vazio');
        console.log('💡 SOLUÇÃO: Verificar se o webhook enviou o encodedImage corretamente');
      } else if (!order.qr_code_image.startsWith('data:image/')) {
        console.log('⚠️ PROBLEMA: QR Code não tem prefixo data:image/');
        console.log('💡 SOLUÇÃO: Adicionar prefixo "data:image/png;base64," ao QR Code');
        console.log('🔧 COMANDO SQL:');
        console.log(`UPDATE service_orders SET qr_code_image = 'data:image/png;base64,' || qr_code_image WHERE id = '${order.id}';`);
      } else {
        console.log('✅ QR Code parece estar correto');
        console.log('💡 VERIFICAR: Lógica de exibição no frontend');
      }
    } else {
      console.log('❌ PROBLEMA PRINCIPAL: Cobrança não encontrada no banco de dados');
      console.log('💡 POSSÍVEIS CAUSAS:');
      console.log('  1. ID incorreto (pay_sjrxdyf47n4xe0o3)');
      console.log('  2. Cobrança foi criada mas não salva');
      console.log('  3. Problema na API save-service-order');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

testSpecificPayment();