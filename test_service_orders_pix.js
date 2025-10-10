import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testServiceOrdersPix() {
  console.log('🔍 === TESTANDO DADOS PIX DOS SERVICE_ORDERS ===\n');
  
  try {
    // 1. Buscar service_orders com dados PIX
    console.log('1️⃣ BUSCANDO SERVICE_ORDERS COM DADOS PIX:');
    
    const { data: serviceOrders, error } = await supabase
      .from('service_orders')
      .select(`
        id,
        client_id,
        amount,
        status,
        qr_code_image,
        pix_payload,
        pix_qr_code,
        pix_copy_paste,
        invoice_url,
        created_at
      `)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Erro ao buscar service_orders:', error);
      return;
    }
    
    console.log(`📊 Encontrados ${serviceOrders?.length || 0} service_orders`);
    
    if (serviceOrders && serviceOrders.length > 0) {
      serviceOrders.forEach((order, index) => {
        console.log(`\n📋 SERVICE_ORDER ${index + 1}:`);
        console.log(`  - ID: ${order.id}`);
        console.log(`  - Client ID: ${order.client_id}`);
        console.log(`  - Amount: ${order.amount}`);
        console.log(`  - Status: ${order.status}`);
        console.log(`  - QR Code Image: ${order.qr_code_image ? 'SIM' : 'NÃO'}`);
        console.log(`  - PIX Payload: ${order.pix_payload ? 'SIM' : 'NÃO'}`);
        console.log(`  - PIX QR Code: ${order.pix_qr_code ? 'SIM' : 'NÃO'}`);
        console.log(`  - PIX Copy Paste: ${order.pix_copy_paste ? 'SIM' : 'NÃO'}`);
        console.log(`  - Invoice URL: ${order.invoice_url ? 'SIM' : 'NÃO'}`);
        
        if (order.pix_payload) {
          console.log(`  - PIX Payload (primeiros 50 chars): ${order.pix_payload.substring(0, 50)}...`);
        }
        if (order.qr_code_image) {
          console.log(`  - QR Code Image (primeiros 50 chars): ${order.qr_code_image.substring(0, 50)}...`);
        }
      });
    } else {
      console.log('⚠️ Nenhum service_order encontrado');
    }
    
    // 2. Testar a query exata usada no ClienteDetalhes.tsx
    console.log('\n2️⃣ TESTANDO QUERY EXATA DO CLIENTEDETALHES.TSX:');
    
    // Buscar um cliente da F&Z CONSULTORIA
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .ilike('nome', '%F&Z%CONSULTORIA%')
      .single();
    
    if (company) {
      console.log(`🏢 Empresa F&Z encontrada: ${company.id}`);
      
      // Buscar clientes da empresa
      const { data: clients } = await supabase
        .from('clients')
        .select('id, nome')
        .eq('company_id', company.id)
        .limit(1);
      
      if (clients && clients.length > 0) {
        const clientId = clients[0].id;
        console.log(`👤 Cliente encontrado: ${clients[0].nome} (${clientId})`);
        
        // Executar a query exata do ClienteDetalhes.tsx
        const { data: serviceOrdersQuery, error: serviceOrdersError } = await supabase
          .from('service_orders')
          .select(`
            *,
            multa:multas(numero_auto, placa_veiculo, descricao_infracao, valor_final, local_infracao)
          `)
          .eq('client_id', clientId)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false });
        
        if (serviceOrdersError) {
          console.error('❌ Erro na query:', serviceOrdersError);
        } else {
          console.log(`📊 Query retornou ${serviceOrdersQuery?.length || 0} service_orders`);
          
          if (serviceOrdersQuery && serviceOrdersQuery.length > 0) {
            serviceOrdersQuery.forEach((order, index) => {
              console.log(`\n📋 RESULTADO QUERY ${index + 1}:`);
              console.log(`  - ID: ${order.id}`);
              console.log(`  - Status: ${order.status}`);
              console.log(`  - Amount: ${order.amount}`);
              console.log(`  - QR Code Image: ${order.qr_code_image ? 'PRESENTE' : 'AUSENTE'}`);
              console.log(`  - PIX Payload: ${order.pix_payload ? 'PRESENTE' : 'AUSENTE'}`);
              console.log(`  - PIX QR Code: ${order.pix_qr_code ? 'PRESENTE' : 'AUSENTE'}`);
              console.log(`  - PIX Copy Paste: ${order.pix_copy_paste ? 'PRESENTE' : 'AUSENTE'}`);
              console.log(`  - Invoice URL: ${order.invoice_url ? 'PRESENTE' : 'AUSENTE'}`);
            });
          } else {
            console.log('⚠️ Nenhum service_order encontrado para este cliente');
          }
        }
      } else {
        console.log('⚠️ Nenhum cliente encontrado na empresa F&Z');
      }
    } else {
      console.log('⚠️ Empresa F&Z CONSULTORIA não encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o teste
testServiceOrdersPix();