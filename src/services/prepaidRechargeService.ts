/**
 * Serviço responsável por gerenciar recargas de saldo pré-pago via Asaas
 */
import { supabase } from '../lib/supabase';
import { asaasService } from './asaasService';
import { prepaidWalletService } from './prepaidWalletService';

export interface PrepaidRecharge {
  id: string;
  company_id: string;
  amount: number;
  asaas_payment_id: string | null;
  asaas_customer_id: string | null;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  payment_url: string | null;
  qr_code: string | null;
  pix_copy_paste: string | null;
  transaction_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  paid_at: string | null;
  expires_at: string | null;
}

interface CreateRechargeInput {
  companyId: string;
  amount: number;
  notes?: string;
  createdBy?: string;
}

interface ConfirmRechargePaymentInput {
  asaasPaymentId: string;
  paidAt?: string;
}

class PrepaidRechargeService {
  private tableName = 'prepaid_recharges';

  /**
   * Cria uma nova recarga gerando cobrança Asaas para o despachante
   */
  async createRecharge(input: CreateRechargeInput) {
    const { companyId, amount, notes, createdBy } = input;

    if (!amount || amount <= 0) {
      throw new Error('Valor inválido para recarga de saldo pré-pago.');
    }

    // Buscar dados da empresa/despachante
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, nome, asaas_customer_id, email, cnpj, telefone')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      console.error('❌ Erro ao buscar empresa:', companyError);
      throw new Error('Empresa não encontrada para criar recarga.');
    }

    let asaasCustomerId = company.asaas_customer_id;

    // Se não tem customer no Asaas, criar
    if (!asaasCustomerId) {
      console.log('🔧 Criando customer no Asaas para a empresa...');
      console.log('📋 Dados da empresa:', { 
        nome: company.nome, 
        cnpj: company.cnpj, 
        email: company.email, 
        telefone: company.telefone 
      });
      try {
        const customerData = await asaasService.createCustomer({
          name: company.nome || 'Empresa',
          cpfCnpj: company.cnpj || '',
          email: company.email || undefined,
          phone: company.telefone || undefined,
        });
        asaasCustomerId = customerData.id;

        // Atualizar empresa com customer_id
        await supabase
          .from('companies')
          .update({ asaas_customer_id: asaasCustomerId })
          .eq('id', companyId);

        console.log('✅ Customer criado no Asaas:', asaasCustomerId);
      } catch (error) {
        console.error('❌ Erro ao criar customer no Asaas:', error);
        throw new Error('Não foi possível criar customer no Asaas para a recarga.');
      }
    }

    // Criar cobrança PIX no Asaas
    console.log('💳 Criando cobrança PIX no Asaas para recarga...');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Vencimento em 1 dia

