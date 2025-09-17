import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simular a função mapServiceOrderToCobranca
function mapServiceOrderToCobranca(multa, clienteNome) {
  console.log('🔄 === MAPEANDO SERVICE_ORDER PARA COBRANCA ===');
  console.log('  - Multa original:', multa);
  console.log('  - QR Code Image:', multa.qr_code_image);
  console.log('  - PIX Payload:', multa.pix_payload);
  console.log('  - PIX QR Code:', multa.pix_qr_code);
  console.log('  - PIX Copy Paste:', multa.pix_copy_paste);
  console.log('  - Invoice URL:', multa.invoice_url);
  
  return {
    id: multa.service_order_id || multa.id,
    asaas_payment_id: multa.service_order_id || multa.id,
    client_id: multa.client_id,
    client_name: clienteNome || 'Cliente não informado',
    customer_name: clienteNome || 'Cliente não informado',
    amount: multa.valor_final || multa.amount || 0,
    status: multa.process_status || multa.status || 'pending',
    payment_method: 'PIX',
    due_date: multa.data_infracao || multa.created_at || new Date().toISOString(),
    created_at: multa.created_at || new Date().toISOString(),
    paid_at: multa.process_status === 'paid' ? multa.updated_at : null,
    description: `Recurso de Multa - ${multa.multa_type?.toUpperCase() || 'GRAVE'} - ${clienteNome || 'Cliente'}`,
    // ✅ CAMPOS PIX CORRIGIDOS - buscar do service_order
    invoice_url: multa.invoice_url,
    bank_slip_url: multa.bank_slip_url,
    pix_code: multa.pix_payload || multa.pix_copy_paste, // Campo principal para copia e cola
    pix_qr_code: multa.pix_qr_code || multa.qr_code_image, // Campo principal para QR code
    qr_code_image: multa.qr_code_image,
    pix_payload: multa.pix_payload, // Dados do PIX para copia e cola
    pix_copy_paste: multa.pix_payload || multa.pix_copy_paste, // Fallback para compatibilidade
    company_id: multa.company_id,
    // Dados adicionais para compatibilidade
    payment_data: multa
  };
}

async function testModalMapping() {
  console.log('🔍 === TESTANDO MAPEAMENTO PARA MODAL ===\n');
  
  try {
    // Buscar um service_order com dados PIX
    const { data: serviceOrders, error } = await supabase
      .from('service_orders')
      .select(`
        *,
        multa:multas(numero_auto, placa_veiculo, descricao_infracao, valor_final, local_infracao)
      `)
      .not('qr_code_image', 'is', null)
      .not('pix_payload', 'is', null)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao buscar service_orders:', error);
      return;
    }
    
    if (serviceOrders && serviceOrders.length > 0) {
      const order = serviceOrders[0];
      console.log('📋 SERVICE_ORDER ENCONTRADO:');
      console.log(`  - ID: ${order.id}`);
      console.log(`  - Status: ${order.status}`);
      console.log(`  - Amount: ${order.amount}`);
      console.log(`  - QR Code Image: ${order.qr_code_image ? 'PRESENTE' : 'AUSENTE'}`);
      console.log(`  - PIX Payload: ${order.pix_payload ? 'PRESENTE' : 'AUSENTE'}`);
      
      // Buscar nome do cliente
      const { data: client } = await supabase
        .from('clients')
        .select('nome')
        .eq('id', order.client_id)
        .single();
      
      const clienteNome = client?.nome || 'Cliente Teste';
      console.log(`  - Cliente: ${clienteNome}`);
      
      // Simular o mapeamento como no ClienteDetalhes.tsx
      const multaFormatada = {
        id: order.id,
        numero_auto: order.multa?.numero_auto || `SO-${order.id.slice(0, 8)}`,
        placa_veiculo: order.multa?.placa_veiculo || 'N/A',
        descricao_infracao: order.multa?.descricao_infracao || `Recurso ${order.multa_type.toUpperCase()}`,
        valor_final: order.multa?.valor_final || order.amount,
        local_infracao: order.multa?.local_infracao || 'Processo Iniciado',
        status: order.status === 'paid' ? 'em_recurso' : 'pendente_pagamento',
        data_infracao: order.created_at,
        client_id: order.client_id,
        company_id: order.company_id,
        is_service_order: true,
        service_order_id: order.id,
        multa_type: order.multa_type,
        process_status: order.status,
        // ✅ INCLUIR TODOS OS CAMPOS PIX DO SERVICE_ORDER
        qr_code_image: order.qr_code_image,
        pix_payload: order.pix_payload,
        pix_qr_code: order.pix_qr_code,
        pix_copy_paste: order.pix_copy_paste,
        invoice_url: order.invoice_url,
        bank_slip_url: order.bank_slip_url,
        amount: order.amount,
        created_at: order.created_at,
        updated_at: order.updated_at
      };
      
      console.log('\n📋 MULTA FORMATADA:');
      console.log('  - QR Code Image:', multaFormatada.qr_code_image ? 'PRESENTE' : 'AUSENTE');
      console.log('  - PIX Payload:', multaFormatada.pix_payload ? 'PRESENTE' : 'AUSENTE');
      
      // Mapear para formato do modal
      const cobrancaData = mapServiceOrderToCobranca(multaFormatada, clienteNome);
      
      console.log('\n📋 DADOS MAPEADOS PARA MODAL:');
      console.log('  - pix_code:', cobrancaData.pix_code ? 'PRESENTE' : 'AUSENTE');
      console.log('  - pix_qr_code:', cobrancaData.pix_qr_code ? 'PRESENTE' : 'AUSENTE');
      console.log('  - qr_code_image:', cobrancaData.qr_code_image ? 'PRESENTE' : 'AUSENTE');
      console.log('  - pix_payload:', cobrancaData.pix_payload ? 'PRESENTE' : 'AUSENTE');
      console.log('  - pix_copy_paste:', cobrancaData.pix_copy_paste ? 'PRESENTE' : 'AUSENTE');
      
      if (cobrancaData.pix_payload) {
        console.log('  - PIX Payload (primeiros 50 chars):', cobrancaData.pix_payload.substring(0, 50) + '...');
      }
      
      // Verificar se o modal deveria mostrar PIX
      const shouldShowPix = cobrancaData.pix_qr_code || cobrancaData.qr_code_image || cobrancaData.pix_code;
      console.log('\n✅ RESULTADO FINAL:');
      console.log('  - Modal deveria mostrar PIX:', shouldShowPix ? 'SIM' : 'NÃO');
      console.log('  - Tem QR Code para exibir:', cobrancaData.qr_code_image ? 'SIM' : 'NÃO');
      console.log('  - Tem código para copiar:', cobrancaData.pix_payload ? 'SIM' : 'NÃO');
      
    } else {
      console.log('⚠️ Nenhum service_order com dados PIX encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o teste
testModalMapping();