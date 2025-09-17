import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMissingInvoiceUrls() {
  console.log('🔧 === CORRIGINDO INVOICE_URLs FALTANTES ===\n');
  
  try {
    // 1. Buscar service_orders sem invoice_url
    console.log('1️⃣ Buscando service_orders sem invoice_url...');
    
    const { data: serviceOrdersWithoutUrl, error: searchError } = await supabase
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
      .is('invoice_url', null)
      .not('asaas_payment_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (searchError) {
      console.error('❌ Erro ao buscar service_orders:', searchError);
      return;
    }
    
    console.log(`📊 Encontrados ${serviceOrdersWithoutUrl.length} service_orders sem invoice_url`);
    
    if (serviceOrdersWithoutUrl.length === 0) {
      console.log('✅ Todos os service_orders já têm invoice_url!');
      return;
    }
    
    // 2. Para cada service_order, gerar uma invoice_url baseada no padrão do Asaas
    console.log('\n2️⃣ Gerando invoice_urls...');
    
    const updates = [];
    
    for (const order of serviceOrdersWithoutUrl) {
      // Gerar URL da fatura baseada no padrão do Asaas Sandbox
      const invoiceUrl = `https://sandbox.asaas.com/i/${order.asaas_payment_id}`;
      
      console.log(`\n📋 Service Order: ${order.id}`);
      console.log(`   - Asaas Payment ID: ${order.asaas_payment_id}`);
      console.log(`   - Cliente: ${order.client?.nome || 'N/A'}`);
      console.log(`   - Nova Invoice URL: ${invoiceUrl}`);
      
      updates.push({
        id: order.id,
        invoice_url: invoiceUrl
      });
    }
    
    // 3. Atualizar em lotes
    console.log('\n3️⃣ Atualizando service_orders...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({ invoice_url: update.invoice_url })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`❌ Erro ao atualizar ${update.id}:`, updateError);
        errorCount++;
      } else {
        console.log(`✅ Atualizado: ${update.id}`);
        successCount++;
      }
    }
    
    console.log('\n📊 Resultado da correção:');
    console.log(`   - Sucessos: ${successCount}`);
    console.log(`   - Erros: ${errorCount}`);
    
    // 4. Verificar se as atualizações foram aplicadas
    console.log('\n4️⃣ Verificando atualizações...');
    
    const { data: updatedOrders, error: verifyError } = await supabase
      .from('service_orders')
      .select('id, asaas_payment_id, invoice_url')
      .in('id', updates.map(u => u.id));
    
    if (verifyError) {
      console.error('❌ Erro ao verificar atualizações:', verifyError);
    } else {
      console.log('✅ Verificação das atualizações:');
      updatedOrders.forEach(order => {
        console.log(`   - ${order.asaas_payment_id}: ${order.invoice_url ? '✅ OK' : '❌ FALHOU'}`);
      });
    }
    
    // 5. Testar especificamente a Ana Paula
    console.log('\n5️⃣ Verificando service_orders da Ana Paula...');
    
    const { data: anaPaulaOrders, error: anaPaulaError } = await supabase
      .from('service_orders')
      .select(`
        id,
        asaas_payment_id,
        invoice_url,
        qr_code_image,
        pix_payload,
        client:clients(nome)
      `)
      .eq('client.nome', 'ANA PAULA CARVALHO ZORZZI')
      .order('created_at', { ascending: false });
    
    if (anaPaulaError) {
      console.error('❌ Erro ao buscar Ana Paula:', anaPaulaError);
    } else {
      console.log(`👤 Ana Paula - ${anaPaulaOrders.length} service_orders:`);
      anaPaulaOrders.forEach((order, index) => {
        console.log(`\n   ${index + 1}. ${order.asaas_payment_id}`);
        console.log(`      - Invoice URL: ${order.invoice_url ? '✅ PRESENTE' : '❌ AUSENTE'}`);
        if (order.invoice_url) {
          console.log(`        URL: ${order.invoice_url}`);
        }
        console.log(`      - QR Code: ${order.qr_code_image ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`      - PIX Payload: ${order.pix_payload ? '✅ SIM' : '❌ NÃO'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar correção
fixMissingInvoiceUrls().then(() => {
  console.log('\n✅ Correção concluída!');
  console.log('\n📝 Próximos passos:');
  console.log('   1. Teste o modal de cobrança da Ana Paula');
  console.log('   2. Verifique se o botão "Ver Fatura" aparece junto com o QR Code');
  console.log('   3. Confirme se o link da fatura funciona corretamente');
}).catch(error => {
  console.error('❌ Erro na execução:', error);
});