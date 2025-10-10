import { supabase } from '../config/supabase.js';
import { asaasService } from './asaasService.js';
import { creditService } from './creditService.js';

// Interfaces
export interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credit_amount: number;
  price: number;
  discount_percentage: number;
  target_type: 'client' | 'company';
  is_active: boolean;
}

export interface Payment {
  id: string;
  asaas_payment_id?: string;
  customer_id: string;
  company_id: string;
  amount: number;
  credit_amount: number;
  discount_percentage: number;
  payment_method: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'refunded';
  pix_qr_code?: string;
  pix_copy_paste?: string;
  due_date: string;
  confirmed_at?: string;
  cancelled_at?: string;
  asaas_webhook_data?: any;
  created_at: string;
  updated_at: string;
}

export interface PurchaseCreditRequest {
  packageId: string;
  customerId: string;
  companyId: string;
  userId?: string;
}

export interface PurchaseCreditResponse {
  paymentId: string;
  amount: number;
  creditAmount: number;
  pixQrCode: string;
  pixCopyPaste: string;
  dueDate: string;
  status: 'pending';
}

class PaymentService {
  // Buscar pacotes de créditos disponíveis
  async getCreditPackages(targetType: 'client' | 'company'): Promise<CreditPackage[]> {
    try {
      const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('target_type', targetType)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar pacotes: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar pacotes de créditos:', error);
      return [];
    }
  }

  // Buscar pacote específico
  async getCreditPackageById(packageId: string): Promise<CreditPackage | null> {
    try {
      const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('id', packageId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Erro ao buscar pacote:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar pacote por ID:', error);
      return null;
    }
  }

  // Criar pagamento PIX para compra de créditos
  async createCreditPurchase(request: PurchaseCreditRequest): Promise<PurchaseCreditResponse> {
    try {
      // 1. Buscar pacote de créditos
      const creditPackage = await this.getCreditPackageById(request.packageId);
      if (!creditPackage) {
        throw new Error('Pacote de créditos não encontrado');
      }

      // 2. Buscar dados do cliente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*, companies(name)')
        .eq('id', request.customerId)
        .single();

      if (clientError || !client) {
        throw new Error('Cliente não encontrado');
      }

      if (!client.asaas_customer_id) {
        throw new Error('Cliente não possui ID do Asaas configurado');
      }

      // 3. Calcular valores
      const amount = creditPackage.price;
      const creditAmount = creditPackage.credit_amount;
      const discountPercentage = creditPackage.discount_percentage;

      // 4. Criar cobrança PIX no Asaas
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1); // Vencimento em 1 dia

      const asaasPayment = await asaasService.createPixPayment({
        customer: client.asaas_customer_id,
        billingType: 'PIX',
        value: amount,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `Compra de ${creditAmount} créditos - ${creditPackage.name}`,
        externalReference: `credit_purchase_${Date.now()}`,
        discount: {
          value: (amount * discountPercentage) / 100,
          dueDateLimitDays: 0
        }
      });

      if (!asaasPayment) {
        throw new Error('Erro ao criar cobrança PIX no Asaas');
      }

      // 5. Salvar pagamento no banco
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          asaas_payment_id: asaasPayment.id,
          customer_id: request.customerId,
          company_id: request.companyId,
          amount: amount,
          credit_amount: creditAmount,
          discount_percentage: discountPercentage,
          payment_method: 'PIX',
          status: 'pending',
          pix_qr_code: asaasPayment.pixQrCodeId,
          pix_copy_paste: asaasPayment.pixCopyAndPaste,
          due_date: dueDate.toISOString().split('T')[0]
        })
        .select()
        .single();

      if (paymentError) {
        throw new Error(`Erro ao salvar pagamento: ${paymentError.message}`);
      }

      // 6. Criar transação de crédito pendente para aparecer no histórico
      const ownerType = payment.customer_id ? 'client' : 'company';
      const ownerId = payment.customer_id || payment.company_id;
      
      try {
        await creditService.createPendingCreditTransaction(
          ownerType,
          ownerId,
          payment.credit_amount,
          payment.id,
          request.userId,
          `Compra de ${payment.credit_amount} créditos - Aguardando pagamento`
        );
      } catch (error) {
        console.error('Erro ao criar transação pendente:', error);
        // Não falha a compra se não conseguir criar a transação
      }

