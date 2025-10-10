import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugServiceOrdersTable() {
  console.log('🔍 Debugando tabela service_orders...');
  
  try {
    // Verificar se a tabela existe e tem dados
    const { data: allRecords, error: errorAll } = await supabase
      .from('service_orders')
      .select('*')
      .limit(10);
    
    if (errorAll) {
      console.error('❌ Erro ao acessar service_orders:', errorAll);
      return;
    }
    
    console.log('📊 Total de registros encontrados:', allRecords?.length || 0);
    
    if (allRecords && allRecords.length > 0) {
      console.log('\n✅ Estrutura da tabela service_orders:');
      const firstRecord = allRecords[0];
      Object.keys(firstRecord).forEach(key => {
        console.log(`- ${key}: ${typeof firstRecord[key]}`);
      });
      
      console.log('\n📋 Últimos registros:');
      allRecords.forEach((record, index) => {
        console.log(`\n--- Registro ${index + 1} ---`);
        console.log('ID:', record.id);
        console.log('asaas_payment_id:', record.asaas_payment_id || 'N/A');
        console.log('external_reference:', record.external_reference || 'N/A');
        console.log('qr_code_image:', record.qr_code_image ? 'PRESENTE' : 'AUSENTE');
        console.log('pix_payload:', record.pix_payload ? 'PRESENTE' : 'AUSENTE');
        console.log('invoice_url:', record.invoice_url || 'AUSENTE');
        console.log('status:', record.status || 'N/A');
        console.log('value:', record.value || 'N/A');
        console.log('created_at:', record.created_at);
      });
    } else {
      console.log('⚠️ Nenhum registro encontrado na tabela service_orders');
    }
    
    // Verificar se existe tabela payments (caso ainda exista)
    console.log('\n🔍 Verificando se tabela payments ainda existe...');
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .limit(5);
    
    if (paymentsError) {
      console.log('✅ Tabela payments não existe ou não acessível:', paymentsError.message);
    } else {
      console.log('⚠️ Tabela payments ainda existe com', paymentsData?.length || 0, 'registros');
      if (paymentsData && paymentsData.length > 0) {
        console.log('Estrutura da tabela payments:');
        Object.keys(paymentsData[0]).forEach(key => {
          console.log(`- ${key}: ${typeof paymentsData[0][key]}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugServiceOrdersTable();