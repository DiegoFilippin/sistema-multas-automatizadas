/**
 * Sistema de Logging Estruturado
 * 
 * Este logger fornece uma interface consistente para logging com diferentes níveis
 * e formatação estruturada, mantendo compatibilidade com console.log existente
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export type LogContext = unknown;

export interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
  enableContext: boolean;
}

// Novo: interface para loggers com escopo
export interface ScopedLogger {
  debug(message: string, context?: unknown): void;
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  error(message: string, error?: Error | unknown, context?: unknown): void;
  auth(message: string, context?: unknown): void;
  api(message: string, context?: unknown): void;
  db(message: string, context?: unknown): void;
  performance(message: string, duration: number, context?: unknown): void;
}

// Helper seguro para acessar import.meta.env sem any
function getViteEnv(): Record<string, unknown> | undefined {
  try {
    const meta = import.meta as unknown as { env?: Record<string, unknown> };
    return meta?.env;
  } catch {
    return undefined;
  }
}

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: this.getLogLevelFromEnv(),
      enableColors: true,
      enableTimestamp: true,
      enableContext: true,
      ...config,
    };

    const viteEnv = getViteEnv();
    const hasProcessEnv = typeof process !== 'undefined' && typeof process.env !== 'undefined';
    const viteDev = typeof viteEnv?.['DEV'] === 'boolean' ? (viteEnv['DEV'] as boolean) : undefined;
    this.isDevelopment = (viteDev !== undefined)
      ? viteDev
      : (hasProcessEnv ? process.env.NODE_ENV === 'development' : false);
  }

  private getLogLevelFromEnv(): LogLevel {
    const viteEnv = getViteEnv();
    const hasProcessEnv = typeof process !== 'undefined' && typeof process.env !== 'undefined';

    const viteLevel = typeof viteEnv?.['VITE_LOG_LEVEL'] === 'string' ? (viteEnv['VITE_LOG_LEVEL'] as string) : undefined;
    const nodeViteLevel = hasProcessEnv ? process.env.VITE_LOG_LEVEL : undefined;
    const nodeLevel = hasProcessEnv ? process.env.LOG_LEVEL : undefined;

    const levelSource = (viteLevel ?? nodeViteLevel ?? nodeLevel ?? 'INFO');
    const level = String(levelSource).toUpperCase();
    switch (level) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, context?: unknown): string {
    const parts: string[] = [];

    if (this.config.enableTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    parts.push(`[${level}]`);
    parts.push(message);

    if (this.config.enableContext && context && typeof context === 'object' && Object.keys(context as Record<string, unknown>).length > 0) {
      const contextStr = Object.entries(context as Record<string, unknown>)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      parts.push(`{${contextStr}}`);
    }

    return parts.join(' ');
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private log(level: LogLevel, levelName: string, message: string, context?: unknown) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(levelName, message, context);
    
    // Usar console methods apropriados para manter stack traces
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, context?: unknown) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  info(message: string, context?: unknown) {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  warn(message: string, context?: unknown) {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  error(message: string, error?: Error | unknown, context?: unknown) {
    const enhancedContext: Record<string, unknown> = {
      ...(context && typeof context === 'object' ? (context as Record<string, unknown>) : { context }),
      ...(error instanceof Error && {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: this.isDevelopment ? error.stack : undefined,
      }),
      ...(typeof error === 'string' && { errorMessage: error }),
    };

    this.log(LogLevel.ERROR, 'ERROR', message, enhancedContext);
  }

  // Métodos auxiliares para contextos comuns
  auth(message: string, context?: unknown) {
    const ctx = context && typeof context === 'object' ? (context as Record<string, unknown>) : { context };
    this.info(message, { ...ctx, category: 'auth' });
  }

  api(message: string, context?: unknown) {
    const ctx = context && typeof context === 'object' ? (context as Record<string, unknown>) : { context };
    this.info(message, { ...ctx, category: 'api' });
  }

  db(message: string, context?: unknown) {
    const ctx = context && typeof context === 'object' ? (context as Record<string, unknown>) : { context };
    this.info(message, { ...ctx, category: 'database' });
  }

  performance(message: string, duration: number, context?: unknown) {
    const ctx = context && typeof context === 'object' ? (context as Record<string, unknown>) : { context };
    this.info(message, { ...ctx, duration, category: 'performance' });
  }

  // Novo: criar um logger com escopo
  scope(name: string, defaultContext?: unknown): ScopedLogger {
    const baseContext = defaultContext && typeof defaultContext === 'object'
      ? (defaultContext as Record<string, unknown>)
      : (defaultContext !== undefined ? { context: defaultContext } : {});
    const merge = (ctx?: unknown) => ({
      scope: name,
      ...baseContext,
      ...(ctx && typeof ctx === 'object' ? (ctx as Record<string, unknown>) : (ctx !== undefined ? { context: ctx } : {}))
    });

    return {
      debug: (message: string, context?: unknown) => this.debug(`[${name}] ${message}`, merge(context)),
      info: (message: string, context?: unknown) => this.info(`[${name}] ${message}`, merge(context)),
      warn: (message: string, context?: unknown) => this.warn(`[${name}] ${message}`, merge(context)),
      error: (message: string, error?: Error | unknown, context?: unknown) => this.error(`[${name}] ${message}`, error, merge(context)),
      auth: (message: string, context?: unknown) => this.auth(`[${name}] ${message}`, merge(context)),
      api: (message: string, context?: unknown) => this.api(`[${name}] ${message}`, merge(context)),
      db: (message: string, context?: unknown) => this.db(`[${name}] ${message}`, merge(context)),
      performance: (message: string, duration: number, context?: unknown) => this.performance(`[${name}] ${message}`, duration, merge(context)),
    };
  }
}

// Logger global com configuração padrão
export const logger = new Logger();

// Logger para ambientes específicos
export const authLogger = new Logger({ level: LogLevel.INFO });
export const apiLogger = new Logger({ level: LogLevel.INFO });
export const dbLogger = new Logger({ level: LogLevel.WARN });

// Função para criar loggers customizados
export function createLogger(name: string, config?: Partial<LoggerConfig>) {
  return new Logger({ ...config, enableContext: true });
}

// Wrapper para manter compatibilidade com console.log existente
export function withLoggerContext<T extends (...args: unknown[]) => unknown>(
  fn: T,
  context: unknown
): T {
  return ((...args: Parameters<T>) => {
    logger.info(`Calling ${fn.name}`, context);
    try {
      const result = fn(...args);
      logger.info(`Completed ${fn.name}`, context);
      return result as ReturnType<T>;
    } catch (error: unknown) {
      logger.error(`Failed ${fn.name}`, error, context);
      throw error;
    }
  }) as T;
}

// Helper para medir performance
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>,
  context?: unknown
): T | Promise<T> {
  const start = performance.now();
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        logger.performance(`${name} completed`, duration, context);
      });
    } else {
      const duration = performance.now() - start;
      logger.performance(`${name} completed`, duration, context);
      return result;
    }
  } catch (error: unknown) {
    const duration = performance.now() - start;
    logger.error(`${name} failed`, error, { duration });
    throw error;
  }
}

export default logger;