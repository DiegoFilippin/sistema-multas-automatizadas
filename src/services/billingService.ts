import { supabase } from '../lib/supabase';
import { asaasService } from './asaasService';
import { pricingService } from './pricingService';
import type { AsaasPayment, AsaasCustomer } from './asaasService';

export interface BillingData {
  user_id: string;
  company_id: string;
  dispatcher_id?: string;
  resource_type: 'defesa_previa' | 'recurso_primeira_instancia' | 'recurso_segunda_instancia';
  multa_id: string;
  client_name: string;
  client_email: string;
  client_cpf: string;
  client_phone?: string;
}

export interface PaymentResult {
  payment_id: string;
  invoice_url: string;
  bank_slip_url?: string;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'confirmed' | 'received';
}

export interface BillingTransaction {
  id: string;
  user_id: string;
  company_id: string;
  dispatcher_id?: string;
  multa_id: string;
  resource_type: string;
  amount: number;
  asaas_payment_id: string;
  asaas_customer_id: string;
  status: 'pending' | 'confirmed' | 'received' | 'overdue' | 'cancelled';
  invoice_url: string;
  bank_slip_url?: string;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  due_date: string;
  created_at: string;
  updated_at: string;
}

class BillingService {
  private asaasService = asaasService;
  private pricingService = pricingService;

  /**
   * Cria uma cobrança para geração de recurso
   */
  async createResourceBilling(billingData: BillingData): Promise<PaymentResult> {
    try {
      // 1. Calcular o preço baseado nos níveis de configuração
      const pricing = await this.pricingService.calculateResourcePrice(
        billingData.resource_type,
        billingData.company_id,
        billingData.dispatcher_id
      );

      if (!pricing || pricing <= 0) {
        throw new Error('Preço não configurado para este tipo de recurso');
      }

      // 2. Criar ou buscar cliente no Asaas
      const asaasCustomer = await this.getOrCreateAsaasCustomer({
        name: billingData.client_name,
        email: billingData.client_email,
        cpfCnpj: billingData.client_cpf,
        phone: billingData.client_phone
      });

      // 3. Criar cobrança no Asaas
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // Vencimento em 7 dias

      const paymentData = {
        customer: asaasCustomer.id,
        billingType: 'UNDEFINED' as const, // Permite múltiplas formas de pagamento
        value: pricing,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `Geração de ${billingData.resource_type.replace('_', ' ')} - Multa`,
        externalReference: billingData.multa_id,
        postalService: false
      };

      const asaasPayment = await this.asaasService.createPayment(paymentData);

      // 4. Salvar transação no banco de dados
      const transaction = await this.saveTransaction({
        user_id: billingData.user_id,
        company_id: billingData.company_id,
        dispatcher_id: billingData.dispatcher_id,
        multa_id: billingData.multa_id,
        resource_type: billingData.resource_type,
        amount: pricing,
        asaas_payment_id: asaasPayment.id,
        asaas_customer_id: asaasCustomer.id,
        status: 'pending',
        invoice_url: asaasPayment.invoiceUrl,
        bank_slip_url: asaasPayment.bankSlipUrl,
        pix_qr_code: asaasPayment.pix?.qrCode,
        pix_copy_paste: asaasPayment.pix?.payload,
        due_date: paymentData.dueDate
      });

      return {
        payment_id: asaasPayment.id,
        invoice_url: asaasPayment.invoiceUrl,
        bank_slip_url: asaasPayment.bankSlipUrl,
        pix_qr_code: asaasPayment.pix?.qrCode,
        pix_copy_paste: asaasPayment.pix?.payload,
        amount: pricing,
        due_date: paymentData.dueDate,
        status: 'pending'
      };
    } catch (error) {
      console.error('Erro ao criar cobrança:', error);
      throw new Error(`Falha ao criar cobrança: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca ou cria cliente no Asaas
   */
  private async getOrCreateAsaasCustomer(customerData: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
  }): Promise<AsaasCustomer> {
    try {
      // Primeiro, tenta buscar cliente existente
      const existingCustomers = await this.asaasService.getCustomers({
        email: customerData.email
      });

      if (existingCustomers.data && existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Se não encontrou, cria novo cliente
      return await this.asaasService.createCustomer(customerData);
    } catch (error) {
      console.error('Erro ao buscar/criar cliente no Asaas:', error);
      throw error;
    }
  }

  /**
   * Salva transação no banco de dados
   */
  private async saveTransaction(transactionData: Omit<BillingTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<BillingTransaction> {
    try {
      const { data, error } = await supabase
        .from('asaas_payments')
        .insert({
          ...transactionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      throw error;
    }
  }

  /**
   * Atualiza status de pagamento
   */
  async updatePaymentStatus(paymentId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('asaas_payments')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('asaas_payment_id', paymentId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Erro ao atualizar status do pagamento:', error);
      throw error;
    }
  }

  /**
   * Busca transações por empresa
   */
  async getTransactionsByCompany(companyId: string): Promise<BillingTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('asaas_payments')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      throw error;
    }
  }

  /**
   * Busca transação por ID da multa
   */
  async getTransactionByMultaId(multaId: string): Promise<BillingTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('asaas_payments')
        .select('*')
        .eq('multa_id', multaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(error.message);
      }

      return data || null;
    } catch (error) {
      console.error('Erro ao buscar transação por multa:', error);
      return null;
    }
  }

  /**
   * Verifica se pagamento foi confirmado
   */
  async isPaymentConfirmed(multaId: string): Promise<boolean> {
    try {
      const transaction = await this.getTransactionByMultaId(multaId);
      return transaction?.status === 'confirmed' || transaction?.status === 'received';
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      return false;
    }
  }

  /**
   * Cancela pagamento
   */
  async cancelPayment(paymentId: string): Promise<void> {
    try {
      // Cancela no Asaas
      await this.asaasService.deletePayment(paymentId);

      // Atualiza status no banco
      await this.updatePaymentStatus(paymentId, 'cancelled');
    } catch (error) {
      console.error('Erro ao cancelar pagamento:', error);
      throw error;
    }
  }
}

export const billingService = new BillingService();
export default BillingService;