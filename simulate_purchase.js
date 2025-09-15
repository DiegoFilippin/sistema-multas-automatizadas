import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function simulatePurchase() {
  console.log('🛒 Simulando compra de créditos...');
  
  // Company ID do usuário Diego (encontrado no banco)
  const companyId = 'c1f4c95f-1f16-4680-b568-aefc43390564';
  const creditAmount = 50;
  const paymentAmount = 60; // R$ 60,00 por 50 créditos
  
  try {
    // 1. Criar pagamento simulado
    console.log('💳 Criando pagamento simulado...');
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        asaas_payment_id: `pay_sim_${Date.now()}`,
        company_id: companyId,
        customer_id: null, // Despachante comprando para empresa
        amount: paymentAmount,
        credit_amount: creditAmount,
        status: 'confirmed',
        payment_method: 'pix',
        due_date: new Date().toISOString(),
        confirmed_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (paymentError) {
      console.error('❌ Erro ao criar pagamento:', paymentError);
      return;
    }
    
    console.log('✅ Pagamento criado:', payment.id);
    
    // 2. Buscar ou criar conta de créditos
    console.log('🏦 Buscando conta de créditos...');
    let { data: creditAccount, error: accountError } = await supabase
      .from('credits')
      .select('*')
      .eq('owner_type', 'company')
      .eq('owner_id', companyId)
      .single();
    
    if (accountError && accountError.code === 'PGRST116') {
      // Conta não existe, criar nova
      console.log('🆕 Criando nova conta de créditos...');
      const { data: newAccount, error: createError } = await supabase
        .from('credits')
        .insert({
          owner_type: 'company',
          owner_id: companyId,
          balance: 0,
          total_purchased: 0,
          total_used: 0
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Erro ao criar conta:', createError);
        return;
      }
      
      creditAccount = newAccount;
    } else if (accountError) {
      console.error('❌ Erro ao buscar conta:', accountError);
      return;
    }
    
    console.log('✅ Conta de créditos encontrada:', creditAccount.id);
    
    // 3. Criar transação de crédito
    console.log('📝 Criando transação de crédito...');
    const balanceBefore = creditAccount.balance;
    const balanceAfter = balanceBefore + creditAmount;
    
    const { data: transaction, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        credit_id: creditAccount.id,
        transaction_type: 'purchase',
        amount: creditAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        payment_id: payment.id,
        description: `Compra simulada - ${creditAmount} créditos`
      })
      .select()
      .single();
    
    if (transactionError) {
      console.error('❌ Erro ao criar transação:', transactionError);
      return;
    }
    
    console.log('✅ Transação criada:', transaction.id);
    
    // 4. Atualizar saldo da conta
    console.log('💰 Atualizando saldo da conta...');
    const { error: updateError } = await supabase
      .from('credits')
      .update({
        balance: balanceAfter,
        total_purchased: creditAccount.total_purchased + creditAmount
      })
      .eq('id', creditAccount.id);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar saldo:', updateError);
      return;
    }
    
    console.log('✅ Saldo atualizado com sucesso!');
    
    // 5. Testar API de transações
    console.log('\n🧪 Testando API de transações...');
    await testTransactionsAPI(companyId);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

async function testTransactionsAPI(companyId) {
  try {
    const params = new URLSearchParams({
      ownerType: 'company',
      companyId: companyId,
      limit: '10',
      offset: '0'
    });
    
    const url = `http://localhost:3001/api/credits/transactions?${params}`;
    console.log(`📡 URL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Transações encontradas: ${data.data?.length || 0}`);
    
    if (data.success && data.data && data.data.length > 0) {
      console.log('✅ Transações:');
      data.data.forEach((transaction, index) => {
        console.log(`  ${index + 1}. ${transaction.transaction_type} - ${transaction.amount} - ${transaction.description}`);
      });
    } else {
      console.log('❌ Nenhuma transação encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
  }
}

simulatePurchase();