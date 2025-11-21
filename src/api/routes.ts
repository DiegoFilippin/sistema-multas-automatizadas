import express from 'express';
import { authService } from '../services/authService';
import { multasService } from '../services/multasService';
import { recursosService } from '../services/recursosService';
import { clientsService } from '../services/clientsService';
import { companiesService } from '../services/companiesService';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

// Importar rotas de créditos, webhooks, payments, leads e force-sync
import creditsRouter from '../../lib/routes/credits';
import webhooksRouter from '../../lib/routes/webhooks';
import paymentsRouter from '../../lib/routes/payments';
import serviceOrdersPrepaidRouter from './routes/service-orders-prepaid';
import serviceOrdersDraftRouter from './routes/service-orders-draft';
import forceSyncRouter from '../../lib/routes/force-sync';
import { supabase } from '../lib/supabase';
import { n8nWebhookService } from '../services/n8nWebhookService';
import { prepaidWalletService } from '../services/prepaidWalletService';
import { prepaidRechargeService } from '../services/prepaidRechargeService';

const router = express.Router();

// Em desenvolvimento, permitir acesso ao proxy n8n sem autenticação
const maybeAuthForN8nProxy: import('express').RequestHandler = process.env.ENABLE_N8N_PROXY_AUTH === 'true'
  ? authenticateToken
  : (req, _res, next) => next();

// Rotas de Autenticação
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/auth/register', async (req, res) => {
  try {
    const userData = req.body;
    const user = await authService.register(userData);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await authService.getCurrentUser();
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.put('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userData = req.body;
    const user = await authService.updateProfile(userId, userData);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Rotas de saldo pré-pago do despachante
router.get('/wallets/prepaid/balance', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        error: 'COMPANY_ID_REQUIRED',
        message: 'Usuário não está associado a uma empresa para consultar o saldo pré-pago.'
      });
    }

    const balance = await prepaidWalletService.getBalance(companyId);
    return res.json({ success: true, ...balance });
  } catch (error) {
    console.error('Erro ao consultar saldo pré-pago:', error);
    return res.status(500).json({ error: 'Não foi possível consultar o saldo pré-pago.' });
  }
});

router.get('/wallets/prepaid/transactions', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        error: 'COMPANY_ID_REQUIRED',
        message: 'Usuário não está associado a uma empresa para consultar o extrato pré-pago.'
      });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    const transactions = await prepaidWalletService.getTransactions(companyId, limit, offset);

    return res.json({
      success: true,
      transactions,
      pagination: {
        limit,
        offset,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error('Erro ao listar transações de saldo pré-pago:', error);
    return res.status(500).json({ error: 'Não foi possível listar as transações de saldo pré-pago.' });
  }
});

// Rota para criar recarga de saldo pré-pago (gera cobrança Asaas)
router.post('/wallets/prepaid/create-recharge', authenticateToken, authorizeRoles(['Despachante', 'ICETRAN', 'Superadmin']), async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        error: 'COMPANY_ID_REQUIRED',
        message: 'Usuário não está associado a uma empresa para criar recarga.'
      });
    }

    const amountRaw = req.body?.amount;
    const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;
    const amount = Number(amountRaw);

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        error: 'INVALID_AMOUNT',
        message: 'Informe um valor válido para a recarga.'
      });
    }

    const recharge = await prepaidRechargeService.createRecharge({
      companyId,
      amount,
      notes,
      createdBy: req.user?.id
    });

    return res.status(201).json({
      success: true,
      recharge
    });
  } catch (error) {
    console.error('Erro ao criar recarga:', error);
    const message = error instanceof Error ? error.message : 'Não foi possível criar a recarga.';
    return res.status(500).json({ error: message });
  }
});

// Rota para listar recargas
router.get('/wallets/prepaid/recharges', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        error: 'COMPANY_ID_REQUIRED',
        message: 'Usuário não está associado a uma empresa.'
      });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    const recharges = await prepaidRechargeService.getRecharges(companyId, limit, offset);

    return res.json({
      success: true,
      recharges,
      pagination: {
        limit,
        offset,
        count: recharges.length
      }
    });
  } catch (error) {
    console.error('Erro ao listar recargas:', error);
    return res.status(500).json({ error: 'Não foi possível listar as recargas.' });
  }
});

// Rota manual para adicionar saldo (apenas para testes/admin)
router.post('/wallets/prepaid/add-funds', authenticateToken, authorizeRoles(['Superadmin']), async (req, res) => {
  try {
    const companyId = req.body?.companyId || req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        error: 'COMPANY_ID_REQUIRED',
        message: 'Informe o ID da empresa para adicionar saldo.'
      });
    }

    const amountRaw = req.body?.amount;
    const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;
    const amount = Number(amountRaw);

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        error: 'INVALID_AMOUNT',
        message: 'Informe um valor válido para adicionar ao saldo pré-pago.'
      });
    }

    const result = await prepaidWalletService.addFunds({
      companyId,
      amount,
      notes,
      createdBy: req.user?.id
    });

    return res.status(201).json({
      success: true,
      transaction: result.transaction,
      balance: result.balance
    });
  } catch (error) {
    console.error('Erro ao adicionar saldo pré-pago:', error);
    const message = error instanceof Error ? error.message : 'Não foi possível adicionar saldo pré-pago.';
    return res.status(500).json({ error: message });
  }
});

