require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkPayment() {
  console.log('🔍 Verificando cobrança pay_1757792481570 no banco...');
  
  const { data, error } = await supabase
    .from('service_orders')
    .select('*')
    .eq('asaas_payment_id', 'pay_1757792481570');
  
  if (error) {
    console.error('❌ Erro ao consultar:', error);
    return;
  }
  
  console.log('📊 Resultado da consulta:');
  console.log('Total de registros encontrados:', data?.length || 0);
  
  if (data && data.length > 0) {
    console.log('✅ Cobrança encontrada no banco:');
    data.forEach((item, index) => {
      console.log(`\n--- Registro ${index + 1} ---`);
      console.log('ID:', item.id);
      console.log('Asaas Payment ID:', item.asaas_payment_id);
      console.log('Cliente:', item.client_name);
      console.log('Valor:', item.value);
      console.log('Status:', item.status);
      console.log('QR Code Image:', item.qr_code_image ? 'Presente' : 'Ausente');
      console.log('PIX Payload:', item.pix_payload ? 'Presente' : 'Ausente');
      console.log('Invoice URL:', item.invoice_url ? 'Presente' : 'Ausente');
      console.log('Description:', item.payment_description ? 'Presente' : 'Ausente');
      console.log('Created At:', item.created_at);
    });
  } else {
    console.log('❌ Cobrança NÃO encontrada no banco!');
    
    // Vamos verificar se existe alguma cobrança recente
    console.log('\n🔍 Verificando últimas 5 cobranças...');
    const { data: recent, error: recentError } = await supabase
      .from('service_orders')
      .select('id, asaas_payment_id, client_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recent && recent.length > 0) {
      console.log('📋 Últimas cobranças no banco:');
      recent.forEach((item, index) => {
        console.log(`${index + 1}. ${item.asaas_payment_id} - ${item.client_name} - ${item.created_at}`);
      });
    }
  }
}

checkPayment().catch(console.error);