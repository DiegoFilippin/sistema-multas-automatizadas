import { Request, Response } from 'express';
import { supabase } from '../../src/lib/supabase';
import { billingService } from '../../src/services/billingService';
import { recursosService } from '../../src/services/recursosService';

interface AsaasWebhookEvent {
  event: string;
  payment: {
    id: string;
    customer: string;
    value: number;
    netValue: number;
    originalValue?: number;
    interestValue?: number;
    description: string;
    billingType: string;
    status: string;
    pixTransaction?: string;
    confirmedDate?: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    installmentNumber?: number;
    invoiceUrl: string;
    bankSlipUrl?: string;
    transactionReceiptUrl?: string;
    dueDate: string;
    originalDueDate: string;
    paymentLink?: string;
    externalReference?: string;
    discount?: {
      value: number;
      limitDate: string;
    };
    fine?: {
      value: number;
    };
    interest?: {
      value: number;
    };
    deleted: boolean;
    anticipated: boolean;
    anticipable: boolean;
  };
}

/**
 * Webhook para receber notificações do Asaas
 */
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookData: AsaasWebhookEvent = req.body;
    
    console.log('Webhook Asaas recebido:', {
      event: webhookData.event,
      paymentId: webhookData.payment.id,
      status: webhookData.payment.status
    });

    // Validar se é um evento de pagamento
    if (!webhookData.payment || !webhookData.payment.id) {
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    // Salvar evento do webhook
    await saveWebhookEvent(webhookData);

    // Processar evento baseado no tipo
    await processWebhookEvent(webhookData);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao processar webhook do Asaas:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Salva evento do webhook no banco de dados
 */
async function saveWebhookEvent(webhookData: AsaasWebhookEvent): Promise<void> {
  try {
    const { error } = await supabase
      .from('asaas_webhooks')
      .insert({
        event_type: webhookData.event,
        payment_id: webhookData.payment.id,
        webhook_data: webhookData,
        processed: false,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erro ao salvar webhook event:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao salvar evento do webhook:', error);
    throw error;
  }
}

/**
 * Processa evento do webhook baseado no tipo
 */
async function processWebhookEvent(webhookData: AsaasWebhookEvent): Promise<void> {
  const { event, payment } = webhookData;
  const paymentId = payment.id;

  try {
    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await handlePaymentConfirmed(paymentId, payment);
        break;

      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(paymentId);
        break;

      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        await handlePaymentCancelled(paymentId);
        break;

      case 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL':
      case 'PAYMENT_DUNNING_RECEIVED':
      case 'PAYMENT_DUNNING_REQUESTED':
      case 'PAYMENT_BANK_SLIP_VIEWED':
      case 'PAYMENT_CHECKOUT_VIEWED':
        // Eventos informativos - apenas log
        console.log(`Evento informativo recebido: ${event} para pagamento ${paymentId}`);
        break;

      default:
        console.log(`Evento não tratado: ${event} para pagamento ${paymentId}`);
    }

    // Marcar webhook como processado
    await markWebhookAsProcessed(paymentId, event);
  } catch (error) {
    console.error(`Erro ao processar evento ${event} para pagamento ${paymentId}:`, error);
    throw error;
  }
}

/**
 * Trata pagamento confirmado/recebido
 */
async function handlePaymentConfirmed(paymentId: string, paymentData: AsaasWebhookEvent['payment']): Promise<void> {
  try {
    console.log(`Processando pagamento confirmado: ${paymentId}`);

    // Atualizar status do pagamento no banco
    await billingService.updatePaymentStatus(paymentId, 'confirmed');

    // Buscar transação para obter multa_id
    const { data: transaction, error } = await supabase
      .from('asaas_payments')
      .select('multa_id')
      .eq('asaas_payment_id', paymentId)
      .single();

    if (error) {
      console.error('Erro ao buscar transação:', error);
      return;
    }

    if (transaction && transaction.multa_id) {
      // Ativar recurso associado
      const recurso = await recursosService.confirmPaymentAndActivateRecurso(transaction.multa_id);
      
      if (recurso) {
        console.log(`Recurso ${recurso.id} ativado após confirmação de pagamento`);
        
        // Aqui você pode adicionar lógica adicional, como:
        // - Enviar email de confirmação
        // - Notificar usuário
        // - Iniciar processamento automático do recurso
      }
    }

    console.log(`Pagamento ${paymentId} processado com sucesso`);
  } catch (error) {
    console.error(`Erro ao processar pagamento confirmado ${paymentId}:`, error);
    throw error;
  }
}

/**
 * Trata pagamento em atraso
 */
async function handlePaymentOverdue(paymentId: string): Promise<void> {
  try {
    console.log(`Processando pagamento em atraso: ${paymentId}`);

    // Atualizar status do pagamento
    await billingService.updatePaymentStatus(paymentId, 'overdue');

    // Aqui você pode adicionar lógica para:
    // - Enviar notificação de atraso
    // - Suspender acesso ao recurso
    // - Aplicar juros/multa

    console.log(`Pagamento em atraso ${paymentId} processado`);
  } catch (error) {
    console.error(`Erro ao processar pagamento em atraso ${paymentId}:`, error);
    throw error;
  }
}

/**
 * Trata pagamento cancelado/estornado
 */
async function handlePaymentCancelled(paymentId: string): Promise<void> {
  try {
    console.log(`Processando pagamento cancelado: ${paymentId}`);

    // Atualizar status do pagamento
    await billingService.updatePaymentStatus(paymentId, 'cancelled');

    // Buscar e cancelar recurso associado se necessário
    const { data: transaction, error } = await supabase
      .from('asaas_payments')
      .select('multa_id')
      .eq('asaas_payment_id', paymentId)
      .single();

    if (error) {
      console.error('Erro ao buscar transação para cancelamento:', error);
      return;
    }

    if (transaction && transaction.multa_id) {
      // Buscar e cancelar recursos em 'aguardando_pagamento'
      const { data: recursos, error: recursosError } = await supabase
        .from('recursos')
        .select('id')
        .eq('multa_id', transaction.multa_id)
        .eq('status', 'aguardando_pagamento');

      if (recursosError) {
        console.error('Erro ao buscar recursos para cancelamento:', recursosError);
        return;
      }

      if (recursos && recursos.length > 0) {
        for (const recurso of recursos) {
          await recursosService.updateRecurso(recurso.id, {
            status: 'cancelado'
          });
        }
        console.log(`${recursos.length} recursos cancelados devido ao cancelamento do pagamento`);
      }
    }

    console.log(`Pagamento cancelado ${paymentId} processado`);
  } catch (error) {
    console.error(`Erro ao processar pagamento cancelado ${paymentId}:`, error);
    throw error;
  }
}

/**
 * Marca webhook como processado
 */
async function markWebhookAsProcessed(paymentId: string, eventType: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('asaas_webhooks')
      .update({
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('payment_id', paymentId)
      .eq('event_type', eventType);

    if (error) {
      console.error('Erro ao marcar webhook como processado:', error);
    }
  } catch (error) {
    console.error('Erro ao atualizar status do webhook:', error);
  }
}