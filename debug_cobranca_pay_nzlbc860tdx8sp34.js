import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Definida' : 'Não definida');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Definida' : 'Não definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarCobranca() {
  try {
    console.log('🔍 Verificando dados da cobrança pay_nzlbc860tdx8sp34...');
    
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .eq('asaas_payment_id', 'pay_nzlbc860tdx8sp34');
    
    if (error) {
      console.error('❌ Erro ao buscar dados:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('❌ Nenhum registro encontrado para pay_nzlbc860tdx8sp34');
      console.log('\n🔍 Buscando cobranças recentes para verificar...');
      
      // Buscar cobranças recentes (usando apenas colunas básicas)
      const { data: recentData, error: recentError } = await supabase
        .from('service_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (recentError) {
        console.error('❌ Erro ao buscar cobranças recentes:', recentError);
        return;
      }
      
      console.log('\n📋 Últimas 5 cobranças:');
        recentData?.forEach((record, index) => {
          console.log(`${index + 1}. asaas_payment_id: ${record.asaas_payment_id || 'N/A'}`);
          console.log(`   created_at: ${record.created_at}`);
          console.log(`   status: ${record.status}`);
          console.log(`   payment_method: ${record.payment_method}`);
          console.log(`   pix_qr_code: ${record.pix_qr_code ? 'Preenchido' : 'Vazio'}`);
          console.log(`   qr_code_image: ${record.qr_code_image ? 'Preenchido' : 'Vazio'}`);
          console.log('   ---');
        });
      
      // Buscar por parte do ID
      console.log('\n🔍 Buscando por IDs que contenham "nzlbc860tdx8sp34"...');
      const { data: partialData, error: partialError } = await supabase
        .from('service_orders')
        .select('*')
        .ilike('asaas_payment_id', '%nzlbc860tdx8sp34%');
      
      if (partialError) {
        console.error('❌ Erro na busca parcial:', partialError);
      } else if (partialData && partialData.length > 0) {
        console.log('✅ Encontrado com busca parcial:', partialData.length, 'registros');
        partialData.forEach(record => {
          console.log('ID encontrado:', record.asaas_payment_id);
        });
      } else {
        console.log('❌ Nenhum registro encontrado com busca parcial');
      }
      
      return;
    }
    
    console.log('✅ Dados encontrados:');
    console.log('📊 Número de registros:', data.length);
    
    data.forEach((record, index) => {
      console.log(`\n--- Registro ${index + 1} ---`);
      console.log('ID:', record.id);
      console.log('asaas_payment_id:', record.asaas_payment_id);
      console.log('status:', record.status);
      console.log('value:', record.value);
      console.log('payment_method:', record.payment_method);
      
      // Verificar campos PIX
      console.log('\n🔍 Campos PIX:');
      console.log('pix_qr_code:', record.pix_qr_code ? `Preenchido (${record.pix_qr_code.length} chars)` : 'Vazio');
      console.log('qr_code_image:', record.qr_code_image ? `Preenchido (${record.qr_code_image.length} chars)` : 'Vazio');
      console.log('pix_payload:', record.pix_payload ? `Preenchido (${record.pix_payload.length} chars)` : 'Vazio');
      console.log('pix_copy_paste:', record.pix_copy_paste ? `Preenchido (${record.pix_copy_paste.length} chars)` : 'Vazio');
      console.log('invoice_url:', record.invoice_url || 'Vazio');
      
      // Mostrar primeiros caracteres dos campos PIX se preenchidos
      if (record.pix_qr_code) {
        console.log('pix_qr_code (primeiros 50 chars):', record.pix_qr_code.substring(0, 50) + '...');
      }
      if (record.qr_code_image) {
        console.log('qr_code_image (primeiros 50 chars):', record.qr_code_image.substring(0, 50) + '...');
      }
      if (record.pix_payload) {
        console.log('pix_payload (primeiros 50 chars):', record.pix_payload.substring(0, 50) + '...');
      }
    });
    
  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

verificarCobranca();