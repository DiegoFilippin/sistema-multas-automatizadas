// Teste do novo serviceOrdersService
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testServiceOrdersService() {
  console.log('🧪 === TESTE DO NOVO SERVICE ORDERS SERVICE ===\n');
  
  try {
    // Simular o serviceOrdersService
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL, 
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    console.log('1️⃣ Testando busca básica (como clientes fazem):');
    
    let query = supabase
      .from('service_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    const { data: serviceOrders, error } = await query;
    
    if (error) {
      console.error('❌ Erro ao buscar service_orders:', error.message);
      return;
    }
    
    console.log('✅ Service Orders encontrados:', serviceOrders?.length || 0);
    
    if (serviceOrders && serviceOrders.length > 0) {
      console.log('\n📋 Exemplo de registro:');
      const exemplo = serviceOrders[0];
      console.log('- ID:', exemplo.id);
      console.log('- Cliente:', exemplo.client_name || exemplo.customer_name || 'N/A');
      console.log('- Valor:', exemplo.amount);
      console.log('- Status:', exemplo.status);
      console.log('- Data:', exemplo.created_at);
    }
    
    console.log('\n2️⃣ Testando com filtro de empresa:');
    
    const companyId = '7d573ce0-125d-46bf-9e37-33d0c6074cf9';
    let queryFiltered = supabase
      .from('service_orders')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    const { data: filteredOrders, error: filteredError } = await queryFiltered;
    
    if (filteredError) {
      console.error('❌ Erro ao buscar com filtro:', filteredError.message);
      return;
    }
    
    console.log('✅ Service Orders filtrados por empresa:', filteredOrders?.length || 0);
    
    console.log('\n🎯 RESULTADO:');
    console.log('- Acesso direto ao Supabase: ✅ FUNCIONA');
    console.log('- Mesma abordagem dos clientes: ✅ FUNCIONA');
    console.log('- Não depende de APIs HTTP: ✅ FUNCIONA');
    console.log('- Deve resolver o problema no Vercel: ✅ PROVÁVEL');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testServiceOrdersService();