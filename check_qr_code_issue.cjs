const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://ztjbxbpkqhvjqzpvvqxd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0amJ4YnBrcWh2anF6cHZ2cXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MzE4NzcsImV4cCI6MjA1MDIwNzg3N30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQRCodeIssue() {
  console.log('🔍 === INVESTIGANDO PROBLEMA DO QR CODE ===');
  console.log('Payment ID: pay_sjrxdyf47n4xe0o3');
  
  try {
    // Buscar a cobrança específica
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .eq('asaas_payment_id', 'pay_sjrxdyf47n4xe0o3')
      .single();
    
    if (error) {
      console.error('❌ Erro ao buscar cobrança:', error);
      return;
    }
    
    if (!data) {
      console.log('❌ Cobrança não encontrada no banco de dados');
      return;
    }
    
    console.log('\n✅ === DADOS DA COBRANÇA ENCONTRADA ===');
    console.log('- ID:', data.id);
    console.log('- Cliente:', data.customer_name);
    console.log('- Valor:', data.amount);
    console.log('- Status:', data.status);
    console.log('- Data criação:', data.created_at);
    console.log('- Asaas Payment ID:', data.asaas_payment_id);
    
    console.log('\n🔍 === ANÁLISE DOS CAMPOS QR CODE ===');
    
    // Verificar qr_code_image
    if (data.qr_code_image) {
      console.log('✅ qr_code_image: PRESENTE');
      console.log('  - Tamanho:', data.qr_code_image.length, 'caracteres');
      console.log('  - Começa com:', data.qr_code_image.substring(0, 50) + '...');
      console.log('  - Termina com:', '...' + data.qr_code_image.substring(data.qr_code_image.length - 20));
      
      // Verificar se é Base64 válido
      const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(data.qr_code_image);
      const hasDataPrefix = data.qr_code_image.startsWith('data:image/');
      
      console.log('  - É Base64 puro:', isBase64);
      console.log('  - Tem prefixo data:image:', hasDataPrefix);
      
      if (!hasDataPrefix && isBase64) {
        console.log('⚠️  PROBLEMA IDENTIFICADO: QR Code é Base64 puro, mas precisa do prefixo data:image/png;base64,');
      }
    } else {
      console.log('❌ qr_code_image: AUSENTE ou NULL');
    }
    
    // Verificar pix_payload
    if (data.pix_payload) {
      console.log('✅ pix_payload: PRESENTE');
      console.log('  - Tamanho:', data.pix_payload.length, 'caracteres');
      console.log('  - Conteúdo:', data.pix_payload.substring(0, 100) + '...');
    } else {
      console.log('❌ pix_payload: AUSENTE ou NULL');
    }
    
    // Verificar outros campos relacionados
    console.log('\n📋 === OUTROS CAMPOS RELACIONADOS ===');
    console.log('- invoice_url:', data.invoice_url || 'AUSENTE');
    console.log('- invoice_number:', data.invoice_number || 'AUSENTE');
    console.log('- billing_type:', data.billing_type || 'AUSENTE');
    
    // Verificar webhook_response
    if (data.webhook_response) {
      console.log('\n🔍 === ANÁLISE DO WEBHOOK_RESPONSE ===');
      const webhookData = typeof data.webhook_response === 'string' 
        ? JSON.parse(data.webhook_response) 
        : data.webhook_response;
      
      console.log('- encodedImage no webhook:', webhookData.encodedImage ? 'PRESENTE (' + webhookData.encodedImage.length + ' chars)' : 'AUSENTE');
      console.log('- payload no webhook:', webhookData.payload ? 'PRESENTE (' + webhookData.payload.length + ' chars)' : 'AUSENTE');
      
      if (webhookData.encodedImage) {
        console.log('- Webhook encodedImage começa com:', webhookData.encodedImage.substring(0, 50) + '...');
      }
    }
    
    console.log('\n🎯 === DIAGNÓSTICO ===');
    if (!data.qr_code_image) {
      console.log('❌ PROBLEMA: Campo qr_code_image está vazio no banco');
    } else if (!data.qr_code_image.startsWith('data:image/')) {
      console.log('⚠️  PROBLEMA: QR Code não tem prefixo data:image/ necessário para exibição');
      console.log('💡 SOLUÇÃO: Adicionar prefixo "data:image/png;base64," ao campo qr_code_image');
    } else {
      console.log('✅ QR Code parece estar correto no banco');
      console.log('💡 VERIFICAR: Lógica de exibição no modal (MeusServicos.tsx)');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

checkQRCodeIssue();