import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQRCodeFix() {
  console.log('🧪 Testando correção do QR Code...');
  
  try {
    // Buscar uma cobrança recente para testar
    const { data: serviceOrders, error } = await supabase
      .from('service_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Erro ao buscar service orders:', error);
      return;
    }
    
    console.log(`\n📋 Encontradas ${serviceOrders.length} cobranças recentes:`);
    
    serviceOrders.forEach((order, index) => {
      console.log(`\n🔍 Cobrança ${index + 1}:`);
      console.log('  📄 ID:', order.id);
      console.log('  💰 Valor:', order.amount);
      console.log('  📅 Criada em:', order.created_at);
      console.log('  🏷️ Payment ID:', order.asaas_payment_id);
      
      // Verificar QR Code
      if (order.qr_code_image) {
        const qrCodeLength = order.qr_code_image.length;
        console.log('  🖼️ QR Code Image:', qrCodeLength > 100 ? '✅ REAL (tamanho: ' + qrCodeLength + ')' : '❌ FAKE (tamanho: ' + qrCodeLength + ')');
        
        // Verificar se é o QR code fake antigo
        const fakeQRCode = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        if (order.qr_code_image === fakeQRCode) {
          console.log('  ⚠️ Este é o QR code fake antigo!');
        } else if (qrCodeLength > 1000) {
          console.log('  🎉 QR code real detectado!');
          console.log('  📏 Primeiros 50 chars:', order.qr_code_image.substring(0, 50) + '...');
        }
      } else {
        console.log('  🖼️ QR Code Image: ❌ VAZIO');
      }
      
      // Verificar PIX payload
      if (order.pix_payload) {
        console.log('  💳 PIX Payload:', order.pix_payload.length > 50 ? '✅ PRESENTE' : '❌ CURTO');
        console.log('  📝 Payload:', order.pix_payload.substring(0, 50) + '...');
      } else {
        console.log('  💳 PIX Payload: ❌ VAZIO');
      }
      
      // Verificar Invoice URL
      if (order.invoice_url) {
        console.log('  🧾 Invoice URL: ✅', order.invoice_url);
      } else {
        console.log('  🧾 Invoice URL: ❌ VAZIO');
      }
      
      // Verificar descrição
      if (order.payment_description) {
        console.log('  📝 Descrição: ✅', order.payment_description);
      } else {
        console.log('  📝 Descrição: ❌ VAZIO');
      }
    });
    
    console.log('\n🎯 Resumo do Teste:');
    const realQRCodes = serviceOrders.filter(order => 
      order.qr_code_image && 
      order.qr_code_image.length > 1000 && 
      order.qr_code_image !== 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    );
    
    const fakeQRCodes = serviceOrders.filter(order => 
      order.qr_code_image === 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    );
    
    const emptyQRCodes = serviceOrders.filter(order => !order.qr_code_image);
    
    console.log(`✅ QR Codes reais: ${realQRCodes.length}`);
    console.log(`❌ QR Codes fake: ${fakeQRCodes.length}`);
    console.log(`⚪ QR Codes vazios: ${emptyQRCodes.length}`);
    
    if (realQRCodes.length > 0) {
      console.log('\n🎉 SUCESSO! A correção está funcionando!');
      console.log('💡 Próximas cobranças criadas terão QR codes reais.');
    } else if (fakeQRCodes.length > 0) {
      console.log('\n⚠️ ATENÇÃO! Ainda há QR codes fake no banco.');
      console.log('💡 Crie uma nova cobrança para testar a correção.');
    } else {
      console.log('\n❓ Nenhum QR code encontrado.');
      console.log('💡 Crie uma cobrança para testar o sistema.');
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
}

// Executar o teste
testQRCodeFix();