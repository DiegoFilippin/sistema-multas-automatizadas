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
    const { client_id, service_id, amount, notes, multa_type } = req.body;
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    console.log('💰 Criando service_order com saldo pré-pago:', {
      client_id,
      service_id,
      amount,
      company_id: companyId,
      user_id: userId
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

    // 2. Criar service_order com status 'paid'
    const now = new Date();
    const serviceOrderData: any = {
      client_id,
      service_id,
      company_id: companyId,
      amount,
      status: 'paid',
      notes: `[PRÉ-PAGO] ${notes || 'Pagamento via saldo pré-pago'}`,
      multa_type: multa_type || 'leve',
      due_date: now.toISOString(), // Data de vencimento = data atual (já pago)
      paid_at: now.toISOString() // Data de pagamento = data atual
    };

    console.log('📝 Dados do service_order:', serviceOrderData);

    const { data: serviceOrder, error: soError } = await supabase
      .from('service_orders')
      .insert(serviceOrderData)
      .select()
      .single();

    if (soError) {
      console.error('❌ Erro ao criar service_order:', soError);
      console.error('❌ Código do erro:', soError.code);
      console.error('❌ Mensagem:', soError.message);
      console.error('❌ Detalhes:', soError.details);
      throw new Error(`Erro ao criar ordem de serviço: ${soError.message}`);
    }

    console.log('✅ Service Order criado:', serviceOrder.id);

    // 3. Criar transação de débito
    const newBalance = currentBalance - amount;

    console.log('💳 Criando transação de débito:', {
      company_id: companyId,
      type: 'debit',
      amount,
      balance_after: newBalance,
      service_order_id: serviceOrder.id
    });

    const { data: transaction, error: transactionError } = await supabase
      .from('prepaid_wallet_transactions')
      .insert({
        company_id: companyId,
        type: 'debit',
        amount,
        balance_after: newBalance,
        service_id,
        service_order_id: serviceOrder.id,
        notes: `Pagamento de serviço - ${notes || 'Recurso de Multa'}`
      })
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Erro ao criar transação:', transactionError);
      console.error('❌ Código:', transactionError.code);
      console.error('❌ Mensagem:', transactionError.message);
      // Reverter service_order
      await supabase
        .from('service_orders')
        .delete()
        .eq('id', serviceOrder.id);
      
      throw new Error('Erro ao debitar saldo');
    }

    console.log('✅ Transação criada:', transaction.id);
    console.log('💰 Novo saldo:', newBalance);

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
