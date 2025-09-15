require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCobranca() {
  console.log('🔍 Verificando cobrança pay_kxq6p35gavzescuz...');
  
  const { data, error } = await supabase
    .from('service_orders')
    .select('asaas_payment_id, qr_code_image, company_id')
    .eq('asaas_payment_id', 'pay_kxq6p35gavzescuz');
  
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  if (data.length === 0) {
    console.log('❌ Cobrança pay_kxq6p35gavzescuz não encontrada');
    
    // Verificar se existe alguma cobrança com ID similar
    const { data: similar } = await supabase
      .from('service_orders')
      .select('asaas_payment_id')
      .ilike('asaas_payment_id', '%kxq%');
    
    console.log('🔍 Cobranças com "kxq" no ID:', similar?.map(s => s.asaas_payment_id) || []);
  } else {
    console.log('✅ Cobrança encontrada:', {
      asaas_payment_id: data[0].asaas_payment_id,
      has_qr_code_image: !!data[0].qr_code_image,
      qr_code_length: data[0].qr_code_image?.length || 0,
      company_id: data[0].company_id
    });
  }
}

checkCobranca();