      // 7. Retornar dados do pagamento
      return {
        paymentId: payment.id,
        amount: amount,
        creditAmount: creditAmount,
        pixQrCode: asaasPayment.pixQrCodeId || '',
        pixCopyPaste: asaasPayment.pixCopyAndPaste || '',
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'pending'
      };
    } catch (error) {
      console.error('Erro ao criar compra de créditos:', error);
      throw error;
    }
  }

  // Processar confirmação de pagamento via webhook
  async processPaymentConfirmation(asaasPaymentId: string, webhookData: any): Promise<void> {
    try {
      // 1. Buscar pagamento no banco
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('asaas_payment_id', asaasPaymentId)
        .single();

      if (paymentError || !payment) {
        console.error('Pagamento não encontrado:', asaasPaymentId);
        return;
      }

      // 2. Verificar se já foi processado
      if (payment.status === 'confirmed') {
        console.log('Pagamento já foi processado:', asaasPaymentId);
        return;
      }

      // 3. Atualizar status do pagamento
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          asaas_webhook_data: webhookData
        })
        .eq('id', payment.id);

      if (updateError) {
        throw new Error(`Erro ao atualizar pagamento: ${updateError.message}`);
      }

      // 4. Adicionar créditos à conta
      const ownerType = payment.customer_id ? 'client' : 'company';
      const ownerId = payment.customer_id || payment.company_id;

      await creditService.addCredits(
        ownerType,
        ownerId,
        payment.credit_amount,
        payment.id,
        undefined, // userId será definido pelo webhook
        `Compra confirmada - ${payment.credit_amount} créditos`
      );

      console.log(`Créditos adicionados com sucesso: ${payment.credit_amount} para ${ownerType} ${ownerId}`);
    } catch (error) {
      console.error('Erro ao processar confirmação de pagamento:', error);
      throw error;
    }
  }

  // Processar cancelamento de pagamento
  async processPaymentCancellation(asaasPaymentId: string, webhookData: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          asaas_webhook_data: webhookData
        })
        .eq('asaas_payment_id', asaasPaymentId);

      if (error) {
        throw new Error(`Erro ao cancelar pagamento: ${error.message}`);
      }

      console.log(`Pagamento cancelado: ${asaasPaymentId}`);
    } catch (error) {
      console.error('Erro ao processar cancelamento:', error);
      throw error;
    }
  }

  // Buscar pagamentos por cliente
  async getPaymentsByCustomer(
    customerId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Erro ao buscar pagamentos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar pagamentos do cliente:', error);
      return [];
    }
  }

  // Buscar pagamentos por empresa
  async getPaymentsByCompany(
    companyId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Erro ao buscar pagamentos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar pagamentos da empresa:', error);
      return [];
    }
  }

  // Buscar pagamento por ID
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) {
        console.error('Erro ao buscar pagamento:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar pagamento por ID:', error);
      return null;
    }
  }

  // Verificar status de pagamentos pendentes
  async checkPendingPayments(): Promise<void> {
    try {
      // Buscar pagamentos pendentes há mais de 1 hora
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data: pendingPayments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'pending')
        .lt('created_at', oneHourAgo.toISOString());

      if (error) {
        console.error('Erro ao buscar pagamentos pendentes:', error);
        return;
      }

      // Verificar status no Asaas
      for (const payment of pendingPayments || []) {
        if (payment.asaas_payment_id) {
          try {
            const asaasPayment = await asaasService.getPaymentById(payment.asaas_payment_id);
            
            if (asaasPayment?.status === 'CONFIRMED') {
              await this.processPaymentConfirmation(payment.asaas_payment_id, asaasPayment);
            } else if (asaasPayment?.status === 'OVERDUE') {
              await this.processPaymentCancellation(payment.asaas_payment_id, asaasPayment);
            }
          } catch (error) {
            console.error(`Erro ao verificar pagamento ${payment.asaas_payment_id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar pagamentos pendentes:', error);
    }
  }
}

export const paymentService = new PaymentService();