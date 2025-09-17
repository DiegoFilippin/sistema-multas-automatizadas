import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkInvoiceUrlInDatabase() {
  console.log('🔍 === VERIFICANDO INVOICE_URL NO BANCO ===\n');
  
  try {
    // 1. Buscar service_orders recentes com invoice_url
    console.log('1️⃣ Buscando service_orders recentes...');
    
    const { data: serviceOrders, error: serviceOrdersError } = await supabase
      .from('service_orders')
      .select(`
        id,
        asaas_payment_id,
        invoice_url,
        qr_code_image,
        pix_payload,
        created_at,
        client:clients(nome)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (serviceOrdersError) {
      console.error('❌ Erro ao buscar service_orders:', serviceOrdersError);
      return;
    }
    
    console.log(`📊 Encontrados ${serviceOrders.length} service_orders recentes:`);
    
    serviceOrders.forEach((order, index) => {
      console.log(`\n${index + 1}. Service Order: ${order.id}`);
      console.log(`   - Asaas Payment ID: ${order.asaas_payment_id}`);
      console.log(`   - Cliente: ${order.client?.nome || 'N/A'}`);
      console.log(`   - Invoice URL: ${order.invoice_url ? '✅ PRESENTE' : '❌ AUSENTE'}`);
      if (order.invoice_url) {
        console.log(`     URL: ${order.invoice_url}`);
      }
      console.log(`   - QR Code: ${order.qr_code_image ? '✅ PRESENTE' : '❌ AUSENTE'}`);
      console.log(`   - PIX Payload: ${order.pix_payload ? '✅ PRESENTE' : '❌ AUSENTE'}`);
      console.log(`   - Criado em: ${new Date(order.created_at).toLocaleString('pt-BR')}`);
    });
    
    // 3. Estatísticas gerais
    console.log('\n3️⃣ Estatísticas gerais...');
    
    const { data: stats, error: statsError } = await supabase
      .from('service_orders')
      .select('invoice_url, qr_code_image, pix_payload')
      .not('invoice_url', 'is', null);
    
    if (statsError) {
      console.error('❌ Erro ao buscar estatísticas:', statsError);
    } else {
      console.log(`📈 Total de service_orders com invoice_url: ${stats.length}`);
    }
    
    // 4. Buscar especificamente por Ana Paula Carvalho Zorzzi
    console.log('\n4️⃣ Buscando service_orders da Ana Paula...');
    
    const { data: anaPaulaOrders, error: anaPaulaError } = await supabase
      .from('service_orders')
      .select(`
        id,
        asaas_payment_id,
        invoice_url,
        qr_code_image,
        pix_payload,
        created_at,
        client:clients(nome, cpf_cnpj)
      `)
      .eq('client.nome', 'ANA PAULA CARVALHO ZORZZI')
      .order('created_at', { ascending: false });
    
    if (anaPaulaError) {
      console.error('❌ Erro ao buscar orders da Ana Paula:', anaPaulaError);
    } else {
      console.log(`👤 Ana Paula - ${anaPaulaOrders.length} service_orders encontradas:`);
      
      anaPaulaOrders.forEach((order, index) => {
        console.log(`\n   ${index + 1}. ${order.asaas_payment_id}`);
        console.log(`      - Invoice URL: ${order.invoice_url ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`      - QR Code: ${order.qr_code_image ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`      - PIX Payload: ${order.pix_payload ? '✅ SIM' : '❌ NÃO'}`);
      });
    }
    
    // 5. Verificar também na tabela asaas_payments
    console.log('\n5️⃣ Verificando tabela asaas_payments...');
    
    const { data: asaasPayments, error: asaasError } = await supabase
      .from('asaas_payments')
      .select('id, asaas_payment_id, invoice_url')
      .not('invoice_url', 'is', null)
      .limit(5);
    
    if (asaasError) {
      console.error('❌ Erro ao buscar asaas_payments:', asaasError);
    } else {
      console.log(`💳 Asaas Payments com invoice_url: ${asaasPayments.length}`);
      asaasPayments.forEach((payment, index) => {
        console.log(`   ${index + 1}. ${payment.asaas_payment_id} - ${payment.invoice_url}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkInvoiceUrlInDatabase().then(() => {
  console.log('\n✅ Verificação concluída!');
}).catch(error => {
  console.error('❌ Erro na execução:', error);
});