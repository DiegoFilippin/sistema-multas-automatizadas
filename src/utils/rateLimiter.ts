/**
 * Rate Limiting avançado com logging e fallback seguro
 * 
 * Este módulo implementa rate limiting com diferentes níveis de restrição
 * e mantém compatibilidade com o código existente
 */

import rateLimit from 'express-rate-limit'
import { logger } from '../utils/logger.js'
import { createError } from '../utils/errorHandler.js'

/**
 * Configurações de rate limiting por tipo de operação
 */
export const rateLimitConfig = {
  // Limite geral para APIs
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requisições por IP
    message: 'Muitas requisições. Tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: any, res: any) => {
      logger.warn('Rate limit excedido', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      })
      
      res.status(429).json({
        error: 'Muitas requisições',
        message: 'Você excedeu o limite de requisições. Tente novamente em 15 minutos.',
        retryAfter: 900 // segundos
      })
    }
  },

  // Limite estrito para autenticação
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 tentativas por IP
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // não contar logins bem-sucedidos
    handler: (req: any, res: any) => {
      logger.warn('Rate limit de autenticação excedido', {
        ip: req.ip,
        email: req.body.email,
        userAgent: req.get('User-Agent'),
        type: 'auth_rate_limit'
      })
      
      res.status(429).json({
        error: 'Muitas tentativas de login',
        message: 'Você excedeu o limite de tentativas de login. Tente novamente em 15 minutos.',
        retryAfter: 900
      })
    }
  },

  // Limite para operações sensíveis
  sensitive: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 10, // máximo 10 operações por IP
    message: 'Muitas operações sensíveis. Tente novamente em 5 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: any, res: any) => {
      logger.warn('Rate limit de operações sensíveis excedido', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        type: 'sensitive_rate_limit'
      })
      
      res.status(429).json({
        error: 'Muitas operações',
        message: 'Você excedeu o limite de operações sensíveis. Tente novamente em 5 minutos.',
        retryAfter: 300
      })
    }
  },

  // Limite para upload de arquivos
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 20, // máximo 20 uploads por IP
    message: 'Muitos uploads. Tente novamente em 1 hora.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: any, res: any) => {
      logger.warn('Rate limit de upload excedido', {
        ip: req.ip,
        userId: req.user?.id,
        type: 'upload_rate_limit'
      })
      
      res.status(429).json({
        error: 'Muitos uploads',
        message: 'Você excedeu o limite de uploads. Tente novamente em 1 hora.',
        retryAfter: 3600
      })
    }
  },

  // Limite leve para leitura de dados
  read: {
    windowMs: 60 * 1000, // 1 minuto
    max: 120, // máximo 120 requisições por IP
    message: 'Muitas requisições de leitura. Tente novamente em 1 minuto.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: any, res: any) => {
      logger.debug('Rate limit de leitura excedido', {
        ip: req.ip,
        path: req.path,
        type: 'read_rate_limit'
      })
      
      res.status(429).json({
        error: 'Muitas requisições',
        message: 'Você excedeu o limite de requisições de leitura. Tente novamente em 1 minuto.',
        retryAfter: 60
      })
    }
  }
}

/**
 * Rate limiters pre-configurados
 */
export const rateLimiters = {
  general: rateLimit(rateLimitConfig.general),
  auth: rateLimit(rateLimitConfig.auth),
  sensitive: rateLimit(rateLimitConfig.sensitive),
  upload: rateLimit(rateLimitConfig.upload),
  read: rateLimit(rateLimitConfig.read)
}

/**
 * Middleware de rate limiting com fallback seguro
 * Se o rate limiter falhar, permite a requisição continuar
 */
export function safeRateLimit(rateLimiter: any) {
  return (req: any, res: any, next: any) => {
    try {
      rateLimiter(req, res, next)
    } catch (error) {
      logger.error('Erro no rate limiter, permitindo requisição', error, {
        ip: req.ip,
        path: req.path,
        method: req.method
      })
      next()
    }
  }
}

/**
 * Rate limiter customizável com base em chaves dinâmicas
 */
export function createDynamicRateLimit(options: {
  keyGenerator: (req: any) => string
  windowMs: number
  max: number
  message?: string
}) {
  const store = new Map<string, { count: number; resetTime: number }>()

  return (req: any, res: any, next: any) => {
    try {
      const key = options.keyGenerator(req)
      const now = Date.now()
      
      // Limpar entradas antigas
      for (const [k, data] of store.entries()) {
        if (data.resetTime < now) {
          store.delete(k)
        }
      }
      
      const existing = store.get(key)
      
      if (!existing || existing.resetTime < now) {
        // Nova janela
        store.set(key, {
          count: 1,
          resetTime: now + options.windowMs
        })
        return next()
      }
      
      // Incrementar contador
      existing.count++
      
      if (existing.count > options.max) {
        logger.warn('Rate limit dinâmico excedido', {
          key,
          count: existing.count,
          max: options.max,
          resetTime: existing.resetTime
        })
        
        return res.status(429).json({
          error: 'Rate limit excedido',
          message: options.message || 'Muitas requisições',
          retryAfter: Math.ceil((existing.resetTime - now) / 1000)
        })
      }
      
      next()
    } catch (error) {
      logger.error('Erro no rate limit dinâmico', error)
      next()
    }
  }
}

/**
 * Rate limiter por usuário autenticado
 */
export const userRateLimit = createDynamicRateLimit({
  keyGenerator: (req: any) => `user:${req.user?.id || req.ip}`,
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // 200 requisições por usuário
  message: 'Você excedeu seu limite de requisições'
})

/**
 * Rate limiter por empresa
 */
export const companyRateLimit = createDynamicRateLimit({
  keyGenerator: (req: any) => `company:${req.user?.companyId || req.ip}`,
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // 500 requisições por empresa
  message: 'Sua empresa excedeu o limite de requisições'
})

/**
 * Middleware combinado que aplica múltiplos níveis de rate limiting
 */
export function combinedRateLimit(req: any, res: any, next: any) {
  // Aplicar rate limits em cascata
  const middlewares = [
    safeRateLimit(rateLimiters.general),
    userRateLimit,
    companyRateLimit
  ]
  
  let currentIndex = 0
  
  function nextMiddleware() {
    if (currentIndex >= middlewares.length) {
      return next()
    }
    
    const middleware = middlewares[currentIndex++]
    middleware(req, res, nextMiddleware)
  }
  
  nextMiddleware()
}

/**
 * Função para verificar se um IP está bloqueado
 */
export function isBlockedIP(ip: string): boolean {
  // Lista de IPs suspeitos (exemplo)
  const blockedIPs = [
    '192.168.1.100', // Exemplo de IP bloqueado
  ]
  
  return blockedIPs.includes(ip)
}

/**
 * Middleware para bloquear IPs suspeitos
 */
export function blockSuspiciousIPs(req: any, res: any, next: any) {
  if (isBlockedIP(req.ip)) {
    logger.warn('IP bloqueado tentando acesso', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    })
    
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Seu IP foi bloqueado por suspeita de atividade maliciosa'
    })
  }
  
  next()
}