import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';
const supabase = createClient(supabaseUrl, supabaseKey);

// Dados de teste para criar uma cobrança
const testPaymentData = {
  service_id: '31a8b93e-d459-40f4-8a3f-74137c910675', // ID do serviço "Recurso de Multa - Grave"
  customer_id: '8fdb2182-d7a4-4cdb-9c76-323c1d0c9376', // ID do cliente "DIEGO DA SILVA FILIPPIN"
  company_id: 'c1f4c95f-1f16-4680-b568-aefc43390564', // ID da empresa ICETRAN
  valor_cobranca: 85.00 // Valor acima do mínimo
};

async function testWebhookFieldsFix() {
  try {
    console.log('🧪 Testando correção dos campos do webhook...');
    console.log('📋 Dados da requisição:', testPaymentData);
    
    // Fazer requisição para criar cobrança
    const response = await fetch('http://localhost:3001/api/payments/create-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPaymentData)
    });
    
    const result = await response.json();
    console.log('📤 Resposta da API:', JSON.stringify(result, null, 2));
    
    if (result.success && result.payment?.id) {
      const serviceOrderId = result.payment.id;
      console.log(`✅ Cobrança criada com ID: ${serviceOrderId}`);
      
      // Aguardar um pouco para garantir que foi salvo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar se os campos foram salvos corretamente
      console.log('🔍 Verificando campos salvos no banco...');
      const { data: serviceOrder, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          qr_code_image,
          pix_payload,
          invoice_url,
          invoice_number,
          payment_description,
          billing_type,
          webhook_response,
          notes
        `)
        .eq('id', serviceOrderId)
        .single();
      
      if (error) {
        console.error('❌ Erro ao buscar service_order:', error);
        return;
      }
      
      console.log('📊 RESULTADO DA VERIFICAÇÃO:');
      console.log('================================');
      console.log('🆔 ID:', serviceOrder.id);
      console.log('🖼️  QR Code Image:', serviceOrder.qr_code_image ? '✅ SALVO' : '❌ VAZIO');
      console.log('📋 PIX Payload:', serviceOrder.pix_payload ? '✅ SALVO' : '❌ VAZIO');
      console.log('🔗 Invoice URL:', serviceOrder.invoice_url ? '✅ SALVO' : '❌ VAZIO');
      console.log('📄 Invoice Number:', serviceOrder.invoice_number ? '✅ SALVO' : '❌ VAZIO');
      console.log('📝 Description:', serviceOrder.payment_description ? '✅ SALVO' : '❌ VAZIO');
      console.log('💳 Billing Type:', serviceOrder.billing_type ? '✅ SALVO' : '❌ VAZIO');
      console.log('🔄 Webhook Response:', serviceOrder.webhook_response ? '✅ SALVO' : '❌ VAZIO');
      console.log('📝 Notes:', serviceOrder.notes ? '✅ SALVO' : '❌ VAZIO');
      
      if (serviceOrder.qr_code_image && serviceOrder.pix_payload && serviceOrder.invoice_url) {
        console.log('\n🎉 SUCESSO! Todos os campos importantes foram salvos!');
        console.log('\n📋 Detalhes dos campos:');
        console.log('- QR Code Image (primeiros 50 chars):', serviceOrder.qr_code_image?.substring(0, 50) + '...');
        console.log('- PIX Payload (primeiros 50 chars):', serviceOrder.pix_payload?.substring(0, 50) + '...');
        console.log('- Invoice URL:', serviceOrder.invoice_url);
        console.log('- Payment Description:', serviceOrder.payment_description);
      } else {
        console.log('\n❌ PROBLEMA! Alguns campos importantes estão vazios.');
        console.log('\n🔍 Verificando campo notes para debug:');
        if (serviceOrder.notes) {
          try {
            const notesData = JSON.parse(serviceOrder.notes);
            console.log('Notes parsed:', JSON.stringify(notesData, null, 2));
          } catch (e) {
            console.log('Erro ao parsear notes:', e.message);
          }
        }
      }
      
    } else {
      console.error('❌ Falha ao criar cobrança:', result);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
}

// Executar teste
testWebhookFieldsFix();