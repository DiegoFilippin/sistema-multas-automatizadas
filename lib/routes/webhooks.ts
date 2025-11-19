import { Router, Request, Response } from 'express';
import { paymentService } from '../services/paymentService.js';
import { asaasService } from '../services/asaasService.js';
import { prepaidRechargeService } from '../../src/services/prepaidRechargeService';

const router = Router();

// POST /api/webhooks/asaas-credits - Webhook do Asaas para pagamentos de créditos
router.post('/asaas-credits', async (req: Request, res: Response) => {
  try {
    console.log('Webhook Asaas recebido:', JSON.stringify(req.body, null, 2));
    
    const webhookData = req.body;
    
    // Validar estrutura básica do webhook
    if (!webhookData.event || !webhookData.payment) {
      console.error('Webhook inválido: estrutura incorreta');
      return res.status(400).json({
        error: 'Estrutura do webhook inválida'
      });
    }

    const { event, payment } = webhookData;
    const asaasPaymentId = payment.id;

    if (!asaasPaymentId) {
      console.error('Webhook inválido: ID do pagamento não encontrado');
      return res.status(400).json({
        error: 'ID do pagamento não encontrado'
      });
    }

    // Processar diferentes tipos de eventos
    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        console.log(`Processando confirmação de pagamento: ${asaasPaymentId}`);
        
        // Tentar processar como recarga de saldo pré-pago primeiro
        try {
          const recharge = await prepaidRechargeService.confirmRechargePayment({
            asaasPaymentId,
            paidAt: payment.confirmedDate || payment.paymentDate || new Date().toISOString()
          });
          
          if (recharge) {
            console.log('✅ Recarga de saldo pré-pago confirmada:', recharge.id);
            break; // Sair do switch se for recarga
          }
        } catch (error) {
          console.log('ℹ️ Não é uma recarga de saldo pré-pago, processando como pagamento normal');
        }
        
        // Se não for recarga, processar como pagamento normal
        await paymentService.processPaymentConfirmation(asaasPaymentId, webhookData);
        break;

      case 'PAYMENT_UPDATED':
        console.log(`Pagamento atualizado: ${asaasPaymentId}`);
        // Verificar se o status mudou para confirmado
        if (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED') {
          await paymentService.processPaymentConfirmation(asaasPaymentId, webhookData);
        }
        break;

      case 'PAYMENT_DELETED':
      case 'PAYMENT_OVERDUE':
        console.log(`Processando cancelamento de pagamento: ${asaasPaymentId}`);
        await paymentService.processPaymentCancellation(asaasPaymentId, webhookData);
        break;

      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_REFUND_IN_PROGRESS':
        console.log(`Processando estorno de pagamento: ${asaasPaymentId}`);
        await paymentService.processPaymentCancellation(asaasPaymentId, webhookData);
        break;

      default:
        console.log(`Evento não tratado: ${event} para pagamento ${asaasPaymentId}`);
    }

    // Processar evento no serviço Asaas (para logs e auditoria)
    await asaasService.processWebhookEvent(webhookData);

    // Responder com sucesso
    res.status(200).json({
      success: true,
      message: 'Webhook processado com sucesso',
      event,
      paymentId: asaasPaymentId
    });

  } catch (error) {
    console.error('Erro ao processar webhook do Asaas:', error);
    
    // Retornar erro 500 para que o Asaas tente reenviar
    res.status(500).json({
      error: 'Erro interno ao processar webhook',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/webhooks/asaas-credits/test - Endpoint para testar webhook
router.get('/asaas-credits/test', async (req: Request, res: Response) => {
  try {
    // Verificar conectividade com Asaas
    const healthCheck = await asaasService.healthCheck();
    
    res.json({
      success: true,
      message: 'Webhook endpoint está funcionando',
      asaasConnected: healthCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro no teste do webhook:', error);
    res.status(500).json({
      error: 'Erro no teste do webhook',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST /api/webhooks/asaas-credits/simulate - Simular webhook para testes
router.post('/asaas-credits/simulate', async (req: Request, res: Response) => {
  try {
    // Apenas em ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Simulação não permitida em produção'
      });
    }

    const { asaasPaymentId, event = 'PAYMENT_CONFIRMED' } = req.body;
    
    if (!asaasPaymentId) {
      return res.status(400).json({
        error: 'asaasPaymentId é obrigatório'
      });
    }

    // Buscar dados do pagamento no Asaas
    const paymentData = await asaasService.getPaymentById(asaasPaymentId);
    
    if (!paymentData) {
      return res.status(404).json({
        error: 'Pagamento não encontrado no Asaas'
      });
    }

    // Simular webhook
    const simulatedWebhook = {
      id: `webhook_${Date.now()}`,
      dateCreated: new Date().toISOString(),
      event,
      payment: paymentData
    };

    // Processar como se fosse um webhook real
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      await paymentService.processPaymentConfirmation(asaasPaymentId, simulatedWebhook);
    } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_OVERDUE') {
      await paymentService.processPaymentCancellation(asaasPaymentId, simulatedWebhook);
    }

    res.json({
      success: true,
      message: 'Webhook simulado com sucesso',
      simulatedWebhook
    });

  } catch (error) {
    console.error('Erro ao simular webhook:', error);
    res.status(500).json({
      error: 'Erro ao simular webhook',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST /api/webhooks/check-pending-payments - Verificar pagamentos pendentes manualmente
router.post('/check-pending-payments', async (req: Request, res: Response) => {
  try {
    console.log('Iniciando verificação manual de pagamentos pendentes...');
    
    await paymentService.checkPendingPayments();
    
    res.json({
      success: true,
      message: 'Verificação de pagamentos pendentes concluída'
    });

  } catch (error) {
    console.error('Erro ao verificar pagamentos pendentes:', error);
    res.status(500).json({
      error: 'Erro ao verificar pagamentos pendentes',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;