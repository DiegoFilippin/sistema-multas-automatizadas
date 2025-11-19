/**
 * Serviço responsável por gerenciar o saldo pré-pago do despachante
 */
import { supabase } from '../lib/supabase';

export interface PrepaidTransaction {
  id: string;
  company_id: string;
  type: 'credit' | 'debit';
  amount: number;
  service_id?: string | null;
  service_order_id?: string | null;
  balance_after: number;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

interface AddFundsInput {
  companyId: string;
  amount: number;
  notes?: string;
  createdBy?: string;
}

interface DebitForServiceInput {
  companyId: string;
  amount: number;
  serviceId?: string;
  serviceOrderId?: string;
  notes?: string;
  createdBy?: string;
}

class PrepaidWalletService {
  private tableName = 'prepaid_wallet_transactions';

  private async getLatestTransaction(companyId: string) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Erro ao buscar última transação de saldo pré-pago:', error);
      throw new Error('Não foi possível consultar o saldo pré-pago.');
    }

    return data as PrepaidTransaction | null;
  }

  async getBalance(companyId: string) {
    const latest = await this.getLatestTransaction(companyId);

    return {
      balance: latest?.balance_after ?? 0,
      lastTransactionAt: latest?.created_at ?? null,
    };
  }

  private async insertTransaction(entry: {
    company_id: string;
    type: 'credit' | 'debit';
    amount: number;
    balance_after: number;
    service_id?: string | null;
    service_order_id?: string | null;
    notes?: string | null;
    created_by?: string | null;
  }) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao registrar transação de saldo pré-pago:', error);
      throw new Error('Não foi possível registrar a transação de saldo pré-pago.');
    }

    return data as PrepaidTransaction;
  }

  async addFunds(input: AddFundsInput) {
    const amount = Number(input.amount || 0);
    if (!amount || amount <= 0) {
      throw new Error('Valor inválido para adicionar ao saldo pré-pago.');
    }

    const latest = await this.getLatestTransaction(input.companyId);
    const balanceAfter = (latest?.balance_after ?? 0) + amount;

    const transaction = await this.insertTransaction({
      company_id: input.companyId,
      type: 'credit',
      amount,
      balance_after: balanceAfter,
      notes: input.notes || null,
      created_by: input.createdBy || null,
    });

    return {
      transaction,
      balance: balanceAfter,
    };
  }

  async debitForService(input: DebitForServiceInput) {
    const amount = Number(input.amount || 0);
    if (!amount || amount <= 0) {
      throw new Error('Valor inválido para débito do saldo pré-pago.');
    }

    const latest = await this.getLatestTransaction(input.companyId);
    const currentBalance = latest?.balance_after ?? 0;

    if (currentBalance < amount) {
      throw new Error('Saldo pré-pago insuficiente para realizar esta operação.');
    }

    const balanceAfter = currentBalance - amount;

    const transaction = await this.insertTransaction({
      company_id: input.companyId,
      type: 'debit',
      amount,
      balance_after: balanceAfter,
      service_id: input.serviceId || null,
      service_order_id: input.serviceOrderId || null,
      notes: input.notes || null,
      created_by: input.createdBy || null,
    });

    return {
      transaction,
      balance: balanceAfter,
    };
  }

  async linkTransactionToServiceOrder(transactionId: string, serviceOrderId: string) {
    const { error } = await supabase
      .from(this.tableName)
      .update({ service_order_id: serviceOrderId })
      .eq('id', transactionId);

    if (error) {
      console.error('❌ Erro ao vincular transação de saldo ao service_order:', error);
    }
  }

  async getTransactions(companyId: string, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Erro ao listar transações de saldo pré-pago:', error);
      throw new Error('Não foi possível listar as transações de saldo pré-pago.');
    }

    return (data || []) as PrepaidTransaction[];
  }
}

export const prepaidWalletService = new PrepaidWalletService();
