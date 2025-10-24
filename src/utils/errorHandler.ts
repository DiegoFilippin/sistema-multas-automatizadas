/**
 * Utilitários para tratamento de erros padronizado
 * 
 * Este módulo fornece funções para lidar com erros de forma consistente
 * em toda a aplicação, mantendo compatibilidade com o código existente
 */

import { logger } from './logger.js'

/**
 * Tipos de erros padronizados
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  BUSINESS_RULE = 'BUSINESS_RULE_ERROR',
  SYSTEM = 'SYSTEM_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR'
}

/**
 * Interface para erros padronizados
 */
export interface AppError extends Error {
  type: ErrorType
  statusCode: number
  details?: any
  isOperational: boolean
}

/**
 * Classe de erro padronizada
 */
export class StandardError extends Error implements AppError {
  type: ErrorType
  statusCode: number
  details?: any
  isOperational: boolean

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number = 500,
    details?: any
  ) {
    super(message)
    this.name = 'StandardError'
    this.type = type
    this.statusCode = statusCode
    this.details = details
    this.isOperational = true

    // Mantém o stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StandardError)
    }
  }
}

/**
 * Função para criar erros específicos com base em tipos comuns
 */
export const createError = {
  validation: (message: string, details?: any) => 
    new StandardError(message, ErrorType.VALIDATION, 400, details),
  
  authentication: (message: string = 'Não autorizado', details?: any) => 
    new StandardError(message, ErrorType.AUTHENTICATION, 401, details),
  
  authorization: (message: string = 'Acesso negado', details?: any) => 
    new StandardError(message, ErrorType.AUTHORIZATION, 403, details),
  
  notFound: (resource: string, details?: any) => 
    new StandardError(`${resource} não encontrado`, ErrorType.NOT_FOUND, 404, details),
  
  database: (message: string, details?: any) => 
    new StandardError(message, ErrorType.DATABASE, 500, details),
  
  externalApi: (service: string, message: string, details?: any) => 
    new StandardError(`Erro ao comunicar com ${service}: ${message}`, ErrorType.EXTERNAL_API, 503, details),
  
  businessRule: (message: string, details?: any) => 
    new StandardError(message, ErrorType.BUSINESS_RULE, 409, details),
  
  system: (message: string, details?: any) => 
    new StandardError(message, ErrorType.SYSTEM, 500, details),
  
  rateLimit: (message: string = 'Muitas requisições', details?: any) => 
    new StandardError(message, ErrorType.RATE_LIMIT, 429, details)
}

/**
 * Verifica se um erro é um erro operacional (não deve ser exposto ao usuário)
 */
export function isOperationalError(error: any): boolean {
  return error instanceof StandardError && error.isOperational
}

/**
 * Verifica se um erro é um erro de banco de dados do Prisma
 */
export function isPrismaError(error: any): boolean {
  return error?.code && error.code.startsWith('P')
}

/**
 * Converte erros do Prisma em erros padronizados
 */
export function handlePrismaError(error: any): StandardError {
  // Erros conhecidos do Prisma
  switch (error.code) {
    case 'P2002': // Violação de restrição única
      return createError.validation('Dados duplicados', {
        field: error.meta?.target,
        value: error.meta?.value
      })
    
    case 'P2025': // Registro não encontrado
      return createError.notFound('Registro', {
        cause: error.meta?.cause
      })
    
    case 'P2003': // Violação de chave estrangeira
      return createError.validation('Referência inválida', {
        field: error.meta?.field_name,
        constraint: error.meta?.constraint_name
      })
    
    case 'P2014': // Violação de restrição de integridade
      return createError.businessRule('Não é possível excluir este registro', {
        reason: 'existem dependências',
        field: error.meta?.field_name
      })
    
    default:
      return createError.database('Erro no banco de dados', {
        code: error.code,
        message: error.message
      })
  }
}

/**
 * Converte erros de autenticação do Supabase em erros padronizados
 */
export function handleSupabaseError(error: any): StandardError {
  if (error.message?.includes('JWT')) {
    return createError.authentication('Token inválido ou expirado')
  }
  
  if (error.message?.includes('permission')) {
    return createError.authorization('Permissão negada no banco de dados')
  }
  
  if (error.message?.includes('not found')) {
    return createError.notFound('Registro')
  }
  
  return createError.database('Erro no Supabase', {
    message: error.message,
    code: error.code
  })
}

/**
 * Função para logar erros de forma padronizada
 */
export function logError(error: Error, context?: any): void {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context,
    timestamp: new Date().toISOString()
  }

  if (error instanceof StandardError) {
    logger.error(`[${error.type}] ${error.message}`, logData)
  } else {
    logger.error('Erro não tratado', logData)
  }
}

/**
 * Função para enviar respostas de erro padronizadas
 */
export function sendErrorResponse(res: any, error: Error, includeStack = false): void {
  if (error instanceof StandardError) {
    const response: any = {
      error: error.message,
      type: error.type,
      statusCode: error.statusCode
    }

    if (error.details) {
      response.details = error.details
    }

    if (includeStack && process.env.NODE_ENV === 'development') {
      response.stack = error.stack
    }

    res.status(error.statusCode).json(response)
  } else {
    // Para erros não tratados, logar e enviar resposta genérica
    logError(error)
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      type: ErrorType.SYSTEM
    })
  }
}

/**
 * Wrapper para funções assíncronas com tratamento de erro automático
 */
export function asyncHandler(fn: Function) {
  return async (req: any, res: any, next: any) => {
    try {
      await fn(req, res, next)
    } catch (error) {
      // Tratar erros específicos
      if (isPrismaError(error)) {
        const appError = handlePrismaError(error)
        logError(appError, { req: req.path, method: req.method })
        sendErrorResponse(res, appError)
      } else if (error.name === 'AuthApiError' || error.name === 'AuthError') {
        const appError = handleSupabaseError(error)
        logError(appError, { req: req.path, method: req.method })
        sendErrorResponse(res, appError)
      } else if (error instanceof StandardError) {
        logError(error, { req: req.path, method: req.method })
        sendErrorResponse(res, error)
      } else {
        // Erro não esperado
        logError(error, { req: req.path, method: req.method })
        sendErrorResponse(res, error)
      }
    }
  }
}

/**
 * Função para validar e sanitizar entrada de dados
 */
export function validateInput(data: any, schema: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = []

  // Validações básicas
  if (schema.required && !data) {
    errors.push('Dados são obrigatórios')
    return { valid: false, errors }
  }

  if (schema.type && typeof data !== schema.type) {
    errors.push(`Tipo inválido. Esperado: ${schema.type}`)
  }

  if (schema.minLength && data.length < schema.minLength) {
    errors.push(`Mínimo de ${schema.minLength} caracteres`)
  }

  if (schema.maxLength && data.length > schema.maxLength) {
    errors.push(`Máximo de ${schema.maxLength} caracteres`)
  }

  if (schema.pattern && !schema.pattern.test(data)) {
    errors.push('Formato inválido')
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  }
}

/**
 * Função para criar respostas de sucesso padronizadas
 */
export function sendSuccessResponse(res: any, data: any, message?: string): void {
  const response: any = {
    success: true,
    data
  }

  if (message) {
    response.message = message
  }

  res.json(response)
}

/**
 * Função para criar respostas paginadas padronizadas
 */
export function sendPaginatedResponse(res: any, data: any[], total: number, page: number, limit: number): void {
  res.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  })
}