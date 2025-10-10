import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Usar service_role key
const supabase = createClient(
  'https://ktgynzdzvfcpvbdbtplu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA',
  {
    auth: {
      persistSession: false
    }
  }
);

async function verifyCobrancaFinal() {
  console.log('🔍 Verificação final da cobrança pay_hs8lhhu2kj18m80d...');
  
  try {
    // Buscar todos os registros com esse asaas_payment_id
    const { data: allRecords, error: allError } = await supabase
      .from('service_orders')
      .select('*')
      .eq('asaas_payment_id', 'pay_hs8lhhu2kj18m80d')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('❌ Erro ao buscar registros:', allError);
      return;
    }
    
    console.log('📊 Total de registros encontrados:', allRecords?.length || 0);
    
    if (allRecords && allRecords.length > 0) {
      allRecords.forEach((record, index) => {
        console.log(`\n--- Registro ${index + 1} ---`);
        console.log('ID:', record.id);
        console.log('Asaas Payment ID:', record.asaas_payment_id);
        console.log('QR Code Image:', record.qr_code_image ? 'PRESENTE (' + record.qr_code_image.length + ' chars)' : 'AUSENTE');
        console.log('PIX Payload:', record.pix_payload ? 'PRESENTE (' + record.pix_payload.length + ' chars)' : 'AUSENTE');
        console.log('Invoice URL:', record.invoice_url || 'AUSENTE');
        console.log('Amount:', record.amount);
        console.log('Status:', record.status);
        console.log('Created At:', record.created_at);
        
        if (record.qr_code_image) {
          console.log('QR Code (início):', record.qr_code_image.substring(0, 50) + '...');
        }
        
        if (record.pix_payload) {
          console.log('PIX Payload (início):', record.pix_payload.substring(0, 50) + '...');
        }
      });
      
      // Pegar o registro mais recente (primeiro da lista ordenada)
      const latestRecord = allRecords[0];
      
      console.log('\n🎯 RESULTADO FINAL:');
      console.log('✅ Cobrança pay_hs8lhhu2kj18m80d foi salva com sucesso!');
      console.log('✅ QR Code está presente:', !!latestRecord.qr_code_image);
      console.log('✅ PIX Payload está presente:', !!latestRecord.pix_payload);
      console.log('✅ Invoice URL está presente:', !!latestRecord.invoice_url);
      
      // Testar a API que o modal usa
      console.log('\n🧪 Testando API do modal...');
      
      try {
        const response = await fetch(`http://localhost:3001/api/payments/${latestRecord.asaas_payment_id}`);
        const apiResult = await response.json();
        
        console.log('📤 Resposta da API:', {
          success: apiResult.success,
          has_qr_code: !!apiResult.payment?.qr_code_image,
          has_pix_payload: !!apiResult.payment?.pix_payload,
          payment_id: apiResult.payment?.asaas_payment_id
        });
        
        if (apiResult.success && apiResult.payment?.qr_code_image) {
          console.log('🎉 SUCESSO! A API retorna os dados PIX corretamente!');
          console.log('🎯 O modal deve mostrar o QR code agora!');
        } else {
          console.log('⚠️ A API não está retornando os dados PIX...');
        }
        
      } catch (apiError) {
        console.error('❌ Erro ao testar API:', apiError.message);
        console.log('💡 Certifique-se de que o proxy-server está rodando na porta 3001');
      }
      
    } else {
      console.log('❌ Nenhum registro encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

verifyCobrancaFinal();