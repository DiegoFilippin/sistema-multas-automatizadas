import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCompanyIds() {
  console.log('🔍 === VERIFICANDO COMPANY_IDS ===\n');
  
  try {
    // 1. Verificar todos os usuários para encontrar Diego
    console.log('1️⃣ BUSCANDO TODOS OS USUÁRIOS:');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (allUsersError) {
      console.error('❌ Erro ao buscar user_profiles:', allUsersError);
    } else {
      console.log(`✅ Total de usuários encontrados: ${allUsers?.length || 0}`);
      
      // Procurar Diego nos dados
      const diegoUsers = allUsers?.filter(user => 
        user.email?.toLowerCase().includes('diego') ||
        (user.name && user.name.toLowerCase().includes('diego')) ||
        JSON.stringify(user).toLowerCase().includes('diego')
      );
      
      console.log(`✅ Usuários Diego encontrados: ${diegoUsers?.length || 0}`);
      diegoUsers?.forEach(user => {
        console.log('   📋 Dados do Diego:');
        console.log('      - ID:', user.id);
        console.log('      - Email:', user.email);
        console.log('      - Nome:', user.name);
        console.log('      - Company ID:', user.company_id);
        console.log('      - Dados completos:', JSON.stringify(user, null, 2));
        console.log('');
      });
      
      // Se não encontrou, mostrar alguns usuários para debug
      if (!diegoUsers || diegoUsers.length === 0) {
        console.log('⚠️ Diego não encontrado. Mostrando primeiros 3 usuários para debug:');
        allUsers?.slice(0, 3).forEach((user, index) => {
          console.log(`   ${index + 1}. Email: ${user.email}, Nome: ${user.name}, Company: ${user.company_id}`);
        });
      }
    }
    
    // 2. Verificar service_orders
    console.log('2️⃣ VERIFICANDO SERVICE_ORDERS:');
    const { data: serviceOrders, error: ordersError } = await supabase
      .from('service_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (ordersError) {
      console.error('❌ Erro ao buscar service_orders:', ordersError);
    } else {
      console.log(`✅ Total de service_orders encontrados: ${serviceOrders?.length || 0}`);
      
      // Contar por company_id
      const companyStats = {};
      serviceOrders?.forEach(order => {
        if (order.company_id) {
          companyStats[order.company_id] = (companyStats[order.company_id] || 0) + 1;
        }
      });
      
      console.log('📊 Estatísticas por company_id:');
      Object.entries(companyStats).forEach(([companyId, count]) => {
        console.log(`   - ${companyId}: ${count} registros`);
      });
      
      // Mostrar alguns registros recentes
      console.log('\n📋 Últimos service_orders:');
      serviceOrders?.slice(0, 5).forEach((order, index) => {
        console.log(`   ${index + 1}. ID: ${order.id}`);
        console.log(`      - Payment ID: ${order.payment_id}`);
        console.log(`      - Company ID: ${order.company_id}`);
        console.log(`      - Cliente: ${order.customer_name || 'N/A'}`);
        console.log(`      - Criado: ${new Date(order.created_at).toLocaleString('pt-BR')}`);
        console.log('');
      });
    }
    
    // 3. Verificar empresa do Diego
    console.log('3️⃣ VERIFICANDO EMPRESA DO DIEGO:');
    const diegoCompanyId = 'c1f4c95f-1f16-4680-b568-aefc43390564';
    const { data: diegoCompany, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', diegoCompanyId)
      .single();
    
    if (companyError) {
      console.error('❌ Erro ao buscar empresa do Diego:', companyError);
    } else {
      console.log('✅ Empresa do Diego:');
      console.log('   - ID:', diegoCompany.id);
      console.log('   - Nome:', diegoCompany.nome);
      console.log('   - Email:', diegoCompany.email);
      console.log('   - CNPJ:', diegoCompany.cnpj);
    }
    
    // 4. Verificar se há service_orders na empresa do Diego
    console.log('4️⃣ VERIFICANDO SERVICE_ORDERS DA EMPRESA DO DIEGO:');
    const { data: diegoOrders, error: diegoOrdersError } = await supabase
      .from('service_orders')
      .select('*')
      .eq('company_id', diegoCompanyId)
      .order('created_at', { ascending: false });
    
    if (diegoOrdersError) {
      console.error('❌ Erro ao buscar service_orders do Diego:', diegoOrdersError);
    } else {
      console.log(`✅ Service_orders da empresa do Diego: ${diegoOrders?.length || 0}`);
      diegoOrders?.forEach((order, index) => {
        console.log(`   ${index + 1}. ID: ${order.id}`);
        console.log(`      - Payment ID: ${order.payment_id}`);
        console.log(`      - Cliente: ${order.customer_name || 'N/A'}`);
        console.log(`      - Valor: R$ ${order.amount || 'N/A'}`);
        console.log(`      - Status: ${order.status || 'N/A'}`);
        console.log(`      - Criado: ${new Date(order.created_at).toLocaleString('pt-BR')}`);
        console.log('');
      });
    }
    
    // 5. RESUMO FINAL
    console.log('🎯 === RESUMO FINAL ===');
    console.log('Company ID da empresa Diego:', diegoCompanyId);
    console.log('Service_orders na empresa Diego:', diegoOrders?.length || 0);
    console.log('Total de service_orders no sistema:', serviceOrders?.length || 0);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkCompanyIds().then(() => {
  console.log('🏁 Verificação concluída!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});