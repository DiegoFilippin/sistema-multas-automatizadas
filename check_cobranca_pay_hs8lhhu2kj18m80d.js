import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkCobrancaData() {
  console.log('🔍 Verificando dados da cobrança pay_hs8lhhu2kj18m80d...');
  
  try {
    // Buscar por asaas_payment_id
    const { data: byAsaasId, error: errorAsaas } = await supabase
      .from('service_orders')
      .select('*')
      .eq('asaas_payment_id', 'pay_hs8lhhu2kj18m80d');
    
    if (errorAsaas) {
      console.error('❌ Erro ao buscar por asaas_payment_id:', errorAsaas);
    } else {
      console.log('📊 Resultado busca por asaas_payment_id:', byAsaasId?.length || 0, 'registros');
      if (byAsaasId && byAsaasId.length > 0) {
        console.log('✅ Dados encontrados por asaas_payment_id:');
        byAsaasId.forEach((record, index) => {
          console.log(`\n--- Registro ${index + 1} ---`);
          console.log('ID:', record.id);
          console.log('asaas_payment_id:', record.asaas_payment_id);
          console.log('qr_code_image:', record.qr_code_image ? 'PRESENTE' : 'AUSENTE');
          console.log('pix_payload:', record.pix_payload ? 'PRESENTE' : 'AUSENTE');
          console.log('invoice_url:', record.invoice_url || 'AUSENTE');
          console.log('status:', record.status);
          console.log('value:', record.value);
          console.log('billing_type:', record.billing_type);
          console.log('created_at:', record.created_at);
          
          if (record.qr_code_image) {
            console.log('QR Code Image (primeiros 100 chars):', record.qr_code_image.substring(0, 100) + '...');
          }
          if (record.pix_payload) {
            console.log('PIX Payload (primeiros 100 chars):', record.pix_payload.substring(0, 100) + '...');
          }
        });
      }
    }
    
    // Buscar por external_reference (UUID da cobrança)
    const { data: byExtRef, error: errorExtRef } = await supabase
      .from('service_orders')
      .select('*')
      .eq('external_reference', '7d573ce0-125d-46bf-9e37-33d0c6074cf9');
    
    if (errorExtRef) {
      console.error('❌ Erro ao buscar por external_reference:', errorExtRef);
    } else {
      console.log('\n📊 Resultado busca por external_reference:', byExtRef?.length || 0, 'registros');
      if (byExtRef && byExtRef.length > 0) {
        console.log('✅ Dados encontrados por external_reference:');
        byExtRef.forEach((record, index) => {
          console.log(`\n--- Registro ${index + 1} ---`);
          console.log('ID:', record.id);
          console.log('asaas_payment_id:', record.asaas_payment_id);
          console.log('external_reference:', record.external_reference);
          console.log('qr_code_image:', record.qr_code_image ? 'PRESENTE' : 'AUSENTE');
          console.log('pix_payload:', record.pix_payload ? 'PRESENTE' : 'AUSENTE');
          console.log('invoice_url:', record.invoice_url || 'AUSENTE');
        });
      }
    }
    
    // Buscar registros recentes (últimas 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recent, error: errorRecent } = await supabase
      .from('service_orders')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });
    
    if (errorRecent) {
      console.error('❌ Erro ao buscar registros recentes:', errorRecent);
    } else {
      console.log('\n📊 Registros recentes (últimas 24h):', recent?.length || 0);
      if (recent && recent.length > 0) {
        console.log('\n🕐 Últimos registros criados:');
        recent.slice(0, 5).forEach((record, index) => {
          console.log(`${index + 1}. ID: ${record.id} | asaas_payment_id: ${record.asaas_payment_id || 'N/A'} | created_at: ${record.created_at}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkCobrancaData();