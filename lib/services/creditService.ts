import { supabase } from '../config/supabase.js';

// Interfaces
export interface CreditBalance {
  id: string;
  owner_type: 'client' | 'company';
  owner_id: string;
  balance: number;
  total_purchased: number;
  total_used: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  credit_id: string;
  transaction_type: 'purchase' | 'usage' | 'refund' | 'transfer';
  amount: number;
  balance_before: number;
  balance_after: number;
  service_id?: string;
  payment_id?: string;
  description?: string;
  metadata?: any;
  created_at: string;
  created_by?: string;
}

export interface ServiceExecutionRequest {
  serviceId: string;
  clientId: string;
  companyId: string;
  useCompanyCredits?: boolean;
  userId?: string;
  description?: string;
}

// Classe de erro personalizada
export class InsufficientCreditsError extends Error {
  constructor(
    message: string,
    public requiredAmount: number,
    public availableAmount: number
  ) {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

class CreditService {
  // Buscar ou criar conta de créditos
  async getOrCreateCreditAccount(ownerType: 'client' | 'company', ownerId: string): Promise<CreditBalance> {
    try {
      // Tentar buscar conta existente
      const { data: existingAccount, error: fetchError } = await supabase
        .from('credits')
        .select('*')
        .eq('owner_type', ownerType)
        .eq('owner_id', ownerId)
        .single();

      if (existingAccount && !fetchError) {
        return existingAccount;
      }

      // Criar nova conta se não existir
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
        throw new Error(`Erro ao criar conta de créditos: ${createError.message}`);
      }

      return newAccount;
    } catch (error) {
      console.error('Erro ao buscar/criar conta de créditos:', error);
      throw error;
    }
  }

  // Buscar saldo de créditos do cliente
  async getClientBalance(clientId: string): Promise<number> {
    try {
      const account = await this.getOrCreateCreditAccount('client', clientId);
      return account.balance;
    } catch (error) {
      console.error('Erro ao buscar saldo do cliente:', error);
      return 0;
    }
  }

  // Buscar saldo de créditos da empresa
  async getCompanyBalance(companyId: string): Promise<number> {
    try {
      const account = await this.getOrCreateCreditAccount('company', companyId);
      return account.balance;
    } catch (error) {
      console.error('Erro ao buscar saldo da empresa:', error);
      return 0;
    }
  }

  // Calcular saldo disponível com lógica de prioridade
  async getAvailableBalance(
    clientId: string,
    companyId: string,
    useCompanyCredits: boolean = false
  ): Promise<{ total: number; clientBalance: number; companyBalance: number }> {
    const clientBalance = await this.getClientBalance(clientId);
    const companyBalance = await this.getCompanyBalance(companyId);

    if (useCompanyCredits) {
      // Priorizar créditos da empresa
      return {
        total: companyBalance + clientBalance,
        clientBalance,
        companyBalance
      };
    } else {
      // Usar apenas créditos do cliente
      return {
        total: clientBalance,
        clientBalance,
        companyBalance
      };
    }
  }

  // Validar e debitar créditos baseado no tipo de multa
  async validateAndDebitCreditsByMultaType(
    request: ServiceExecutionRequest & { multaType: 'leve' | 'media' | 'grave' | 'gravissima' }
  ): Promise<boolean> {
    try {
      // 1. Buscar preço baseado no tipo de multa
      const multaTypePrice = await this.getMultaTypePrice(request.multaType);

      if (!multaTypePrice || multaTypePrice <= 0) {
        throw new Error(`Preço não encontrado para o tipo de multa: ${request.multaType}`);
      }

      // 2. Verificar saldo disponível
      const balanceInfo = await this.getAvailableBalance(
        request.clientId,
        request.companyId,
        request.useCompanyCredits
      );

      // 3. Validar saldo suficiente
      if (balanceInfo.total < multaTypePrice) {
        throw new InsufficientCreditsError(
          `Saldo insuficiente para recurso de multa ${request.multaType}`,
          multaTypePrice,
          balanceInfo.total
        );
      }

      // 4. Debitar créditos com lógica de prioridade
      await this.debitCredits(
        request.clientId,
        request.companyId,
        multaTypePrice,
        `recurso_multa_${request.multaType}`,
        request.useCompanyCredits,
        request.userId,
        request.description || `Recurso de multa ${request.multaType}`
      );

      return true;
    } catch (error) {
      console.error('Erro ao validar e debitar créditos por tipo de multa:', error);
      throw error;
    }
  }

  // Buscar preço do tipo de multa
  private async getMultaTypePrice(multaType: 'leve' | 'media' | 'grave' | 'gravissima'): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('multa_types')
        .select('total_price')
        .eq('type', multaType)
        .eq('active', true)
        .single();

      if (error || !data) {
        throw new Error(`Tipo de multa não encontrado: ${multaType}`);
      }

      return data.total_price;
    } catch (error) {
      console.error('Erro ao buscar preço do tipo de multa:', error);
      throw error;
    }
  }

  // Validar e debitar créditos com preço fixo
  async validateAndDebitCreditsWithPrice(
    clientId: string,
    companyId: string,
    amount: number,
    serviceId: string,
    useCompanyCredits: boolean = false,
    userId?: string,
    description?: string
  ): Promise<boolean> {
    try {
      // 1. Verificar saldo disponível
      const balanceInfo = await this.getAvailableBalance(
        clientId,
        companyId,
        useCompanyCredits
      );

      // 2. Validar saldo suficiente
      if (balanceInfo.total < amount) {
        throw new InsufficientCreditsError(
          'Saldo insuficiente para executar o serviço',
          amount,
          balanceInfo.total
        );
      }

      // 3. Debitar créditos com lógica de prioridade
      await this.debitCredits(
        clientId,
        companyId,
        amount,
        serviceId,
        useCompanyCredits,
        userId,
        description
      );

      return true;
    } catch (error) {
      console.error('Erro ao validar e debitar créditos:', error);
      throw error;
    }
  }

  // Debitar créditos com lógica de prioridade
  private async debitCredits(
    clientId: string,
    companyId: string,
    amount: number,
    serviceId: string,
    useCompanyCredits: boolean = false,
    userId?: string,
    description?: string
  ): Promise<void> {
    let remainingAmount = amount;

    if (useCompanyCredits) {
      // Priorizar créditos da empresa
      const companyBalance = await this.getCompanyBalance(companyId);
      if (companyBalance > 0) {
        const debitFromCompany = Math.min(remainingAmount, companyBalance);
        await this.debitFromAccount('company', companyId, debitFromCompany, serviceId, userId, description);
        remainingAmount -= debitFromCompany;
      }

      // Se ainda sobrar valor, debitar do cliente
      if (remainingAmount > 0) {
        await this.debitFromAccount('client', clientId, remainingAmount, serviceId, userId, description);
      }
    } else {
      // Debitar apenas do cliente
      await this.debitFromAccount('client', clientId, remainingAmount, serviceId, userId, description);
    }
  }

  // Debitar de uma conta específica
  private async debitFromAccount(
    ownerType: 'client' | 'company',
    ownerId: string,
    amount: number,
    serviceId: string,
    userId?: string,
    description?: string
  ): Promise<void> {
    try {
      // Buscar conta atual
      const account = await this.getOrCreateCreditAccount(ownerType, ownerId);
      const balanceBefore = account.balance;
      const balanceAfter = balanceBefore - amount;

      // Atualizar saldo na conta
      const { error: updateError } = await supabase
        .from('credits')
        .update({
          balance: balanceAfter,
          total_used: account.total_used + amount
        })
        .eq('id', account.id);

      if (updateError) {
        throw new Error(`Erro ao atualizar saldo: ${updateError.message}`);
      }

      // Registrar transação
      await this.createTransaction({
        credit_id: account.id,
        transaction_type: 'usage',
        amount: -amount, // Negativo para débito
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        service_id: serviceId,
        description: description || `Uso do serviço ${serviceId}`,
        created_by: userId
      });
    } catch (error) {
      console.error('Erro ao debitar da conta:', error);
      throw error;
    }
  }

  // Adicionar créditos (compra)
  async addCredits(
    ownerType: 'client' | 'company',
    ownerId: string,
    amount: number,
    paymentId?: string,
    userId?: string,
    description?: string
  ): Promise<void> {
    try {
      // Buscar ou criar conta
      const account = await this.getOrCreateCreditAccount(ownerType, ownerId);
      const balanceBefore = account.balance;
      const balanceAfter = balanceBefore + amount;

      // Atualizar saldo na conta
      const { error: updateError } = await supabase
        .from('credits')
        .update({
          balance: balanceAfter,
          total_purchased: account.total_purchased + amount
        })
        .eq('id', account.id);

      if (updateError) {
        throw new Error(`Erro ao adicionar créditos: ${updateError.message}`);
      }

      // Se tem paymentId, tentar atualizar transação existente
      if (paymentId) {
        const { data: existingTransaction, error: findError } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('payment_id', paymentId)
          .eq('credit_id', account.id)
          .single();

        if (!findError && existingTransaction) {
          // Atualizar transação existente
          const { error: updateTransactionError } = await supabase
            .from('credit_transactions')
            .update({
              balance_after: balanceAfter,
              description: description || `Compra confirmada - ${amount} créditos`
            })
            .eq('id', existingTransaction.id);

          if (updateTransactionError) {
            console.error('Erro ao atualizar transação:', updateTransactionError);
          }
          return;
        }
      }

      // Se não encontrou transação existente, criar nova
      await this.createTransaction({
        credit_id: account.id,
        transaction_type: 'purchase',
        amount: amount, // Positivo para crédito
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        payment_id: paymentId,
        description: description || `Compra de ${amount} créditos`,
        created_by: userId
      });
    } catch (error) {
      console.error('Erro ao adicionar créditos:', error);
      throw error;
    }
  }

  // Criar transação
  private async createTransaction(transaction: Omit<CreditTransaction, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('credit_transactions')
        .insert(transaction);

      if (error) {
        throw new Error(`Erro ao criar transação: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      throw error;
    }
  }

  // Criar transação de crédito pendente (para aparecer no histórico antes da confirmação)
  async createPendingCreditTransaction(
    ownerType: 'client' | 'company',
    ownerId: string,
    amount: number,
    paymentId: string,
    userId?: string,
    description?: string
  ): Promise<void> {
    try {
      // Buscar ou criar conta
      const account = await this.getOrCreateCreditAccount(ownerType, ownerId);
      const balanceBefore = account.balance;
      
      // Registrar transação pendente (sem alterar o saldo ainda)
      await this.createTransaction({
        credit_id: account.id,
        transaction_type: 'purchase',
        amount: amount, // Positivo para crédito
        balance_before: balanceBefore,
        balance_after: balanceBefore, // Saldo não muda até confirmação
        payment_id: paymentId,
        description: description || `Compra de ${amount} créditos - Pendente`,
        created_by: userId
      });
    } catch (error) {
      console.error('Erro ao criar transação pendente:', error);
      throw error;
    }
  }

  // Buscar histórico de transações
  async getTransactionHistory(
    ownerType: 'client' | 'company',
    ownerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CreditTransaction[]> {
    try {
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
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico de transações:', error);
      return [];
    }
  }

  // Buscar estatísticas de créditos
  async getCreditStats(
    ownerType: 'client' | 'company',
    ownerId: string
  ): Promise<{
    currentBalance: number;
    totalPurchased: number;
    totalUsed: number;
    transactionCount: number;
  }> {
    try {
      const account = await this.getOrCreateCreditAccount(ownerType, ownerId);

      // Contar transações
      const { count } = await supabase
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('credit_id', account.id);

      return {
        currentBalance: account.balance,
        totalPurchased: account.total_purchased,
        totalUsed: account.total_used,
        transactionCount: count || 0
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {
        currentBalance: 0,
        totalPurchased: 0,
        totalUsed: 0,
        transactionCount: 0
      };
    }
  }

  // Buscar créditos de todos os clientes de uma empresa
  async getClientsBalanceByCompany(companyId: string): Promise<any[]> {
    try {
      // Buscar todos os clientes da empresa com seus créditos
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          nome,
          email,
          status,
          credits!inner(
            balance,
            total_purchased,
            total_used
          )
        `)
        .eq('company_id', companyId)
        .eq('credits.owner_type', 'client');

      if (error) {
        throw new Error(`Erro ao buscar clientes: ${error.message}`);
      }

      // Transformar dados para o formato esperado
      const clientsWithCredits = (data || []).map(client => ({
        id: client.id,
        nome: client.nome,
        email: client.email,
        status: client.status,
        balance: client.credits?.[0]?.balance || 0,
        total_purchased: client.credits?.[0]?.total_purchased || 0,
        total_used: client.credits?.[0]?.total_used || 0
      }));

      // Buscar clientes sem conta de créditos e criar contas vazias
      const { data: clientsWithoutCredits, error: clientsError } = await supabase
        .from('clients')
        .select('id, nome, email, status')
        .eq('company_id', companyId)
        .not('id', 'in', `(${clientsWithCredits.map(c => `'${c.id}'`).join(',') || "''"})`)
        .limit(100);

      if (clientsError) {
        console.error('Erro ao buscar clientes sem créditos:', clientsError);
      }

      // Adicionar clientes sem créditos com saldo zero
      const allClients = [
        ...clientsWithCredits,
        ...(clientsWithoutCredits || []).map(client => ({
          id: client.id,
          nome: client.nome,
          email: client.email,
          status: client.status,
          balance: 0,
          total_purchased: 0,
          total_used: 0
        }))
      ];

      return allClients.sort((a, b) => a.nome.localeCompare(b.nome));
    } catch (error) {
      console.error('Erro ao buscar créditos dos clientes:', error);
      return [];
    }
  }
}

export const creditService = new CreditService();