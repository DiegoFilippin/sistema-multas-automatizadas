import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    companyId?: string;
    clientId?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Configuração de JWT não encontrada' });
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Buscar usuário no banco de dados para verificar se ainda existe e está ativo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        company: true,
        client: true,
      },
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    // Verificar se a empresa está ativa (se aplicável)
    if (user.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
      });

      if (!company || company.status !== 'active') {
        return res.status(401).json({ error: 'Empresa inativa' });
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
      clientId: user.clientId || undefined,
    };

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(403).json({ error: 'Token inválido' });
  }
};

export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acesso negado. Permissões insuficientes.',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

export const authorizeCompanyAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { companyId } = req.params;
    
    // Superadmin pode acessar qualquer empresa
    if (req.user.role === 'Superadmin') {
      return next();
    }

    // ICETRAN pode acessar qualquer empresa (gerencia despachantes)
    if (req.user.role === 'ICETRAN') {
      return next();
    }

    // Despachante só pode acessar sua própria empresa
    if (req.user.role === 'Despachante' && req.user.companyId === companyId) {
      return next();
    }

    // Usuario/Cliente só pode acessar dados relacionados a ele
    if (req.user.role === 'Usuario/Cliente') {
      const client = await prisma.client.findUnique({
        where: { id: req.user.clientId },
        select: { companyId: true },
      });

      if (client && client.companyId === companyId) {
        return next();
      }
    }

    return res.status(403).json({ error: 'Acesso negado a esta empresa' });
  } catch (error) {
    console.error('Erro na autorização de empresa:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const authorizeClientAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { clientId } = req.params;
    
    // Superadmin, ICETRAN e Despachante podem acessar clientes de suas empresas
    if (req.user.role === 'Superadmin' || req.user.role === 'ICETRAN' || req.user.role === 'Despachante') {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { companyId: true },
      });

      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Verificar se o cliente pertence à empresa do usuário (apenas para Despachante)
      if (req.user.role === 'Despachante' && client.companyId !== req.user.companyId) {
        return res.status(403).json({ error: 'Acesso negado a este cliente' });
      }

      return next();
    }

    // Usuario/Cliente só pode acessar seus próprios dados
    if (req.user.role === 'Usuario/Cliente' && req.user.clientId === clientId) {
      return next();
    }

    return res.status(403).json({ error: 'Acesso negado a este cliente' });
  } catch (error) {
    console.error('Erro na autorização de cliente:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const rateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Limpar requisições antigas
    if (requests.has(clientId)) {
      const clientRequests = requests.get(clientId).filter(
        (timestamp: number) => timestamp > windowStart
      );
      requests.set(clientId, clientRequests);
    } else {
      requests.set(clientId, []);
    }

    const clientRequests = requests.get(clientId);

    if (clientRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Muitas requisições. Tente novamente mais tarde.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    clientRequests.push(now);
    next();
  };
};

export const validateCompanyPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || !req.user.companyId) {
      return next();
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      include: {
        plan: true,
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Verificar limite mensal de recursos
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);

    const recursosUsados = await prisma.recurso.count({
      where: {
        companyId: company.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const limiteRecursos = company.plan.includedResources;

    if (recursosUsados >= limiteRecursos) {
      return res.status(403).json({
        error: 'Limite mensal de recursos atingido',
        recursosUsados,
        limiteRecursos,
        plano: company.plan.name,
      });
    }

    // Adicionar informações do plano ao request
    req.companyPlan = {
      recursosUsados,
      limiteRecursos,
      recursosRestantes: limiteRecursos - recursosUsados,
      plano: company.plan,
    };

    next();
  } catch (error) {
    console.error('Erro na validação do plano:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Funções auxiliares para verificação de permissões baseadas nos 4 perfis
export const hasPermission = {
  // Superadmin tem acesso total ao sistema
  isSuperadmin: (role: string) => role === 'Superadmin',
  
  // ICETRAN gerencia despachantes e tem acesso amplo
  isICETRAN: (role: string) => role === 'ICETRAN',
  
  // Despachante gerencia clientes e multas
  isDespachante: (role: string) => role === 'Despachante',
  
  // Usuario/Cliente tem acesso limitado aos próprios dados
  isUsuarioCliente: (role: string) => role === 'Usuario/Cliente',
  
  // Verificações combinadas
  canManageUsers: (role: string) => role === 'Superadmin' || role === 'ICETRAN',
  canManageCompanies: (role: string) => role === 'Superadmin' || role === 'ICETRAN',
  canManageClients: (role: string) => role === 'Superadmin' || role === 'ICETRAN' || role === 'Despachante',
  canViewReports: (role: string) => role === 'Superadmin' || role === 'ICETRAN' || role === 'Despachante',
  canManageSystem: (role: string) => role === 'Superadmin',
};

// Middleware para verificar se o usuário pode gerenciar usuários
export const requireUserManagement = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !hasPermission.canManageUsers(req.user.role)) {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas Superadmin e ICETRAN podem gerenciar usuários.' 
    });
  }
  next();
};

// Middleware para verificar se o usuário pode gerenciar empresas
export const requireCompanyManagement = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !hasPermission.canManageCompanies(req.user.role)) {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas Superadmin e ICETRAN podem gerenciar empresas.' 
    });
  }
  next();
};

// Middleware para verificar se o usuário pode gerenciar clientes
export const requireClientManagement = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !hasPermission.canManageClients(req.user.role)) {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas Superadmin, ICETRAN e Despachante podem gerenciar clientes.' 
    });
  }
  next();
};

// Middleware para verificar acesso de superadmin
 export const requireSuperadmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
   if (!req.user || !hasPermission.isSuperadmin(req.user.role)) {
     return res.status(403).json({ 
       error: 'Acesso negado. Apenas Superadmin pode acessar esta funcionalidade.' 
     });
   }
   next();
 };

// Middleware para log de atividades
export const logActivity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user && req.method !== 'GET') {
      // Log apenas para operações que modificam dados
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          companyId: req.user.companyId,
          action: `${req.method} ${req.path}`,
          description: `User ${req.user.id} performed ${req.method} on ${req.path}`,
          metadata: {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            body: req.body,
          },
        },
      });
    }
    next();
  } catch (error) {
    console.error('Erro no log de atividade:', error);
    // Não bloquear a requisição por erro de log
    next();
  }
};

// Tipos para TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        companyId?: string;
        clientId?: string;
      };
      companyPlan?: {
        recursosUsados: number;
        limiteRecursos: number;
        recursosRestantes: number;
        plano: any;
      };
    }
  }
}

export default {
  authenticateToken,
  authorizeRoles,
  authorizeCompanyAccess,
  authorizeClientAccess,
  rateLimiter,
  validateCompanyPlan,
  logActivity,
};