import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigatePixData() {
  console.log('🔍 Investigando dados PIX para cobrança pay_nzlbc860tdx8sp34...');
  
  try {
    // Primeiro, vamos listar todas as cobranças para ver quais IDs existem
    console.log('\n📋 Listando todas as cobranças disponíveis:');
    const { data: allOrders, error: allError } = await supabase
      .from('service_orders')
      .select('id, asaas_payment_id, status, billing_type, payment_method, company_id')
      .eq('company_id', '7d573ce0-125d-46bf-9e37-33d0c6074cf9')
      .limit(20);

    if (allError) {
      console.error('❌ Erro ao listar cobranças:', allError);
      return;
    }

    console.log('✅ Cobranças encontradas:', allOrders?.length || 0);
    if (allOrders && allOrders.length > 0) {
      allOrders.forEach(order => {
        console.log(`- ID: ${order.id}, Asaas ID: ${order.asaas_payment_id}, Status: ${order.status}, Billing: ${order.billing_type}`);
      });
    } else {
      console.log('❌ Nenhuma cobrança encontrada para company_id: 7d573ce0-125d-46bf-9e37-33d0c6074cf9');
      
      // Tentar buscar sem filtro de company_id
      console.log('\n🔍 Tentando buscar sem filtro de company_id...');
      const { data: allOrdersNoFilter, error: noFilterError } = await supabase
        .from('service_orders')
        .select('id, asaas_payment_id, status, billing_type, payment_method, company_id')
        .limit(5);
        
      if (noFilterError) {
        console.error('❌ Erro ao buscar sem filtro:', noFilterError);
      } else {
        console.log('✅ Cobranças sem filtro:', allOrdersNoFilter?.length || 0);
        allOrdersNoFilter?.forEach(order => {
          console.log(`- ID: ${order.id}, Company: ${order.company_id}, Asaas ID: ${order.asaas_payment_id}`);
        });
      }
    }

    // Buscar dados na tabela service_orders
    const { data: serviceOrder, error: serviceError } = await supabase
      .from('service_orders')
      .select('*')
      .eq('asaas_payment_id', 'pay_nzlbc860tdx8sp34')
      .maybeSingle();

    if (serviceError) {
      console.error('❌ Erro ao buscar service_order:', serviceError);
      return;
    }

    if (!serviceOrder) {
      console.log('❌ Nenhuma service_order encontrada para pay_nzlbc860tdx8sp34');
      return;
    }

    console.log('✅ Service Order encontrada:');
    console.log('ID:', serviceOrder.id);
    console.log('Company ID:', serviceOrder.company_id);
    console.log('Status:', serviceOrder.status);
    console.log('Billing Type:', serviceOrder.billing_type);
    console.log('Payment Method:', serviceOrder.payment_method);
    console.log('\n📊 Campos PIX disponíveis:');
    
    // Verificar todos os possíveis campos PIX
    const pixFields = [
      'pix_qr_code',
      'qr_code_image', 
      'pix_payload',
      'pix_copy_paste',
      'encodedImage',
      'pix_qr_code_image',
      'qr_code',
      'pixCopyPaste'
    ];

    pixFields.forEach(field => {
      const value = serviceOrder[field];
      if (value) {
        console.log(`✅ ${field}:`, typeof value, value.length > 100 ? `${value.substring(0, 100)}...` : value);
      } else {
        console.log(`❌ ${field}: null/undefined`);
      }
    });

    // Mostrar todos os campos do objeto
    console.log('\n🔍 Todos os campos disponíveis:');
    Object.keys(serviceOrder).forEach(key => {
      if (key.toLowerCase().includes('pix') || key.toLowerCase().includes('qr')) {
        console.log(`🔑 ${key}:`, serviceOrder[key] ? 'HAS_DATA' : 'NULL');
      }
    });

    // Buscar também na tabela payments se existir
    console.log('\n🔍 Verificando tabela payments...');
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('asaas_payment_id', 'pay_nzlbc860tdx8sp34')
      .single();

    if (payment) {
      console.log('✅ Payment encontrado na tabela payments:');
      pixFields.forEach(field => {
        const value = payment[field];
        if (value) {
          console.log(`✅ payments.${field}:`, typeof value, value.length > 100 ? `${value.substring(0, 100)}...` : value);
        }
      });
    } else {
      console.log('❌ Nenhum payment encontrado na tabela payments');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar investigação
investigatePixData();