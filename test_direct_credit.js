// Teste direto do creditService para verificar se está funcionando

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabase = createClient(supabaseUrl, supabaseKey);

// Simular o creditService localmente
class TestCreditService {
  async getOrCreateCreditAccount(ownerType, ownerId) {
    console.log(`🔍 Buscando conta de créditos: ${ownerType} - ${ownerId}`);
    
    let { data: account, error } = await supabase
      .from('credits')
      .select('*')
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId)
      .single();

    if (error && error.code === 'PGRST116') {
      console.log('📝 Conta não existe, criando nova...');
      
      const { data: newAccount, error: createError } = await supabase
        .from('credits')
        .insert({
          owner_type: ownerType,
          owner_id: ownerId,
          balance: 0.00,
          total_purchased: 0.00,
          total_used: 0.00
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Erro ao criar conta:', createError);
        throw new Error(`Erro ao criar conta de créditos: ${createError.message}`);
      }

      account = newAccount;
      console.log('✅ Conta criada:', account.id);
    } else if (error) {
      console.error('❌ Erro ao buscar conta:', error);
      throw new Error(`Erro ao buscar conta de créditos: ${error.message}`);
    } else {
      console.log('✅ Conta encontrada:', account.id);
    }

    return account;
  }

  async createTransaction(transaction) {
    console.log('📝 Criando transação:', transaction);
    
    const { error } = await supabase
      .from('credit_transactions')
      .insert(transaction);

    if (error) {
      console.error('❌ Erro ao criar transação:', error);
      throw new Error(`Erro ao criar transação: ${error.message}`);
    }
    
    console.log('✅ Transação criada com sucesso');
  }

  async addCredits(ownerType, ownerId, amount, paymentId, userId, description) {
    try {
      console.log(`💰 Adicionando ${amount} créditos para ${ownerType} ${ownerId}`);
      
      // Buscar ou criar conta
      const account = await this.getOrCreateCreditAccount(ownerType, ownerId);
      const balanceBefore = account.balance;
      const balanceAfter = balanceBefore + amount;

      console.log(`💳 Saldo antes: ${balanceBefore}, depois: ${balanceAfter}`);

      // Atualizar saldo na conta
      const { error: updateError } = await supabase
        .from('credits')
        .update({
          balance: balanceAfter,
          total_purchased: account.total_purchased + amount
        })
        .eq('id', account.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar saldo:', updateError);
        throw new Error(`Erro ao adicionar créditos: ${updateError.message}`);
      }
      
      console.log('✅ Saldo atualizado');

      // Verificar se já existe transação para este pagamento
      if (paymentId) {
        const { data: existingTransaction, error: findError } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('payment_id', paymentId)
          .eq('credit_id', account.id)
          .single();

        if (!findError && existingTransaction) {
          console.log('⚠️ Transação já existe, atualizando...');
          
          const { error: updateTransactionError } = await supabase
            .from('credit_transactions')
            .update({
              balance_after: balanceAfter,
              description: description || `Compra confirmada - ${amount} créditos`
            })
            .eq('id', existingTransaction.id);

          if (updateTransactionError) {
            console.error('❌ Erro ao atualizar transação:', updateTransactionError);
          } else {
            console.log('✅ Transação atualizada');
          }
          return;
        }
      }

      // Criar nova transação
      await this.createTransaction({
        credit_id: account.id,
        transaction_type: 'purchase',
        amount: amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        payment_id: paymentId,
        description: description || `Compra de ${amount} créditos`,
        created_by: userId
      });
      
      console.log('🎉 Créditos adicionados com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao adicionar créditos:', error);
      throw error;
    }
  }

  async getTransactionHistory(ownerType, ownerId, limit = 50, offset = 0) {
    try {
      console.log(`📋 Buscando histórico: ${ownerType} - ${ownerId}`);
      
      // Buscar conta
      const account = await this.getOrCreateCreditAccount(ownerType, ownerId);

      // Buscar transações
      const { data, error } = await supabase
        .from('credit_transactions')
        .select(`
          *,
          services(name),
          payments(amount, status)
        `)
        .eq('credit_id', account.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }

      console.log(`📊 Encontradas ${data?.length || 0} transações`);
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar histórico de transações:', error);
      return [];
    }
  }
}

// Executar teste
const runTest = async () => {
  console.log('🧪 Testando creditService diretamente\n');
  
  const creditService = new TestCreditService();
  
  // Primeiro, vamos buscar o pagamento real do banco
  console.log('🔍 Buscando pagamento real do banco...');
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, company_id, asaas_payment_id, credit_amount')
    .eq('asaas_payment_id', 'pay_test_12345')
    .single();
  
  if (paymentError || !payment) {
    console.error('❌ Pagamento não encontrado:', paymentError);
    return;
  }
  
  console.log('✅ Pagamento encontrado:', payment);
  
  const companyId = payment.company_id;
  const paymentId = payment.id; // Usar o UUID real
  const creditAmount = payment.credit_amount;
  
  try {
    // 1. Verificar histórico antes
    console.log('1️⃣ Verificando histórico antes...');
    const beforeTransactions = await creditService.getTransactionHistory('company', companyId);
    console.log(`Transações antes: ${beforeTransactions.length}\n`);
    
    // 2. Adicionar créditos
    console.log('2️⃣ Adicionando créditos...');
    await creditService.addCredits(
      'company',
      companyId,
      creditAmount,
      paymentId,
      undefined,
      `Teste direto - ${creditAmount} créditos`
    );
    console.log('');
    
    // 3. Verificar histórico depois
    console.log('3️⃣ Verificando histórico depois...');
    const afterTransactions = await creditService.getTransactionHistory('company', companyId);
    console.log(`Transações depois: ${afterTransactions.length}`);
    
    if (afterTransactions.length > 0) {
      console.log('\n📋 Transações encontradas:');
      afterTransactions.forEach((transaction, index) => {
        console.log(`${index + 1}. ${transaction.transaction_type} - ${transaction.amount} créditos - ${transaction.description}`);
      });
    }
    
    console.log('\n✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
};

runTest().catch(console.error);