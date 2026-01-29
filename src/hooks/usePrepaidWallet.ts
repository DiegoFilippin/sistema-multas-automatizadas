import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { prepaidWalletService, PrepaidTransaction } from '@/services/prepaidWalletService';
import { useAuthStore } from '@/stores/authStore';

interface UsePrepaidWalletOptions {
  autoLoadTransactions?: boolean;
  transactionsLimit?: number;
}

export function usePrepaidWallet(options: UsePrepaidWalletOptions = {}) {
  const { autoLoadTransactions = false, transactionsLimit = 20 } = options;
  const { user } = useAuthStore();

  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isAddingFunds, setIsAddingFunds] = useState(false);

  const [balance, setBalance] = useState<number>(0);
  const [lastTransactionAt, setLastTransactionAt] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<PrepaidTransaction[]>([]);

  const loadBalance = useCallback(async () => {
    if (!user?.company_id) {
      console.log('⚠️ Usuário sem company_id, não é possível carregar saldo');
      return;
    }

    try {
      setIsLoadingBalance(true);
      console.log('🔍 Carregando saldo via Supabase para company_id:', user.company_id);
      
      const result = await prepaidWalletService.getBalance(user.company_id);
      
      setBalance(result.balance ?? 0);
      setLastTransactionAt(result.lastTransactionAt ?? null);
      console.log('✅ Saldo carregado:', result.balance);
    } catch (error) {
      console.error('❌ Erro ao carregar saldo pré-pago:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [user?.company_id]);

  const loadTransactions = useCallback(async () => {
    if (!user?.company_id) {
      console.log('⚠️ Usuário sem company_id, não é possível carregar transações');
      return;
    }

    try {
      setIsLoadingTransactions(true);
      console.log('� Carregando transações via Supabase...');
      
      const transactionsData = await prepaidWalletService.getTransactions(user.company_id, transactionsLimit);
      
      console.log('✅ Total de transações:', transactionsData.length);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('❌ Erro ao carregar extrato pré-pago:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar extrato pré-pago');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [user?.company_id, transactionsLimit]);

  const createRecharge = useCallback(async (amount: number, notes?: string) => {
    if (!user?.company_id) {
      throw new Error('Usuário sem empresa vinculada.');
    }

    try {
      if (!amount || Number.isNaN(amount) || amount <= 0) {
        throw new Error('Informe um valor válido para a recarga.');
      }

      setIsAddingFunds(true);
      
      // Por enquanto, adiciona fundos diretamente (sem integração com gateway de pagamento)
      const result = await prepaidWalletService.addFunds({
        companyId: user.company_id,
        amount,
        notes: notes || 'Recarga de saldo',
        createdBy: user.id
      });

      toast.success('Recarga realizada com sucesso!');
      setBalance(result.balance);
      await loadTransactions();
      return result.transaction;
    } catch (error) {
      console.error('Erro ao criar recarga:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar recarga');
      throw error;
    } finally {
      setIsAddingFunds(false);
    }
  }, [user?.company_id, user?.id, loadTransactions]);

  // Função para adicionar fundos manualmente
  const addFunds = useCallback(async (amount: number, notes?: string) => {
    if (!user?.company_id) {
      throw new Error('Usuário sem empresa vinculada.');
    }

    try {
      if (!amount || Number.isNaN(amount) || amount <= 0) {
        throw new Error('Informe um valor válido para adicionar ao saldo.');
      }

      setIsAddingFunds(true);
      
      const result = await prepaidWalletService.addFunds({
        companyId: user.company_id,
        amount,
        notes: notes || 'Adição de saldo',
        createdBy: user.id
      });

      toast.success('Saldo adicionado com sucesso!');
      setBalance(result.balance);
      setTransactions(prev => [result.transaction, ...prev]);
      setLastTransactionAt(result.transaction?.created_at ?? lastTransactionAt);
      return result.transaction;
    } catch (error) {
      console.error('Erro ao adicionar saldo pré-pago:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar saldo pré-pago');
      throw error;
    } finally {
      setIsAddingFunds(false);
    }
  }, [user?.company_id, user?.id, lastTransactionAt]);

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
