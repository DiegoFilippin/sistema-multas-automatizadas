import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPayments() {
  console.log('🔍 === DEBUG PAYMENTS TABLE ===');
  
  try {
    // 1. Verificar quantos registros existem na tabela payments
    const { count: paymentsCount, error: countError } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erro ao contar payments:', countError);
    } else {
      console.log(`📊 Total de registros na tabela payments: ${paymentsCount}`);
    }
    
    // 2. Buscar últimos 10 registros da tabela payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, asaas_payment_id, customer_id, company_id, amount, status, description, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (paymentsError) {
      console.error('❌ Erro ao buscar payments:', paymentsError);
    } else {
      console.log('\n💳 ÚLTIMOS 10 REGISTROS DA TABELA PAYMENTS:');
      console.log('=====================================');
      payments.forEach((payment, index) => {
        console.log(`${index + 1}. ID: ${payment.id}`);
        console.log(`   Asaas ID: ${payment.asaas_payment_id || 'N/A'}`);
        console.log(`   Customer ID: ${payment.customer_id || 'N/A'}`);
        console.log(`   Company ID: ${payment.company_id || 'N/A'}`);
        console.log(`   Amount: R$ ${payment.amount || 0}`);
        console.log(`   Status: ${payment.status || 'N/A'}`);
        console.log(`   Description: ${payment.description || 'N/A'}`);
        console.log(`   Created: ${payment.created_at || 'N/A'}`);
        console.log('   ---');
      });
    }
    
    // 3. Verificar quantos registros existem na tabela service_orders
    const { count: ordersCount, error: ordersCountError } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true });
    
    if (ordersCountError) {
      console.error('❌ Erro ao contar service_orders:', ordersCountError);
    } else {
      console.log(`\n📋 Total de registros na tabela service_orders: ${ordersCount}`);
    }
    
    // 4. Buscar últimos 10 registros da tabela service_orders
    const { data: orders, error: ordersError } = await supabase
      .from('service_orders')
      .select(`
        id, 
        client_id, 
        company_id, 
        payment_id, 
        service_type, 
        multa_type, 
        amount, 
        status, 
        description, 
        created_at,
        client:clients(nome),
        company:companies(nome)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (ordersError) {
      console.error('❌ Erro ao buscar service_orders:', ordersError);
    } else {
      console.log('\n📋 ÚLTIMOS 10 REGISTROS DA TABELA SERVICE_ORDERS:');
      console.log('=====================================');
      orders.forEach((order, index) => {
        console.log(`${index + 1}. ID: ${order.id}`);
        console.log(`   Client: ${order.client?.nome || 'N/A'} (${order.client_id})`);
        console.log(`   Company: ${order.company?.nome || 'N/A'} (${order.company_id})`);
        console.log(`   Payment ID: ${order.payment_id || 'N/A'}`);
        console.log(`   Service Type: ${order.service_type || 'N/A'}`);
        console.log(`   Multa Type: ${order.multa_type || 'N/A'}`);
        console.log(`   Amount: R$ ${order.amount || 0}`);
        console.log(`   Status: ${order.status || 'N/A'}`);
        console.log(`   Description: ${order.description || 'N/A'}`);
        console.log(`   Created: ${order.created_at || 'N/A'}`);
        console.log('   ---');
      });
    }
    
    // 5. Verificar se há cobranças para uma empresa específica
    console.log('\n🏢 VERIFICANDO COBRANÇAS POR EMPRESA:');
    
    // Buscar empresas ativas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, nome, company_type')
      .eq('status', 'ativo')
      .limit(5);
    
    if (companiesError) {
      console.error('❌ Erro ao buscar empresas:', companiesError);
    } else {
      console.log('Empresas ativas encontradas:');
      for (const company of companies) {
        console.log(`- ${company.nome} (${company.company_type}) - ID: ${company.id}`);
        
        // Buscar cobranças desta empresa
        const { data: companyPayments, error: companyPaymentsError } = await supabase
          .from('payments')
          .select('id, amount, status, created_at')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (companyPaymentsError) {
          console.error(`  ❌ Erro ao buscar payments da empresa ${company.nome}:`, companyPaymentsError);
        } else {
          console.log(`  💳 Payments encontrados: ${companyPayments.length}`);
          companyPayments.forEach(payment => {
            console.log(`    - R$ ${payment.amount} (${payment.status}) - ${payment.created_at}`);
          });
        }
        
        // Buscar service orders desta empresa
        const { data: companyOrders, error: companyOrdersError } = await supabase
          .from('service_orders')
          .select('id, amount, status, multa_type, created_at')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (companyOrdersError) {
          console.error(`  ❌ Erro ao buscar service_orders da empresa ${company.nome}:`, companyOrdersError);
        } else {
          console.log(`  📋 Service Orders encontrados: ${companyOrders.length}`);
          companyOrders.forEach(order => {
            console.log(`    - ${order.multa_type} R$ ${order.amount} (${order.status}) - ${order.created_at}`);
          });
        }
        
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugPayments();