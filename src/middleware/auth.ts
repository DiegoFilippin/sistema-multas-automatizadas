import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

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
      logger.warn('Tentativa de acesso sem token', { 
        ip: req.ip,
        path: req.path,
        method: req.method 
      });
      return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    // Validações de segurança no token
    if (token.length > 4096) {
      logger.warn('Token muito longo detectado', { 
        ip: req.ip,
        tokenLength: token.length 
      });
      return res.status(400).json({ error: 'Token inválido' });
    }

    // Primeiro tentar validar como token do Supabase
    let decoded: any;
    let isSupabaseToken = false;
    
    try {
      // Verificar se é um token do Supabase (JWT sem verificação de assinatura por enquanto)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      if (payload.iss && payload.iss.includes('supabase')) {
        logger.info('Token do Supabase detectado', { 
          userId: payload.sub,
          ip: req.ip 
        });
        decoded = payload;
        isSupabaseToken = true;
      }
    } catch (supabaseError) {
      logger.debug('Não é um token do Supabase, tentando JWT personalizado', { 
        ip: req.ip 
      });
    }
    
    // Se não for token do Supabase, tentar JWT personalizado
    if (!isSupabaseToken) {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        logger.warn('JWT_SECRET não configurado, retornando 401', { ip: req.ip });
        return res.status(401).json({ error: 'Autenticação requerida: JWT não configurado' });
      }
      decoded = jwt.verify(token, jwtSecret) as any;
    }
    
    // Buscar usuário no banco de dados para verificar se ainda existe e está ativo
    let user;
    
    if (isSupabaseToken) {
      // Para tokens do Supabase, usar o sub (subject) como ID do usuário
      logger.debug('Buscando usuário do Supabase', { 
        userId: decoded.sub,
        ip: req.ip 
      });
      
      // Importar supabase aqui para evitar dependência circular
      const { supabase } = await import('../lib/supabase');
      
      const { data: supabaseUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.sub)
        .eq('ativo', true)
        .single();
      
      if (error || !supabaseUser) {
        logger.warn('Usuário do Supabase não encontrado ou inativo', { 
          userId: decoded.sub,
          error: error?.message,
          ip: req.ip 
        });
        return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
      }
      
      logger.info('Usuário do Supabase autenticado com sucesso', { 
        userId: supabaseUser.id,
        email: supabaseUser.email,
        role: supabaseUser.role,
        ip: req.ip 
      });
      
      // Converter para formato esperado
      user = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        role: supabaseUser.role,
        companyId: supabaseUser.company_id,
        status: supabaseUser.ativo ? 'active' : 'inactive'
      };
    } else {
      // Para tokens JWT personalizados, usar Prisma
      logger.debug('Buscando usuário via Prisma', { 
        userId: decoded.userId,
        ip: req.ip 
      });
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          company: true,
          client: true,
        },
      });
    }

    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    }

    // Verificar se a empresa está ativa (se aplicável)
    if (user.companyId) {
      if (isSupabaseToken) {
        // Para Supabase, verificar empresa via Supabase
        const { supabase } = await import('../lib/supabase');
        
        const { data: company, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', user.companyId)
          .single();
        
        if (error || !company) {
          logger.warn('Empresa não encontrada', { 
            companyId: user.companyId,
            error: error?.message,
            ip: req.ip 
          });
          return res.status(401).json({ error: 'Empresa não encontrada' });
        }
        
        logger.debug('Empresa validada com sucesso', { 
          companyId: company.id,
          companyName: company.nome,
          ip: req.ip 
        });
      } else {
        // Para JWT personalizado, usar Prisma
        const company = await prisma.company.findUnique({
          where: { id: user.companyId },
        });

        if (!company || company.status !== 'active') {
          logger.warn('Empresa inativa ou não encontrada', { 
            companyId: user.companyId,
            status: company?.status,
            ip: req.ip 
          });
          return res.status(401).json({ error: 'Empresa inativa' });
        }
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
      clientId: user.clientId || undefined,
    };

    logger.info('Autenticação bem-sucedida', { 
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
      ip: req.ip 
    });

    next();
  } catch (error) {
    logger.error('Erro na autenticação', error, { 
      ip: req.ip,
      path: req.path 
    });
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