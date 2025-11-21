import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api-config';

interface PrepaidBalanceResponse {
  success: boolean;
  balance: number;
  lastTransactionAt: string | null;
}

interface PrepaidTransaction {
  id: string;
  company_id: string;
  type: 'credit' | 'debit';
  amount: number;
  balance_after: number;
  service_id?: string | null;
  service_order_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

interface UsePrepaidWalletOptions {
  autoLoadTransactions?: boolean;
  transactionsLimit?: number;
}

export function usePrepaidWallet(options: UsePrepaidWalletOptions = {}) {
  const { autoLoadTransactions = false, transactionsLimit = 20 } = options;

  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isAddingFunds, setIsAddingFunds] = useState(false);

  const [balance, setBalance] = useState<number>(0);
  const [lastTransactionAt, setLastTransactionAt] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<PrepaidTransaction[]>([]);

  const loadBalance = useCallback(async () => {
    try {
      setIsLoadingBalance(true);
      const response = await fetch(getApiUrl('/wallets/prepaid/balance'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao consultar saldo pré-pago');
      }

      const data = (await response.json()) as PrepaidBalanceResponse;
      if (!data?.success) {
        throw new Error('Não foi possível carregar o saldo pré-pago');
      }

      setBalance(data.balance ?? 0);
      setLastTransactionAt(data.lastTransactionAt ?? null);
    } catch (error) {
      console.error('Erro ao carregar saldo pré-pago:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar saldo pré-pago');
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoadingTransactions(true);
      console.log('🔍 Carregando transações via API...');
      
      const response = await fetch(getApiUrl(`/wallets/prepaid/transactions?limit=${transactionsLimit}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        console.error('❌ Erro na API:', response.status);
        throw new Error('Falha ao carregar extrato do saldo pré-pago');
      }

      const data = await response.json();
      console.log('📊 Transações recebidas:', data);
      
      if (!data?.success) {
        console.error('❌ API retornou success: false');
        throw new Error('Não foi possível carregar o extrato do saldo pré-pago');
      }

      const transactionsArray = Array.isArray(data.transactions) ? data.transactions : [];
      console.log('✅ Total de transações:', transactionsArray.length);
      console.log('📋 Débitos:', transactionsArray.filter(t => t.type === 'debit').length);
      console.log('📋 Créditos:', transactionsArray.filter(t => t.type === 'credit').length);
      
      setTransactions(transactionsArray);
    } catch (error) {
      console.error('❌ Erro ao carregar extrato pré-pago:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar extrato pré-pago');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [transactionsLimit]);

  const createRecharge = useCallback(async (amount: number, notes?: string) => {
    try {
      if (!amount || Number.isNaN(amount) || amount <= 0) {
        throw new Error('Informe um valor válido para a recarga.');
      }

      setIsAddingFunds(true);
      const response = await fetch(getApiUrl('/wallets/prepaid/create-recharge'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ amount, notes }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Não foi possível criar a recarga.');
      }

      toast.success('Recarga criada! Efetue o pagamento para creditar o saldo.');
      return data.recharge;
    } catch (error) {
      console.error('Erro ao criar recarga:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar recarga');
      throw error;
    } finally {
      setIsAddingFunds(false);
    }
  }, []);

  // Função legada para adicionar fundos manualmente (apenas admin)
  const addFunds = useCallback(async (amount: number, notes?: string) => {
    try {
      if (!amount || Number.isNaN(amount) || amount <= 0) {
        throw new Error('Informe um valor válido para adicionar ao saldo.');
      }

      setIsAddingFunds(true);
      const response = await fetch(getApiUrl('/wallets/prepaid/add-funds'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ amount, notes }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Não foi possível adicionar saldo.');
      }

      toast.success('Saldo adicionado com sucesso!');
      setBalance(data.balance ?? 0);
      setTransactions(prev => [data.transaction, ...prev]);
      setLastTransactionAt(data.transaction?.created_at ?? lastTransactionAt);
      return data.transaction as PrepaidTransaction;
    } catch (error) {
      console.error('Erro ao adicionar saldo pré-pago:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar saldo pré-pago');
      throw error;
    } finally {
      setIsAddingFunds(false);
    }
  }, [lastTransactionAt]);

  useEffect(() => {
    loadBalance();
    if (autoLoadTransactions) {
      loadTransactions();
    }
  }, [autoLoadTransactions, loadBalance, loadTransactions]);

  return {
    balance,
    lastTransactionAt,
    transactions,
    isLoadingBalance,
    isLoadingTransactions,
    isAddingFunds,
    loadBalance,
    loadTransactions,
    createRecharge,
    addFunds,
  };
}
