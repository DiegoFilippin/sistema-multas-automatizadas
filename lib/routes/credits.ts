import { Router, Request, Response } from 'express';
import { creditService } from '../services/creditService.js';
import { paymentService } from '../services/paymentService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// GET /api/credits/balance - Buscar saldo de créditos
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const { clientId, companyId, ownerType } = req.query;
    
    if (!ownerType || !['client', 'company'].includes(ownerType as string)) {
      return res.status(400).json({
        error: 'Parâmetro ownerType é obrigatório (client ou company)'
      });
    }

    const ownerId = ownerType === 'client' ? clientId as string : companyId as string;
    
    if (!ownerId) {
      return res.status(400).json({
        error: `Parâmetro ${ownerType === 'client' ? 'clientId' : 'companyId'} é obrigatório`
      });
    }

    // Buscar estatísticas de créditos
    const stats = await creditService.getCreditStats(
      ownerType as 'client' | 'company',
      ownerId
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erro ao buscar saldo de créditos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/credits/clients-balance - Buscar créditos de todos os clientes de uma empresa
router.get('/clients-balance', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({
        error: 'Parâmetro companyId é obrigatório'
      });
    }

    const clientsCredits = await creditService.getClientsBalanceByCompany(companyId as string);

    res.json({
      success: true,
      data: clientsCredits
    });
  } catch (error) {
    console.error('Erro ao buscar créditos dos clientes:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/credits/balance/combined - Buscar saldo combinado (cliente + empresa)
router.get('/balance/combined', async (req: Request, res: Response) => {
  try {
    const { clientId, companyId, useCompanyCredits } = req.query;
    
    if (!clientId || !companyId) {
      return res.status(400).json({
        error: 'Parâmetros clientId e companyId são obrigatórios'
      });
    }

    const balanceInfo = await creditService.getAvailableBalance(
      clientId as string,
      companyId as string,
      useCompanyCredits === 'true'
    );

    res.json({
      success: true,
      data: balanceInfo
    });
  } catch (error) {
    console.error('Erro ao buscar saldo combinado:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/credits/transactions - Buscar histórico de transações
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { ownerType, clientId, companyId, limit = '50', offset = '0' } = req.query;
    
    if (!ownerType || !['client', 'company'].includes(ownerType as string)) {
      return res.status(400).json({
        error: 'Parâmetro ownerType é obrigatório (client ou company)'
      });
    }

    const ownerId = ownerType === 'client' ? clientId as string : companyId as string;
    
    if (!ownerId) {
      return res.status(400).json({
        error: `Parâmetro ${ownerType === 'client' ? 'clientId' : 'companyId'} é obrigatório`
      });
    }

    const transactions = await creditService.getTransactionHistory(
      ownerType as 'client' | 'company',
      ownerId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: transactions,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: transactions.length
      }
    });
  } catch (error) {
    console.error('Erro ao buscar histórico de transações:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/credits/packages - Buscar pacotes de créditos disponíveis
router.get('/packages', async (req: Request, res: Response) => {
  try {
    const { targetType } = req.query;
    
    if (!targetType || !['client', 'company'].includes(targetType as string)) {
      return res.status(400).json({
        error: 'Parâmetro targetType é obrigatório (client ou company)'
      });
    }

    const packages = await paymentService.getCreditPackages(
      targetType as 'client' | 'company'
    );

    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    console.error('Erro ao buscar pacotes de créditos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST /api/credits/purchase - Criar compra de créditos
router.post('/purchase', async (req: Request, res: Response) => {
  try {
    const { packageId, customerId, companyId } = req.body;
    const userId = req.user?.id;
    
    if (!packageId || !customerId || !companyId) {
      return res.status(400).json({
        error: 'Campos packageId, customerId e companyId são obrigatórios'
      });
    }

    const purchaseResult = await paymentService.createCreditPurchase({
      packageId,
      customerId,
      companyId,
      userId
    });

    res.json({
      success: true,
      data: purchaseResult
    });
  } catch (error) {
    console.error('Erro ao criar compra de créditos:', error);
    res.status(500).json({
      error: 'Erro ao processar compra de créditos',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/credits/payments - Buscar histórico de pagamentos
router.get('/payments', async (req: Request, res: Response) => {
  try {
    const { customerId, companyId, limit = '20', offset = '0' } = req.query;
    
    if (!customerId && !companyId) {
      return res.status(400).json({
        error: 'Parâmetro customerId ou companyId é obrigatório'
      });
    }

    let payments;
    if (customerId) {
      payments = await paymentService.getPaymentsByCustomer(
        customerId as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );
    } else {
      payments = await paymentService.getPaymentsByCompany(
        companyId as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );
    }

    res.json({
      success: true,
      data: payments,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: payments.length
      }
    });
  } catch (error) {
    console.error('Erro ao buscar histórico de pagamentos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/credits/payments/:paymentId - Buscar pagamento específico
router.get('/payments/:paymentId', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await paymentService.getPaymentById(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        error: 'Pagamento não encontrado'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Erro ao buscar pagamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST /api/credits/add - Adicionar créditos manualmente (apenas para admins)
router.post('/add', async (req: Request, res: Response) => {
  try {
    // Verificar se o usuário é admin
    if (!req.user || !['Super Admin', 'ICETRAN'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso negado. Apenas administradores podem adicionar créditos manualmente.'
      });
    }

    const { ownerType, ownerId, amount, description } = req.body;
    const userId = req.user.id;
    
    if (!ownerType || !ownerId || !amount) {
      return res.status(400).json({
        error: 'Campos ownerType, ownerId e amount são obrigatórios'
      });
    }

    if (!['client', 'company'].includes(ownerType)) {
      return res.status(400).json({
        error: 'ownerType deve ser client ou company'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Valor deve ser maior que zero'
      });
    }

    await creditService.addCredits(
      ownerType,
      ownerId,
      amount,
      undefined, // sem paymentId
      userId,
      description || `Créditos adicionados manualmente por usuário ${req.user.id}`
    );

    res.json({
      success: true,
      message: `${amount} créditos adicionados com sucesso`
    });
  } catch (error) {
    console.error('Erro ao adicionar créditos manualmente:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;