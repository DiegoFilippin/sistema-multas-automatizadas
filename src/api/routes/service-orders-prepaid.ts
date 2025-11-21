import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../../middleware/auth';
import { supabase } from '../../lib/supabase';

const router = Router();

// Criar service_order com pagamento via saldo pré-pago
router.post('/create-with-prepaid', authenticateToken, authorizeRoles(['Despachante']), async (req, res) => {
  console.log('\n💰 === ROTA /create-with-prepaid CHAMADA ===');
  console.log('📦 Body:', req.body);
  console.log('👤 User:', req.user);
  
  try {
    const { client_id, service_id, amount, notes, multa_type, service_order_id } = req.body;
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    console.log('💰 Processando pagamento pré-pago:', {
      client_id,
      service_id,
      amount,
      company_id: companyId,
      user_id: userId,
      service_order_id: service_order_id || 'CRIAR NOVO'
    });

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Empresa não identificada'
      });
    }

    if (!client_id || !service_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos'
      });
    }

    // 1. Verificar saldo disponível
    const { data: transactions, error: transError } = await supabase
      .from('prepaid_wallet_transactions')
      .select('type, amount')
      .eq('company_id', companyId);

    if (transError) {
      console.error('Erro ao buscar transações:', transError);
      throw new Error('Erro ao verificar saldo');
    }

    const currentBalance = (transactions || []).reduce((sum, t) => {
      return sum + (t.type === 'credit' ? t.amount : -t.amount);
    }, 0);

    console.log('💵 Saldo atual:', currentBalance);
    console.log('💵 Valor necessário:', amount);

    if (currentBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Saldo insuficiente',
        currentBalance,
        required: amount
      });
    }

    // 2. Usar service_order existente ou criar novo
    let serviceOrder: any;
    
    if (service_order_id) {
      // Usar service_order existente (do wizard)
      console.log('📝 Usando service_order existente:', service_order_id);
      
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', service_order_id)
        .single();
      
      if (error || !data) {
        console.error('❌ Service order não encontrado:', error);
        throw new Error('Recurso não encontrado');
      }
      
      serviceOrder = data;
      console.log('✅ Service Order encontrado:', serviceOrder.id);
    } else {
      // Criar novo service_order (fluxo antigo)
      const now = new Date();
      const serviceOrderData: any = {
        client_id,
        service_id,
        company_id: companyId,
        amount,
        status: 'paid',
        payment_method: 'prepaid',
        notes: `[PRÉ-PAGO] ${notes || 'Pagamento via saldo pré-pago'}`,
        multa_type: multa_type || 'leve',
        due_date: now.toISOString(),
        paid_at: now.toISOString()
      };

      console.log('📝 Criando novo service_order:', serviceOrderData);

      const { data, error: soError } = await supabase
        .from('service_orders')
        .insert(serviceOrderData)
        .select()
        .single();

      if (soError) {
        console.error('❌ Erro ao criar service_order:', soError);
        throw new Error(`Erro ao criar ordem de serviço: ${soError.message}`);
      }

      serviceOrder = data;
      console.log('✅ Service Order criado:', serviceOrder.id);
    }

    // 3. Criar transação de débito
    const newBalance = currentBalance - amount;

    console.log('💳 Criando transação de débito:', {
      company_id: companyId,
      type: 'debit',
      amount,
      balance_after: newBalance,
      service_order_id: serviceOrder.id,
      created_by: userId
    });

    const transactionData = {
      company_id: companyId,
      type: 'debit',
      amount,
      balance_after: newBalance,
      service_id,
      service_order_id: serviceOrder.id,
      notes: `Pagamento de serviço - ${notes || 'Recurso de Multa'}`,
      created_by: userId
    };

    console.log('📝 Dados da transação:', transactionData);

    const { data: transaction, error: transactionError } = await supabase
      .from('prepaid_wallet_transactions')
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Erro ao criar transação:', transactionError);
      console.error('❌ Código:', transactionError.code);
      console.error('❌ Mensagem:', transactionError.message);
      console.error('❌ Detalhes:', transactionError.details);
      // Reverter service_order
      await supabase
        .from('service_orders')
        .delete()
        .eq('id', serviceOrder.id);
      
      throw new Error('Erro ao debitar saldo');
    }

    console.log('✅ Transação criada com sucesso!');
    console.log('📋 ID da transação:', transaction.id);
    console.log('💰 Saldo anterior:', currentBalance);
    console.log('💰 Valor debitado:', amount);
    console.log('💰 Novo saldo:', newBalance);
    
    // Verificar se a transação foi realmente salva
    const { data: verifyTransaction, error: verifyError } = await supabase
      .from('prepaid_wallet_transactions')
      .select('*')
      .eq('id', transaction.id)
      .single();
    
    if (verifyError) {
      console.error('⚠️ Erro ao verificar transação:', verifyError);
    } else {
      console.log('✅ Transação verificada no banco:', verifyTransaction);
    }

    return res.json({
      success: true,
      serviceOrder,
      transaction,
      previousBalance: currentBalance,
      newBalance
    });

  } catch (error) {
    console.error('❌ Erro ao processar pagamento pré-pago:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao processar pagamento',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

export default router;
