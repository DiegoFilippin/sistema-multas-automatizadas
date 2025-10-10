import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  console.log('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugDiegoPayments() {
  console.log('🔍 === DEBUG ESPECÍFICO: diego@despachante.com ===\n');
  
  try {
    // 1. Buscar todos os usuários com "diego" no email
    console.log('👤 1. BUSCANDO USUÁRIOS COM "diego" NO EMAIL:');
    const { data: diegoUsers, error: diegoError } = await supabase
      .from('user_profiles')
      .select('*')
      .ilike('email', '%diego%');
    
    if (diegoError) {
      console.error('❌ Erro ao buscar usuários Diego:', diegoError);
    } else {
      console.log(`✅ Encontrados ${diegoUsers?.length || 0} usuários com "diego" no email:`);
      diegoUsers?.forEach((user, index) => {
        console.log(`   ${index + 1}. Email: ${user.email}`);
        console.log(`      - ID: ${user.id}`);
        console.log(`      - Company ID: ${user.company_id}`);
        console.log(`      - Role: ${user.role}`);
        console.log(`      - Created: ${user.created_at}`);
        console.log('      ---');
      });
    }
    
    // 2. Buscar todos os usuários com role "dispatcher"
    console.log('\n🚚 2. BUSCANDO USUÁRIOS COM ROLE "dispatcher":');
    const { data: dispatchers, error: dispatchersError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'dispatcher')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (dispatchersError) {
      console.error('❌ Erro ao buscar despachantes:', dispatchersError);
    } else {
      console.log(`✅ Encontrados ${dispatchers?.length || 0} despachantes:`);
      dispatchers?.forEach((user, index) => {
        console.log(`   ${index + 1}. Email: ${user.email}`);
        console.log(`      - ID: ${user.id}`);
        console.log(`      - Company ID: ${user.company_id}`);
        console.log(`      - Created: ${user.created_at}`);
        console.log('      ---');
      });
    }
    
    // 3. Verificar usuários na tabela auth.users
    console.log('\n🔐 3. BUSCANDO NA TABELA AUTH.USERS:');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao buscar usuários auth:', authError);
    } else {
      const diegoAuthUsers = authUsers.users.filter(user => 
        user.email?.includes('diego') || user.email?.includes('despachante')
      );
      
      console.log(`✅ Encontrados ${diegoAuthUsers.length} usuários auth com "diego" ou "despachante":`);
      diegoAuthUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. Email: ${user.email}`);
        console.log(`      - ID: ${user.id}`);
        console.log(`      - Created: ${user.created_at}`);
        console.log(`      - Confirmed: ${user.email_confirmed_at ? 'Sim' : 'Não'}`);
        console.log(`      - Metadata:`, user.user_metadata);
        console.log('      ---');
      });
    }
    
    // 4. Se encontrarmos um usuário, vamos usar o primeiro despachante disponível
    let targetUser = null;
    let companyId = null;
    
    if (dispatchers && dispatchers.length > 0) {
      targetUser = dispatchers[0];
      companyId = targetUser.company_id;
      console.log(`\n🎯 4. USANDO PRIMEIRO DESPACHANTE ENCONTRADO:`);
      console.log(`   - Email: ${targetUser.email}`);
      console.log(`   - Company ID: ${companyId}`);
    } else {
      console.log('\n❌ Nenhum despachante encontrado. Vamos buscar cobranças de todas as empresas.');
      
      // Buscar todas as empresas
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, nome, cnpj')
        .limit(5);
      
      if (companiesError) {
        console.error('❌ Erro ao buscar empresas:', companiesError);
        return;
      }
      
      console.log(`\n🏢 Empresas disponíveis (${companies?.length || 0}):`);
      companies?.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company.nome} (ID: ${company.id})`);
      });
      
      if (companies && companies.length > 0) {
        companyId = companies[0].id;
        console.log(`\n🎯 Usando primeira empresa: ${companies[0].nome} (ID: ${companyId})`);
      } else {
        console.log('❌ Nenhuma empresa encontrada.');
        return;
      }
    }
    
    // 5. Buscar cobranças para a empresa selecionada
    console.log('\n💰 5. BUSCANDO COBRANÇAS PARA A EMPRESA:');
    
    // 5.1 Tabela payments (créditos)
    console.log('\n📊 5.1 TABELA PAYMENTS (Créditos):');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        customer:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (paymentsError) {
      console.error('❌ Erro ao buscar payments:', paymentsError);
    } else {
      console.log(`✅ Encontrados ${payments?.length || 0} registros em payments`);
      payments?.slice(0, 5).forEach((payment, index) => {
        console.log(`   ${index + 1}. ID: ${payment.id}`);
        console.log(`      - Amount: R$ ${payment.amount}`);
        console.log(`      - Status: ${payment.status}`);
        console.log(`      - Customer: ${payment.customer?.nome || 'N/A'}`);
        console.log(`      - Created: ${payment.created_at}`);
        console.log('      ---');
      });
      if (payments && payments.length > 5) {
        console.log(`   ... e mais ${payments.length - 5} registros`);
      }
    }
    
    // 5.2 Tabela service_orders (multas)
    console.log('\n🚨 5.2 TABELA SERVICE_ORDERS (Multas):');
    const { data: serviceOrders, error: serviceOrdersError } = await supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj),
        service:services(id, name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (serviceOrdersError) {
      console.error('❌ Erro ao buscar service_orders:', serviceOrdersError);
    } else {
      console.log(`✅ Encontrados ${serviceOrders?.length || 0} registros em service_orders`);
      serviceOrders?.slice(0, 5).forEach((order, index) => {
        console.log(`   ${index + 1}. ID: ${order.id}`);
        console.log(`      - Payment ID: ${order.payment_id}`);
        console.log(`      - Amount: R$ ${order.amount}`);
        console.log(`      - Status: ${order.status}`);
        console.log(`      - Client: ${order.client?.nome || 'N/A'}`);
        console.log(`      - Multa Type: ${order.multa_type}`);
        console.log(`      - Created: ${order.created_at}`);
        console.log('      ---');
      });
      if (serviceOrders && serviceOrders.length > 5) {
        console.log(`   ... e mais ${serviceOrders.length - 5} registros`);
      }
    }
    
    // 5.3 Tabela asaas_payments (legado)
    console.log('\n🏛️ 5.3 TABELA ASAAS_PAYMENTS (Legado):');
    const { data: asaasPayments, error: asaasError } = await supabase
      .from('asaas_payments')
      .select(`
        *,
        client:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (asaasError) {
      console.error('❌ Erro ao buscar asaas_payments:', asaasError);
    } else {
      console.log(`✅ Encontrados ${asaasPayments?.length || 0} registros em asaas_payments`);
      asaasPayments?.slice(0, 5).forEach((payment, index) => {
        console.log(`   ${index + 1}. ID: ${payment.id}`);
        console.log(`      - Payment ID: ${payment.asaas_payment_id}`);
        console.log(`      - Amount: R$ ${payment.amount}`);
        console.log(`      - Status: ${payment.status}`);
        console.log(`      - Client: ${payment.client?.nome || 'N/A'}`);
        console.log(`      - Created: ${payment.created_at}`);
        console.log('      ---');
      });
      if (asaasPayments && asaasPayments.length > 5) {
        console.log(`   ... e mais ${asaasPayments.length - 5} registros`);
      }
    }
    
    // 6. Resumo total
    console.log('\n📈 6. RESUMO TOTAL:');
    const totalPayments = (payments?.length || 0);
    const totalServiceOrders = (serviceOrders?.length || 0);
    const totalAsaasPayments = (asaasPayments?.length || 0);
    const grandTotal = totalPayments + totalServiceOrders + totalAsaasPayments;
    
    console.log(`   - Payments (créditos): ${totalPayments}`);
    console.log(`   - Service Orders (multas): ${totalServiceOrders}`);
    console.log(`   - Asaas Payments (legado): ${totalAsaasPayments}`);
    console.log(`   - TOTAL GERAL: ${grandTotal}`);
    
    // 7. Verificar cobranças mais recentes
    console.log('\n⏰ 7. COBRANÇAS MAIS RECENTES (últimas 24h):');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentPayments = (payments || []).filter(p => new Date(p.created_at) > oneDayAgo);
    const recentServiceOrders = (serviceOrders || []).filter(p => new Date(p.created_at) > oneDayAgo);
    const recentAsaasPayments = (asaasPayments || []).filter(p => new Date(p.created_at) > oneDayAgo);
    
    console.log(`   - Payments recentes: ${recentPayments.length}`);
    console.log(`   - Service Orders recentes: ${recentServiceOrders.length}`);
    console.log(`   - Asaas Payments recentes: ${recentAsaasPayments.length}`);
    
    // 8. Simular resposta da API
    console.log('\n🔄 8. SIMULANDO RESPOSTA DA API:');
    console.log(`   Endpoint: GET /api/payments/company/${companyId}`);
    
    const allPayments = [
      ...(payments || []).map(payment => ({
        source: 'credits',
        payment_id: payment.id,
        client_name: payment.customer?.nome || 'Empresa',
        amount: payment.amount,
        status: payment.status || 'pending',
        created_at: payment.created_at
      })),
      ...(serviceOrders || []).map(order => ({
        source: 'service_order',
        payment_id: order.payment_id || order.id,
        client_name: order.client?.nome || 'Cliente não identificado',
        amount: order.amount,
        status: order.status === 'paid' ? 'confirmed' : (order.status === 'pending_payment' ? 'pending' : order.status),
        created_at: order.created_at
      })),
      ...(asaasPayments || []).map(payment => ({
        source: 'asaas',
        payment_id: payment.id,
        client_name: payment.client?.nome || 'Cliente',
        amount: payment.amount,
        status: payment.status || 'PENDING',
        created_at: payment.created_at
      }))
    ];
    
    allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    console.log(`   - Total que seria retornado pela API: ${allPayments.length}`);
    console.log('   - Primeiros 10 registros:');
    allPayments.slice(0, 10).forEach((payment, index) => {
      console.log(`     ${index + 1}. ${payment.payment_id} (${payment.source})`);
      console.log(`        - Cliente: ${payment.client_name}`);
      console.log(`        - Valor: R$ ${payment.amount}`);
      console.log(`        - Status: ${payment.status}`);
      console.log(`        - Data: ${payment.created_at}`);
    });
    
    console.log('\n✅ Debug concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante debug:', error);
  }
}

// Executar debug
debugDiegoPayments().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});