    const paymentData = {
      customer: asaasCustomerId,
      billingType: 'PIX' as const,
      value: amount,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Recarga de saldo pré-pago - R$ ${amount.toFixed(2)}`,
      externalReference: `prepaid_recharge_${Date.now()}`,
    };

    console.log('📋 Dados da cobrança:', paymentData);

    let asaasPayment;
    try {
      asaasPayment = await asaasService.createPayment(paymentData);

      console.log('✅ Cobrança Asaas criada:', asaasPayment.id);
    } catch (error) {
      console.error('❌ Erro ao criar cobrança no Asaas:', error);
      console.error('❌ Detalhes do erro:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        paymentData
      });
      throw new Error('Não foi possível criar cobrança no Asaas para a recarga.');
    }

    // Extrair dados do PIX (já vem do asaasService.createPayment)
    const qrCode = asaasPayment.pix?.qrCode || null;
    const pixCopyPaste = asaasPayment.pix?.payload || null;

    console.log('📊 Dados do PIX extraídos:', {
      hasPixObject: !!asaasPayment.pix,
      qrCode: qrCode ? `Presente (${qrCode.length} chars)` : 'Ausente',
      pixCopyPaste: pixCopyPaste ? `Presente (${pixCopyPaste.length} chars)` : 'Ausente',
      invoiceUrl: asaasPayment.invoiceUrl || 'Ausente',
      paymentId: asaasPayment.id
    });

    // Salvar recarga no banco
    const rechargeData = {
      company_id: companyId,
      amount,
      asaas_payment_id: asaasPayment.id,
      asaas_customer_id: asaasCustomerId,
      status: 'pending' as const,
      payment_url: asaasPayment.invoiceUrl || null,
      qr_code: qrCode,
      pix_copy_paste: pixCopyPaste,
      notes: notes || null,
      created_by: createdBy || null,
      expires_at: asaasPayment.dueDate ? new Date(asaasPayment.dueDate).toISOString() : null,
    };

    const { data: recharge, error: rechargeError } = await supabase
      .from(this.tableName)
      .insert(rechargeData)
      .select()
      .single();

    if (rechargeError) {
      console.error('❌ Erro ao salvar recarga no banco:', rechargeError);
      throw new Error('Não foi possível registrar a recarga no sistema.');
    }

    console.log('✅ Recarga criada com sucesso:', recharge.id);
    return recharge as PrepaidRecharge;
  }

  /**
   * Confirma pagamento de recarga e credita saldo
   */
  async confirmRechargePayment(input: ConfirmRechargePaymentInput) {
    const { asaasPaymentId, paidAt } = input;

    // Buscar recarga pelo asaas_payment_id
    const { data: recharge, error: rechargeError } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('asaas_payment_id', asaasPaymentId)
      .eq('status', 'pending')
      .maybeSingle();

    if (rechargeError) {
      console.error('❌ Erro ao buscar recarga:', rechargeError);
      throw new Error('Erro ao buscar recarga para confirmação.');
    }

    if (!recharge) {
      console.warn('⚠️ Recarga não encontrada ou já processada:', asaasPaymentId);
      return null;
    }

    console.log('💰 Creditando saldo pré-pago para recarga:', recharge.id);

    // Creditar saldo via prepaidWalletService
    let creditResult;
    try {
      creditResult = await prepaidWalletService.addFunds({
        companyId: recharge.company_id,
        amount: recharge.amount,
        notes: `Recarga via cobrança Asaas ${asaasPaymentId}`,
        createdBy: recharge.created_by || undefined,
      });
      console.log('✅ Saldo creditado:', creditResult.balance);
    } catch (error) {
      console.error('❌ Erro ao creditar saldo:', error);
      throw new Error('Não foi possível creditar o saldo da recarga.');
    }

    // Atualizar status da recarga
    const { data: updatedRecharge, error: updateError } = await supabase
      .from(this.tableName)
      .update({
        status: 'paid',
        paid_at: paidAt || new Date().toISOString(),
        transaction_id: creditResult.transaction.id,
      })
      .eq('id', recharge.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar status da recarga:', updateError);
      // Não falhar aqui pois o saldo já foi creditado
    }

    console.log('✅ Recarga confirmada e saldo creditado com sucesso');
    return updatedRecharge as PrepaidRecharge;
  }

  /**
   * Lista recargas de uma empresa
   */
  async getRecharges(companyId: string, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Erro ao listar recargas:', error);
      throw new Error('Não foi possível listar as recargas.');
    }

    return (data || []) as PrepaidRecharge[];
  }

  /**
   * Busca recarga por ID
   */
  async getRechargeById(rechargeId: string) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', rechargeId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar recarga:', error);
      throw new Error('Recarga não encontrada.');
    }

    return data as PrepaidRecharge;
  }

  /**
   * Cancela uma recarga pendente
   */
  async cancelRecharge(rechargeId: string) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ status: 'cancelled' })
      .eq('id', rechargeId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao cancelar recarga:', error);
      throw new Error('Não foi possível cancelar a recarga.');
    }

    return data as PrepaidRecharge;
  }
}

export const prepaidRechargeService = new PrepaidRechargeService();
