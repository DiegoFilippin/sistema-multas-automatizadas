import express from 'express';
import { authService } from '../services/authService.js';
import { multasService } from '../services/multasService.js';
import { recursosService } from '../services/recursosService.js';
import { clientsService } from '../services/clientsService.js';
import { companiesService } from '../services/companiesService.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

// Importar rotas de créditos, webhooks, payments, leads e force-sync
import creditsRouter from '../../api/routes/credits.js';
import webhooksRouter from '../../api/routes/webhooks.js';
import paymentsRouter from '../../api/routes/payments.js';
import leadsRouter from '../../api/routes/leads.js';
import forceSyncRouter from '../../api/routes/force-sync.js';

const router = express.Router();

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
      const paymentResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/payments/${recursoData.paymentId}/recurso`, {
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

// Rotas de créditos e pagamentos
router.use('/credits', creditsRouter);

// Rotas de webhooks
router.use('/webhooks', webhooksRouter);

// Rotas de cobranças/pagamentos
router.use('/payments', paymentsRouter);

// Rotas de leads
router.use('/leads', leadsRouter);

// Rotas de sincronização forçada
router.use('/force-sync', forceSyncRouter);

export default router;