// Rotas de Multas
router.get('/multas', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.role === 'master_company' ? req.query.companyId as string : req.user.companyId;
    const clientId = req.user.role === 'client' ? req.user.clientId : (Array.isArray(req.query.clientId) ? req.query.clientId[0] : req.query.clientId) as string;
    const filter = {
      companyId,
      clientId,
    };
    const multas = await multasService.getMultas(filter);
    res.json(multas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/multas', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const multaData = req.body;
    const multa = await multasService.createMulta(multaData);
    res.status(201).json(multa);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/multas/:id', authenticateToken, async (req, res) => {
  try {
    const multa = await multasService.getMultaById(req.params.id);
    if (!multa) {
      return res.status(404).json({ error: 'Multa não encontrada' });
    }
    res.json(multa);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/multas/:id', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    const multaData = req.body;
    const multa = await multasService.updateMulta(req.params.id, multaData);
    res.json(multa);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/multas/:id', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    await multasService.deleteMulta(req.params.id);
    res.json({ message: 'Multa deletada com sucesso' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/multas/stats', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.role === 'master_company' ? undefined : req.user.companyId;
    const clientId = req.user.role === 'client' ? req.user.clientId : undefined;
    const stats = await multasService.getMultaStats(companyId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rotas de Recursos
router.get('/recursos', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.role === 'master_company' ? req.query.companyId as string : req.user.companyId;
    const clientId = req.user.role === 'client' ? req.user.clientId : (Array.isArray(req.query.clientId) ? req.query.clientId[0] : req.query.clientId) as string;
    const filter = {
      companyId,
      clientId,
    };
    const recursos = await recursosService.getRecursos(filter);
    res.json(recursos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/recursos', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const recursoData = req.body;
    
    // Validação de segurança: verificar se existe paymentId e se está pago
    if (recursoData.paymentId) {
      console.log('🔒 Validando pagamento para criação de recurso:', recursoData.paymentId);
      
      // Buscar dados do pagamento
      const baseUrl = import.meta.env.PROD ? '' : 'http://localhost:3001';
      const paymentResponse = await fetch(`${baseUrl}/api/payments/${recursoData.paymentId}/recurso`, {
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      });
      
      if (!paymentResponse.ok) {
        return res.status(400).json({ 
          error: 'Pagamento não encontrado ou inválido',
          code: 'PAYMENT_NOT_FOUND'
        });
      }
      
      const paymentData = await paymentResponse.json();
      
      // Verificar se o pagamento permite criação de recurso
      if (!paymentData.canCreateRecurso) {
        return res.status(400).json({ 
          error: `Recurso não pode ser criado. Status do pagamento: ${paymentData.status}`,
          code: 'PAYMENT_NOT_PAID'
        });
      }
      
      // Verificar se já existe recurso para este pagamento
      if (paymentData.existingRecurso) {
        return res.status(409).json({ 
          error: 'Já existe um recurso para este pagamento',
          code: 'RECURSO_ALREADY_EXISTS',
          existingRecurso: paymentData.existingRecurso
        });
      }
      
      console.log('✅ Pagamento validado com sucesso para criação de recurso');
    }
    
    const recurso = await recursosService.createRecurso(recursoData);
    res.status(201).json(recurso);
  } catch (error) {
    console.error('❌ Erro ao criar recurso:', error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/recursos/:id', authenticateToken, async (req, res) => {
  try {
    const recurso = await recursosService.getRecursoById(req.params.id);
    if (!recurso) {
      return res.status(404).json({ error: 'Recurso não encontrado' });
    }
    res.json(recurso);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/recursos/:id', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    const recursoData = req.body;
    const recurso = await recursosService.updateRecurso(req.params.id, recursoData);
    res.json(recurso);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/recursos/:id', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    await recursosService.deleteRecurso(req.params.id);
    res.json({ message: 'Recurso deletado com sucesso' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/recursos/:id/enviar', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    const recurso = await recursosService.updateRecurso(req.params.id, { status: 'protocolado' });
    res.json(recurso);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/recursos/stats', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.role === 'master_company' ? undefined : req.user.companyId;
    const clientId = req.user.role === 'client' ? req.user.clientId : undefined;
    const stats = await recursosService.getRecursoStats(companyId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rotas de Clientes
router.get('/clients', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    const companyId = req.user.role === 'master_company' ? req.query.companyId as string : req.user.companyId;
    const filter = {
      companyId,
    };
    const clients = await clientsService.getClients(filter);
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/clients', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const clientData = req.body;
    const client = await clientsService.createClient(clientData);
    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/clients/:id', authenticateToken, async (req, res) => {
  try {
    const client = await clientsService.getClientById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/clients/:id', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    const clientData = req.body;
    const client = await clientsService.updateClient(req.params.id, clientData);
    res.json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/clients/:id', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    await clientsService.deleteClient(req.params.id);
    res.json({ message: 'Cliente deletado com sucesso' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/clients/stats', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    const companyId = req.user.role === 'master_company' ? req.query.companyId as string : req.user.companyId;
    const stats = await clientsService.getClientStats(companyId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rotas de Veículos
router.post('/vehicles', authenticateToken, authorizeRoles(['master_company', 'dispatcher']), async (req, res) => {
  try {
    const vehicleData = req.body;
    const vehicle = await clientsService.createVehicle(vehicleData);
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/clients/:clientId/vehicles', authenticateToken, async (req, res) => {
  try {
    const vehicles = await clientsService.getVehicles({ clientId: req.params.clientId });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rotas de Empresas
router.get('/companies/all', authenticateToken, authorizeRoles(['superadmin']), async (req, res) => {
  try {
    // Superadmin pode ver todas as empresas
    const companies = await companiesService.getCompanies({});
    res.json({ companies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/companies', authenticateToken, authorizeRoles(['master_company']), async (req, res) => {
  try {
    const filter = {
      masterCompanyId: req.user.companyId,
      ...req.query,
    };
    const companies = await companiesService.getCompanies(filter);
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/companies', authenticateToken, authorizeRoles(['master_company']), async (req, res) => {
  try {
    const companyData = {
      ...req.body,
      masterCompanyId: req.user.companyId,
    };
    const company = await companiesService.createCompany(companyData);
    res.status(201).json(company);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/companies/:id', authenticateToken, async (req, res) => {
  try {
    const company = await companiesService.getCompanyById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/companies/:id', authenticateToken, authorizeRoles(['master_company']), async (req, res) => {
  try {
    const companyData = req.body;
    const company = await companiesService.updateCompany(req.params.id, companyData);
    res.json(company);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/companies/stats', authenticateToken, authorizeRoles(['master_company']), async (req, res) => {
  try {
    const masterCompanyId = req.user.companyId;
    const stats = await companiesService.getCompanyStats(masterCompanyId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rotas de Planos
router.get('/plans', authenticateToken, async (req, res) => {
  try {
    const plans = await companiesService.getPlans(); // Apenas planos ativos
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/plans', authenticateToken, authorizeRoles(['master_company']), async (req, res) => {
  try {
    const planData = req.body;
    const plan = await companiesService.createPlan(planData);
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Rotas de Dashboard
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.role === 'master_company' ? undefined : req.user.companyId;
    const clientId = req.user.role === 'client' ? req.user.clientId : undefined;
    
    const [multasStats, recursosStats, clientsStats] = await Promise.all([
      multasService.getMultaStats(companyId),
      recursosService.getRecursoStats(companyId),
      req.user.role !== 'client' ? clientsService.getClientStats(companyId) : null,
    ]);

    res.json({
      multas: multasStats,
      recursos: recursosStats,
      clients: clientsStats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para consultar API Datawash (CPF)
router.get('/datawash/cpf/:cpf', authenticateToken, async (req, res) => {
  try {
    const { cpf } = req.params;
    
    // Validar formato do CPF
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return res.status(400).json({ error: 'CPF deve conter 11 dígitos' });
    }

    // Credenciais da API Datawash (devem estar no .env)
    const API_CREDENTIALS = {
      username: process.env.DATAWASH_USERNAME || '',
      password: process.env.DATAWASH_PASSWORD || '',
      baseUrl: process.env.DATAWASH_BASE_URL || 'https://api.datawash.com.br'
    };

    if (!API_CREDENTIALS.username || !API_CREDENTIALS.password) {
      return res.status(500).json({ error: 'Credenciais da API Datawash não configuradas' });
    }

    // Fazer requisição para a API Datawash
    const response = await fetch(`${API_CREDENTIALS.baseUrl}/ConsultaCPFCompleta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${API_CREDENTIALS.username}:${API_CREDENTIALS.password}`).toString('base64')}`
      },
      body: JSON.stringify({
        cpf: cpfLimpo
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API Datawash: ${response.status}`);
    }

    const data = await response.json();
    
    // Transformar dados para o formato esperado pelo frontend
    const dadosFormatados = {
      nome: data.nome || '',
      cpf: cpfLimpo,
      dataNascimento: data.dataNascimento || '',
      endereco: {
        logradouro: data.endereco?.logradouro || '',
        numero: data.endereco?.numero || '',
        complemento: data.endereco?.complemento || '',
        bairro: data.endereco?.bairro || '',
        cidade: data.endereco?.cidade || '',
        estado: data.endereco?.estado || '',
        cep: data.endereco?.cep || ''
      },
      telefone: data.telefone || '',
      email: data.email || ''
    };

    res.json(dadosFormatados);
  } catch (error) {
    console.error('Erro ao consultar API Datawash:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao consultar CPF' });
  }
});

// Nova rota proxy para webhook n8n (CPF via POST)
router.post('/datawash/webhook-cpf', authenticateToken, async (req, res) => {
  try {
    const { cpf } = req.body;
    if (!cpf || typeof cpf !== 'string') {
      return res.status(400).json({ error: 'CPF é obrigatório' });
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return res.status(400).json({ error: 'CPF deve conter 11 dígitos' });
    }

    const webhookUrl = process.env.N8N_DATAWASH_WEBHOOK_URL || 'https://webhookn8n.synsoft.com.br/webhook/dataws3130178c-4c85-4899-854d-17eafaffff05';

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpfLimpo }),
        signal: AbortSignal.timeout(10000)
      });
    } catch (err) {
      console.error('Erro de rede ao chamar webhook n8n:', err);
      return res.status(502).json({ error: 'Falha de rede ao consultar CPF via webhook' });
    }

    const text = await response.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch (e) {
      console.error('Falha ao parsear JSON do webhook:', e, text);
      return res.status(502).json({ error: 'Resposta inválida do webhook n8n' });
    }

    if (!response.ok) {
      console.error('Erro do webhook n8n:', response.status, data);
      return res.status(response.status).json(data || { error: 'Erro na consulta CPF via webhook' });
    }

    return res.json(data);
  } catch (error) {
    console.error('Erro ao consultar CPF via webhook:', error);
    return res.status(502).json({ error: 'Erro ao consultar CPF via webhook' });
  }
});

// Rota para consultar CEP via ViaCEP
router.get('/cep/:cep', authenticateToken, async (req, res) => {
  try {
    const { cep } = req.params;
    
    // Validar formato do CEP
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      return res.status(400).json({ error: 'CEP deve conter 8 dígitos' });
    }

    // Consultar API ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    
    if (!response.ok) {
      throw new Error(`Erro na API ViaCEP: ${response.status}`);
    }

    const data = await response.json();
    
    // Verificar se CEP foi encontrado
    if (data.erro) {
      return res.status(404).json({ error: 'CEP não encontrado' });
    }
    
    // Transformar dados para o formato esperado pelo frontend
    const dadosFormatados = {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
      cep: data.cep || cepLimpo
    };

    res.json(dadosFormatados);
  } catch (error) {
    console.error('Erro ao consultar CEP:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao consultar CEP' });
  }
});

// Rota de saúde da API
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Webhook n8n: criar customer
router.post('/webhook/n8n/create-customer', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 [Backend] Recebida requisição para criar customer via N8N');
    const { cpf, nome, email } = req.body as { cpf?: string; nome?: string; email?: string };
    console.log('🔧 [Backend] Dados recebidos:', { cpf, nome, email });
    
    console.log('🔧 [Backend] Chamando n8nWebhookService.createCustomer...');
    const result = await n8nWebhookService.createCustomer({ cpf: cpf || '', nome: nome || '', email: email || '' });
    
    console.log('🔧 [Backend] Resultado do n8nWebhookService:', result);
    
    if (!result.success) {
      console.error('❌ [Backend] Falha ao criar customer:', result.message);
      return res.status(502).json({ error: result.message || 'Falha ao criar customer no webhook n8n' });
    }
    
    console.log('✅ [Backend] Customer criado com sucesso:', result.customerId);
    return res.json({ customerId: result.customerId, message: result.message });
  } catch (error) {
    console.error('❌ [Backend] Erro no webhook n8n (create-customer):', error);
    console.error('❌ [Backend] Stack:', error instanceof Error ? error.stack : 'N/A');
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/webhook/n8n/process-payment', maybeAuthForN8nProxy as any, async (req, res) => {
  try {
    console.log('🔍 === WEBHOOK N8N PROCESS-PAYMENT ===');
    console.log('📦 Payload recebido:', JSON.stringify(req.body, null, 2));

    const payload = req.body;
    const paymentMethod = (payload?.paymentMethod || payload?.payment_method || '').toLowerCase() || 'asaas';
    console.log('💳 Método de pagamento solicitado:', paymentMethod);

    const resolveCompanyId = () => {
      return req.user?.companyId || payload?.despachante?.company_id || payload?.company_id || payload?.companyId;
    };

    const resolveServiceId = () => payload?.Idserviço || payload?.service_id || payload?.serviceId;

    if (paymentMethod === 'prepaid') {
      console.log('⚡ Processando fluxo de pagamento via saldo pré-pago');

      const companyId = resolveCompanyId();
      if (!companyId) {
        console.error('❌ Empresa não encontrada no payload ou usuário');
        return res.status(400).json({
          error: 'COMPANY_ID_REQUIRED',
          message: 'Não foi possível identificar a empresa para débito do saldo pré-pago.'
        });
      }

      const serviceId = resolveServiceId();
      const client = payload?.Customer_cliente || payload?.cliente || null;

      if (!serviceId) {
        return res.status(400).json({
          error: 'SERVICE_ID_REQUIRED',
          message: 'Identificador do serviço não informado para débito pré-pago.'
        });
      }

      if (!client?.id) {
        return res.status(400).json({
          error: 'CLIENT_ID_REQUIRED',
          message: 'Cliente inválido para registrar a ordem de serviço pré-paga.'
        });
      }

      const parseCurrency = (value: unknown) => {
        if (typeof value === 'string') {
          const normalized = value.replace(/[^0-9,.-]/g, '').replace('.', '').replace(',', '.');
          const parsed = Number(normalized);
          return Number.isFinite(parsed) ? parsed : 0;
        }
        if (typeof value === 'number') return value;
        return 0;
      };

      const acsmCost = parseCurrency(payload?.valoracsm);
      const icetranCost = parseCurrency(payload?.valoricetran);
      const feeCost = parseCurrency(payload?.taxa);
      const serviceCost = acsmCost + icetranCost + feeCost;
      const totalAmount = parseCurrency(payload?.Valor_cobrança) || serviceCost;

      console.log('💰 Custos para débito pré-pago:', {
        acsmCost,
        icetranCost,
        feeCost,
        serviceCost,
        totalAmount
      });

      if (serviceCost <= 0) {
        return res.status(400).json({
          error: 'INVALID_COST',
          message: 'Não foi possível calcular o custo do serviço para débito pré-pago.'
        });
      }

      // Registrar débito no saldo pré-pago
      let debitResult;
      try {
        debitResult = await prepaidWalletService.debitForService({
          companyId,
          amount: serviceCost,
          serviceId,
          notes: `Débito pré-pago para serviço ${serviceId}`,
          createdBy: req.user?.id
        });
        console.log('✅ Débito registrado no saldo pré-pago:', debitResult.transaction.id);
      } catch (debitError) {
        console.error('❌ Erro ao debitar saldo pré-pago:', debitError);
        const message = debitError instanceof Error ? debitError.message : 'Falha ao debitar saldo pré-pago';
        return res.status(400).json({ error: 'PREPAID_DEBIT_FAILED', message });
      }

      // Criar ordem de serviço já paga
      const nowIso = new Date().toISOString();
      const serviceOrderPayload: any = {
        client_id: client.id,
        customer_name: client.nome || payload?.customer_name || 'Cliente',
        customer_document: client.cpf_cnpj || null,
        customer_email: client.email || null,
        service_id: serviceId,
        company_id: companyId,
        amount: totalAmount,
        status: 'paid',
        paid_at: nowIso,
        description: payload?.descricaoserviço || payload?.service_description || 'Serviço pré-pago',
        service_type: 'recurso_multa',
        multa_type: payload?.multa_type || null,
        billing_type: 'PREPAID',
        payment_method: 'prepaid',
        prepaid_transaction_id: debitResult.transaction.id,
        splits_config: {
          acsm_value: acsmCost,
          icetran_value: icetranCost,
          taxa_cobranca: feeCost,
          prepaid_cost: serviceCost,
          total_amount: totalAmount
        },
        webhook_response: null,
        created_at: nowIso,
        updated_at: nowIso
      };

      try {
        const { data: serviceOrder, error: serviceOrderError } = await supabase
          .from('service_orders')
          .insert(serviceOrderPayload)
          .select()
          .single();

        if (serviceOrderError) {
          console.error('❌ Erro ao criar service_order pré-pago:', serviceOrderError);

          // Reverter débito em caso de falha ao salvar
          try {
            await prepaidWalletService.addFunds({
              companyId,
              amount: serviceCost,
              notes: `Estorno automático por falha ao salvar service_order (${serviceId})`,
              createdBy: req.user?.id
            });
            console.log('✅ Estorno automático aplicado após falha ao salvar service_order');
          } catch (rollbackError) {
            console.error('⚠️ Falha ao estornar débito após erro no service_order:', rollbackError);
          }

          return res.status(500).json({
            error: 'SERVICE_ORDER_CREATION_FAILED',
            message: serviceOrderError.message
          });
        }

        await prepaidWalletService.linkTransactionToServiceOrder(debitResult.transaction.id, serviceOrder.id);

        return res.json({
          success: true,
          paymentMethod: 'prepaid',
          serviceOrder,
          prepaid: {
            debitedAmount: serviceCost,
            totalAmount,
            transaction: debitResult.transaction,
            balance: debitResult.balance
          },
          nextStep: 'start_recurso'
        });
      } catch (insertError) {
        console.error('❌ Erro inesperado ao processar fluxo pré-pago:', insertError);
        return res.status(500).json({
          error: 'PREPAID_PROCESS_FAILED',
          message: insertError instanceof Error ? insertError.message : 'Falha interna ao processar pagamento pré-pago.'
        });
      }
    }

    // Endpoint atualizado para o novo servidor n8n
    const endpoint = 'https://webhookn8n.synsoft.com.br/webhook/d37fac6e-9379-4bca-b015-9c56b104cae1';

    console.log('🔄 Enviando requisição para o webhook n8n:', endpoint);
    
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000)
    });

    console.log('📡 Resposta do webhook N8N:');
    console.log('  - Status:', resp.status);
    console.log('  - Status Text:', resp.statusText);
    console.log('  - OK:', resp.ok);

    const text = await resp.text();
    console.log('📄 Corpo da resposta:', text.substring(0, 500));

    if (!resp.ok) {
      console.error('❌ Webhook N8N retornou erro:', resp.status);
      let apiMsg = '';
      try {
        const json = JSON.parse(text);
        apiMsg = typeof json?.message === 'string' ? json.message : JSON.stringify(json);
      } catch {
        apiMsg = text.slice(0, 200);
      }
      console.error('❌ Mensagem de erro:', apiMsg);
      return res.status(resp.status).json({ error: `Webhook n8n falhou: HTTP ${resp.status} ${resp.statusText}${apiMsg ? ` - ${apiMsg}` : ''}` });
    }

    // Sucesso: tratar diferentes formatos de resposta
    const trimmed = (text || '').trim();
    if (!trimmed) {
      // n8n respondeu vazio; considerar sucesso e retornar JSON padrão
      console.log('ℹ️ Webhook n8n retornou corpo vazio. Tratando como sucesso e retornando emptyResponse:true');
      return res.json({ success: true, forwarded: true, emptyResponse: true });
    }

    // Tentar JSON, cair para texto bruto dentro de JSON
    try {
      const json = JSON.parse(trimmed);
      console.log('✅ JSON parseado com sucesso');
      return res.json(json);
    } catch (parseError) {
      console.warn('⚠️ Falha ao parsear JSON, retornando raw:', parseError);
      return res.json({ success: true, forwarded: true, raw: trimmed });
    }
  } catch (error) {
    console.error('❌ ERRO CRÍTICO no webhook n8n (process-payment):', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// Rotas de créditos e pagamentos
router.use('/credits', creditsRouter);

// Rotas de webhooks
router.use('/webhooks', webhooksRouter);

// Rotas de cobranças/pagamentos
router.use('/payments', paymentsRouter);

// Rotas de rascunhos (drafts) de service orders - DEVE VIR ANTES!
router.use('/service-orders/draft', serviceOrdersDraftRouter);

// Rotas de service orders com saldo pré-pago
router.use('/service-orders', serviceOrdersPrepaidRouter);

// Rotas de sincronização forçada
router.use('/force-sync', forceSyncRouter);

// Rotas de subcontas
import subaccountsRouter from '../../lib/routes/subaccounts';
router.use('/subaccounts', subaccountsRouter);

// Rotas de usuários para criação de customer no Asaas
router.get('/users/despachantes-without-customer', authenticateToken, authorizeRoles(['superadmin', 'admin_master']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, nome, email, telefone, created_at, role, company_id, asaas_customer_id')
      .is('asaas_customer_id', null)
      .eq('ativo', true)
      .or('role.eq.Despachante,role.eq.dispatcher,role.eq.admin_master');

    if (error) {
      return res.status(500).json({ success: false, error: `Erro ao buscar usuários: ${error.message}` });
    }

    const result = (data || []).map(u => ({
      id: u.id,
      name: u.nome,
      email: u.email,
      phone: u.telefone,
      created_at: u.created_at,
      asaas_customer_id: u.asaas_customer_id,
      user_profiles: { role: u.role }
    }));

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('Erro ao listar despachantes sem customer:', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Erro interno' });
  }
});

router.post('/users/create-asaas-customer', authenticateToken, authorizeRoles(['superadmin', 'admin_master']), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'userId inválido' });
    }

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userErr || !user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    if (user.asaas_customer_id) {
      return res.json({ success: true, data: { customerId: user.asaas_customer_id } });
    }

    // Buscar empresa para obter CNPJ/endereços
    if (!user.company_id) {
      return res.status(400).json({ success: false, error: 'Usuário não possui company_id associado' });
    }

    const { data: company, error: compErr } = await supabase
      .from('companies')
      .select('*')
      .eq('id', user.company_id)
      .single();

    if (compErr || !company) {
      return res.status(404).json({ success: false, error: 'Empresa do usuário não encontrada' });
    }

    const cnpjDigits = (company.cnpj || '').replace(/\D/g, '');
    if (!cnpjDigits) {
      return res.status(400).json({ success: false, error: 'Empresa associada não possui CNPJ válido' });
    }

    const asaasPayload = {
      name: user.nome || company.nome || 'Usuário',
      email: user.email || company.email || undefined,
      cpfCnpj: cnpjDigits,
      phone: user.telefone || company.telefone || undefined,
      postalCode: (company.cep || '').replace(/\D/g, '') || undefined,
      address: company.endereco || undefined,
      addressNumber: company.numero || undefined,
      complement: company.complemento || undefined,
      province: company.bairro || undefined,
      city: company.cidade || undefined,
      state: company.estado || undefined,
      externalReference: `user-${user.id}`
    };

    const { asaasService } = await import('../services/asaasService');
    await asaasService.reloadConfig();

    // Fallback seguro em desenvolvimento quando Asaas não estiver configurado
    if (!asaasService.isConfigured() && process.env.NODE_ENV === 'development') {
      const mockId = `mock_${user.id}`;
      const { error: upErr } = await supabase
        .from('users')
        .update({ asaas_customer_id: mockId, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (upErr) {
        return res.status(500).json({ success: false, error: `Falha ao salvar mock customer: ${upErr.message}` });
      }
      return res.json({ success: true, data: { customerId: mockId, mocked: true } });
    }

    // Criar customer real no Asaas
    const created = await asaasService.createCustomer(asaasPayload);
    if (!created?.id) {
      return res.status(502).json({ success: false, error: 'Falha ao criar customer no Asaas' });
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({ asaas_customer_id: created.id, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateErr) {
      return res.status(500).json({ success: false, error: `Falha ao salvar customer no usuário: ${updateErr.message}` });
    }

    return res.json({ success: true, data: { customerId: created.id } });
  } catch (error) {
    console.error('Erro ao criar customer Asaas para usuário:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

router.post('/users/sync-all-customers', authenticateToken, authorizeRoles(['superadmin', 'admin_master']), async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, nome, email, telefone, created_at, role, company_id, asaas_customer_id')
      .is('asaas_customer_id', null)
      .eq('ativo', true)
      .or('role.eq.Despachante,role.eq.dispatcher,role.eq.admin_master');

    if (error) {
      return res.status(500).json({ success: false, error: `Erro ao buscar usuários: ${error.message}` });
    }

    const { asaasService } = await import('../services/asaasService');
    await asaasService.reloadConfig();

    const total = (users || []).length;
    let successCount = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const u of users || []) {
      try {
        // Buscar empresa
        const { data: company, error: compErr } = await supabase
          .from('companies')
          .select('*')
          .eq('id', u.company_id)
          .single();
        if (compErr || !company) {
          throw new Error('Empresa do usuário não encontrada');
        }
        const cnpjDigits = (company.cnpj || '').replace(/\D/g, '');
        if (!cnpjDigits) {
          throw new Error('Empresa associada não possui CNPJ válido');
        }
        const payload = {
          name: u.nome || company.nome || 'Usuário',
          email: u.email || company.email || undefined,
          cpfCnpj: cnpjDigits,
          phone: u.telefone || company.telefone || undefined,
          postalCode: (company.cep || '').replace(/\D/g, '') || undefined,
          address: company.endereco || undefined,
          addressNumber: company.numero || undefined,
          complement: company.complemento || undefined,
          province: company.bairro || undefined,
          city: company.cidade || undefined,
          state: company.estado || undefined,
          externalReference: `user-${u.id}`
        };

        // Fallback em desenvolvimento
        if (!asaasService.isConfigured() && process.env.NODE_ENV === 'development') {
          const mockId = `mock_${u.id}`;
          const { error: upErr } = await supabase
            .from('users')
            .update({ asaas_customer_id: mockId, updated_at: new Date().toISOString() })
            .eq('id', u.id);
          if (upErr) {
            throw new Error(`Falha ao salvar mock: ${upErr.message}`);
          }
          successCount++;
          continue;
        }

        const created = await asaasService.createCustomer(payload);
        if (!created?.id) {
          throw new Error('Falha ao criar customer no Asaas');
        }
        const { error: updateErr } = await supabase
          .from('users')
          .update({ asaas_customer_id: created.id, updated_at: new Date().toISOString() })
          .eq('id', u.id);
        if (updateErr) {
          throw new Error(`Falha ao salvar customer: ${updateErr.message}`);
        }
        successCount++;
      } catch (e) {
        errors.push({ userId: u.id, error: e instanceof Error ? e.message : 'Erro desconhecido' });
      }
    }

    return res.json({ success: true, data: { total, success: successCount, errors } });
  } catch (error) {
    console.error('Erro na sincronização de customers de usuários:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// Rota para criar customer do Asaas para uma empresa
router.post('/companies/create-asaas-customer', authenticateToken, authorizeRoles(['master_company', 'superadmin']), async (req, res) => {
  try {
    const { companyId } = req.body;
    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'companyId inválido' });
    }

    // Buscar empresa
    const company = await companiesService.getCompanyById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Se já tiver customer, apenas retorna
    if (company.asaas_customer_id) {
      return res.json({ customerId: company.asaas_customer_id });
    }

    // Montar payload mínimo do cliente Asaas
    const asaasPayload = {
      name: company.nome || 'Empresa',
      email: company.email || undefined,
      cpfCnpj: company.cnpj?.replace(/\D/g, '') || '',
      phone: company.telefone || undefined,
      postalCode: company.cep?.replace(/\D/g, '') || undefined,
      address: company.endereco || undefined,
      addressNumber: company.numero || undefined,
      complement: company.complemento || undefined,
      province: company.bairro || undefined,
      city: company.cidade || undefined,
      state: company.estado || undefined,
      externalReference: `company-${company.id}`
    };

    // Chamar serviço do Asaas
    const { asaasService } = await import('../services/asaasService');
    const created = await asaasService.createCustomer(asaasPayload);

    if (!created?.id) {
      return res.status(502).json({ error: 'Falha ao criar customer no Asaas' });
    }

    // Persistir na empresa
    const updated = await companiesService.updateCompany(companyId, { asaas_customer_id: created.id });

    return res.json({ customerId: created.id, company: updated });
  } catch (error) {
    console.error('Erro ao criar customer Asaas para empresa:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  }
});

// Rotas de Pré-cadastros
router.post('/precadastros', async (req, res) => {
  try {
    const {
      nome,
      email,
      telefone,
      data_nascimento,
      cnpj,
      razao_social,
      nome_fantasia,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      cep
    } = req.body;

    // Validações básicas
    if (!nome || !email || !telefone || !cnpj || !razao_social) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: nome, email, telefone, cnpj, razao_social' 
      });
    }

    // Salvar no banco de dados
    const { data: precadastro, error: dbError } = await supabase
      .from('precadastros')
      .insert({
        nome,
        email,
        telefone,
        data_nascimento,
        cnpj,
        razao_social,
        nome_fantasia,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
        status: 'pendente',
        webhook_enviado: false
      })
      .select()
      .single();

    if (dbError) {
      console.error('Erro ao salvar pré-cadastro:', dbError);
      return res.status(500).json({ error: 'Erro ao salvar pré-cadastro no banco de dados' });
    }

    // Enviar para webhook n8n
    let webhookSuccess = false;
    let webhookResponse = null;

    try {
      const webhookUrl = 'https://webhookn8n.synsoft.com.br/webhook/59cb6ccc-1a19-4867-9f40-958e737133dc';
      
      const webhookPayload = {
        id: precadastro.id,
        nome,
        email,
        telefone,
        data_nascimento,
        cnpj,
        razao_social,
        nome_fantasia,
        endereco: {
          logradouro: endereco,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          cep
        },
        created_at: precadastro.created_at
      };

      console.log('🔄 Enviando pré-cadastro para webhook n8n:', webhookUrl);
      
      const webhookResp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
        signal: AbortSignal.timeout(30000)
      });

      const webhookText = await webhookResp.text();
      webhookSuccess = webhookResp.ok;
      webhookResponse = webhookText || '{}';

      console.log(`✅ Webhook n8n respondeu: ${webhookResp.status} - ${webhookText}`);

      // Atualizar status do webhook no banco
      await supabase
        .from('precadastros')
        .update({
          webhook_enviado: webhookSuccess,
          webhook_response: webhookResponse,
          updated_at: new Date().toISOString()
        })
        .eq('id', precadastro.id);

    } catch (webhookError) {
      console.error('Erro ao enviar para webhook n8n:', webhookError);
      webhookResponse = JSON.stringify({ error: webhookError.message });
      
      // Atualizar com erro
      await supabase
        .from('precadastros')
        .update({
          webhook_enviado: false,
          webhook_response: webhookResponse,
          updated_at: new Date().toISOString()
        })
        .eq('id', precadastro.id);
    }

    res.json({
      success: true,
      precadastro: {
        id: precadastro.id,
        status: precadastro.status
      },
      webhook: {
        enviado: webhookSuccess,
        response: webhookResponse
      }
    });

  } catch (error) {
    console.error('Erro no endpoint de pré-cadastros:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar pré-cadastros (apenas para Superadmin)
router.get('/precadastros', authenticateToken, authorizeRoles(['Superadmin', 'ICETRAN']), async (req, res) => {
  try {
    const { data: precadastros, error } = await supabase
      .from('precadastros')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar pré-cadastros:', error);
      return res.status(500).json({ error: 'Erro ao buscar pré-cadastros' });
    }

    res.json({ precadastros });
  } catch (error) {
    console.error('Erro no endpoint de listagem de pré-cadastros:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aprovar/Rejeitar pré-cadastro (apenas para superadmin)
router.patch('/precadastros/:id/status', authenticateToken, authorizeRoles(['Superadmin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, observacoes } = req.body;

    if (!['aprovado', 'rejeitado'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser "aprovado" ou "rejeitado"' });
    }

    const { data: precadastro, error } = await supabase
      .from('precadastros')
      .update({
        status,
        observacoes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar status do pré-cadastro:', error);
      return res.status(500).json({ error: 'Erro ao atualizar status do pré-cadastro' });
    }

    let createdCompany: any = null;

    if (status === 'aprovado') {
      try {
        // Evitar duplicidades por CNPJ
        const { data: existingCompany, error: existingError } = await supabase
          .from('companies')
          .select('id')
          .eq('cnpj', precadastro.cnpj)
          .maybeSingle();

        if (existingError) {
          console.error('Erro ao verificar empresa existente:', existingError);
        }

        if (!existingCompany) {
          const MASTER_COMPANY_ID = process.env.DEFAULT_MASTER_COMPANY_ID || '550e8400-e29b-41d4-a716-446655440000';

          // Validar se a master company existe
          const { data: masterCompany, error: masterError } = await supabase
            .from('companies_master')
            .select('id')
            .eq('id', MASTER_COMPANY_ID)
            .maybeSingle();

          if (masterError || !masterCompany) {
            throw new Error(`Master company padrão (${MASTER_COMPANY_ID}) não encontrada. Configure DEFAULT_MASTER_COMPANY_ID ou ajuste os dados.`);
          }

          // Buscar plano padrão (primeiro disponível)
          const { data: plan, error: planError } = await supabase
            .from('plans')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (planError || !plan) {
            throw new Error('Nenhum plano disponível para vincular à empresa');
          }

          const { data: company, error: companyError } = await supabase
            .from('companies')
            .insert({
              master_company_id: masterCompany.id,
              plan_id: plan.id,
              nome: precadastro.razao_social,
              cnpj: precadastro.cnpj,
              email: precadastro.email,
              telefone: precadastro.telefone,
              endereco: precadastro.endereco || null,
              numero: precadastro.numero || null,
              complemento: precadastro.complemento || null,
              bairro: precadastro.bairro || null,
              cidade: precadastro.cidade || null,
              estado: precadastro.estado || null,
              cep: precadastro.cep || null,
              company_type: 'despachante',
              company_level: 'despachante',
              status: 'ativo',
              data_inicio_assinatura: new Date().toISOString()
            })
            .select('*')
            .single();

          if (companyError) {
            console.error('Erro ao criar empresa para o pré-cadastro aprovado:', companyError);
          } else {
            createdCompany = company;
          }
        }
      } catch (companyCreationError) {
        console.error('Erro na rotina de criação de empresa ao aprovar pré-cadastro:', companyCreationError);
      }
    }

    res.json({ success: true, precadastro, company: createdCompany });
  } catch (error) {
    console.error('Erro no endpoint de atualização de status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;