// Script para debugar a visibilidade do botão Ver Fatura
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kxqrjpvgbradescokxq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cXJqcHZnYnJhZGVzY29reHEiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMzQxNzI2NCwiZXhwIjoyMDQ4OTkzMjY0fQ.pix2560qrpix-h.bradesco.com';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugButtonVisibility() {
  console.log('🔍 Debugando visibilidade do botão Ver Fatura...');
  
  try {
    // Buscar uma cobrança com invoice_url
    const { data: serviceOrders, error } = await supabase
      .from('service_orders')
      .select('*')
      .not('invoice_url', 'is', null)
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao buscar service_orders:', error);
      return;
    }
    
    if (!serviceOrders || serviceOrders.length === 0) {
      console.log('⚠️ Nenhuma cobrança com invoice_url encontrada');
      return;
    }
    
    const serviceOrder = serviceOrders[0];
    console.log('✅ Service Order encontrada:', {
      id: serviceOrder.id,
      invoice_url: serviceOrder.invoice_url,
      status: serviceOrder.status,
      payment_method: serviceOrder.payment_method
    });
    
    // Verificar se o invoice_url é válido
    if (serviceOrder.invoice_url) {
      console.log('✅ Invoice URL presente:', serviceOrder.invoice_url);
      
      // Testar se a URL é acessível
      try {
        const response = await fetch(serviceOrder.invoice_url, { method: 'HEAD' });
        console.log('🌐 Status da URL:', response.status);
      } catch (fetchError) {
        console.log('⚠️ Erro ao testar URL:', fetchError.message);
      }
    } else {
      console.log('❌ Invoice URL não encontrada');
    }
    
    // Simular o mapeamento que acontece no componente
    const cobrancaMapeada = {
      id: serviceOrder.id,
      invoice_url: serviceOrder.invoice_url,
      bank_slip_url: serviceOrder.bank_slip_url,
      payment_method: serviceOrder.payment_method || 'PIX',
      status: serviceOrder.status,
      client_name: serviceOrder.client_name,
      description: serviceOrder.description
    };
    
    console.log('📋 Cobrança mapeada:', cobrancaMapeada);
    
    // Verificar condições de exibição do botão
    const shouldShowButton = !!(cobrancaMapeada.invoice_url || cobrancaMapeada.bank_slip_url);
    console.log('🔘 Botão deveria aparecer?', shouldShowButton);
    
    if (shouldShowButton) {
      console.log('✅ Condições atendidas para exibir o botão');
      console.log('🎨 Estilos que deveriam ser aplicados:');
      console.log('   - backgroundColor: #4B5563 (gray-600)');
      console.log('   - color: #FFFFFF (white)');
      console.log('   - display: flex');
      console.log('   - border: none');
    } else {
      console.log('❌ Condições NÃO atendidas para exibir o botão');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o debug
debugButtonVisibility();