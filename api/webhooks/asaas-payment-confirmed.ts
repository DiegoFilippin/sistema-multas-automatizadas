/**
 * Webhook para receber confirmação de pagamento do Asaas
 * Usado para creditar saldo pré-pago quando uma recarga é paga
 */
import { Request, Response } from 'express';
import { prepaidRechargeService } from '../../src/services/prepaidRechargeService';

export default async function handler(req: Request, res: Response) {
  console.log('🔔 Webhook Asaas - Confirmação de Pagamento');
  console.log('📦 Payload recebido:', JSON.stringify(req.body, null, 2));

  try {
    const { event, payment } = req.body;

    // Verificar se é evento de confirmação de pagamento
    if (event !== 'PAYMENT_CONFIRMED' && event !== 'PAYMENT_RECEIVED') {
      console.log('ℹ️ Evento ignorado:', event);
      return res.status(200).json({ received: true, message: 'Evento não processado' });
    }

    if (!payment || !payment.id) {
      console.error('❌ Payload inválido: payment.id não encontrado');
      return res.status(400).json({ error: 'Payload inválido' });
    }

    const asaasPaymentId = payment.id;
    const paidAt = payment.confirmedDate || payment.paymentDate || new Date().toISOString();

    console.log('💰 Processando confirmação de pagamento:', asaasPaymentId);

    // Tentar confirmar recarga
    const recharge = await prepaidRechargeService.confirmRechargePayment({
      asaasPaymentId,
      paidAt
    });

    if (!recharge) {
      console.log('ℹ️ Pagamento não corresponde a uma recarga pendente');
      return res.status(200).json({ 
        received: true, 
        message: 'Pagamento não corresponde a uma recarga' 
      });
    }

    console.log('✅ Recarga confirmada e saldo creditado:', recharge.id);
    return res.status(200).json({ 
      success: true, 
      recharge,
      message: 'Saldo creditado com sucesso' 
    });

  } catch (error) {
    console.error('❌ Erro ao processar webhook Asaas:', error);
    const message = error instanceof Error ? error.message : 'Erro ao processar webhook';
    return res.status(500).json({ error: message });
  }
}
