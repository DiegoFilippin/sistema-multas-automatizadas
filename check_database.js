import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Verificando dados no banco de dados...');
  
  try {
    // 1. Verificar contas de créditos existentes
    console.log('\n1. Verificando contas de créditos:');
    const { data: credits, error: creditsError } = await supabase
      .from('credits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (creditsError) {
      console.error('❌ Erro ao buscar créditos:', creditsError);
    } else {
      console.log(`✅ Encontradas ${credits.length} contas de créditos:`);
      credits.forEach(credit => {
        console.log(`  - ID: ${credit.id}, Tipo: ${credit.owner_type}, Owner: ${credit.owner_id}, Saldo: ${credit.balance}`);
      });
    }
    
    // 2. Verificar transações de crédito
    console.log('\n2. Verificando transações de crédito:');
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select(`
        id,
        credit_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        payment_id,
        description,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (transactionsError) {
      console.error('❌ Erro ao buscar transações:', transactionsError);
    } else {
      console.log(`✅ Encontradas ${transactions.length} transações:`);
      transactions.forEach(transaction => {
        console.log(`  - ID: ${transaction.id}, Tipo: ${transaction.transaction_type}, Valor: ${transaction.amount}, Descrição: ${transaction.description}`);
      });
    }
    
    // 3. Verificar pagamentos recentes
    console.log('\n3. Verificando pagamentos recentes:');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (paymentsError) {
      console.error('❌ Erro ao buscar pagamentos:', paymentsError);
    } else {
      console.log(`✅ Encontrados ${payments.length} pagamentos:`);
      payments.forEach(payment => {
        console.log(`  - ID: ${payment.id}, Asaas ID: ${payment.asaas_payment_id}, Status: ${payment.status}, Valor: ${payment.amount}`);
      });
    }
    
    // 4. Verificar se há empresas
    console.log('\n4. Verificando empresas:');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, nome')
      .limit(5);
    
    if (companiesError) {
      console.error('❌ Erro ao buscar empresas:', companiesError);
    } else {
      console.log(`✅ Encontradas ${companies.length} empresas:`);
      companies.forEach(company => {
        console.log(`  - ID: ${company.id}, Nome: ${company.nome}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkDatabase();