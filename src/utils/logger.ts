export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;

function shouldLog(level: LogLevel): boolean {
  if (isDev) return true;
  return level === 'warn' || level === 'error';
}

function formatScope(scope?: string): string {
  return scope ? `[${scope}]` : '';
}

export function createLogger(scope?: string) {
  const base = (level: LogLevel, ...args: unknown[]) => {
    if (!shouldLog(level)) return;
    const prefix = `${formatScope(scope)}`;
    switch (level) {
      case 'debug':
        console.debug(prefix, ...args);
        break;
      case 'info':
        console.info(prefix, ...args);
        break;
      case 'warn':
        console.warn(prefix, ...args);
        break;
      case 'error':
        console.error(prefix, ...args);
        break;
      default:
        console.log(prefix, ...args);
    }
  };

  return {
    debug: (...args: unknown[]) => base('debug', ...args),
    info: (...args: unknown[]) => base('info', ...args),
    warn: (...args: unknown[]) => base('warn', ...args),
    error: (...args: unknown[]) => base('error', ...args),
    scope: (childScope: string) => createLogger(scope ? `${scope}:${childScope}` : childScope),
  };
}

// Logger global opcional
export const logger = createLogger('app');