/**
 * Validações para credenciais Asaas (Wallet ID e API Key)
 */

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Valida formato do Wallet ID Asaas
 */
export function validateWalletId(walletId: string): ValidationResult {
  if (!walletId || walletId.trim().length === 0) {
    return {
      isValid: false,
      message: 'Wallet ID é obrigatório'
    };
  }

  // Remove espaços em branco
  const cleanWalletId = walletId.trim();

  // Valida tamanho mínimo e máximo
  if (cleanWalletId.length < 10) {
    return {
      isValid: false,
      message: 'Wallet ID deve ter no mínimo 10 caracteres'
    };
  }

  if (cleanWalletId.length > 50) {
    return {
      isValid: false,
      message: 'Wallet ID deve ter no máximo 50 caracteres'
    };
  }

  // Valida caracteres permitidos (alfanuméricos e hífen)
  const validPattern = /^[a-zA-Z0-9-]+$/;
  if (!validPattern.test(cleanWalletId)) {
    return {
      isValid: false,
      message: 'Wallet ID contém caracteres inválidos. Use apenas letras, números e hífens.'
    };
  }

  return {
    isValid: true,
    message: 'Wallet ID válido'
  };
}

/**
 * Valida formato da API Key Asaas
 */
export function validateApiKey(apiKey: string): ValidationResult {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      isValid: false,
      message: 'API Key é obrigatória'
    };
  }

  // Remove espaços em branco
  const cleanApiKey = apiKey.trim();

  // Valida tamanho mínimo
  if (cleanApiKey.length < 20) {
    return {
      isValid: false,
      message: 'API Key deve ter no mínimo 20 caracteres'
    };
  }

  // Valida prefixo esperado do Asaas
  if (!cleanApiKey.startsWith('$aact_')) {
    return {
      isValid: false,
      message: 'API Key deve começar com "$aact_"'
    };
  }

  // Valida formato base64 (padrão comum para API keys)
  const base64Pattern = /^[A-Za-z0-9+/=_-]+$/;
  if (!base64Pattern.test(cleanApiKey)) {
    return {
      isValid: false,
      message: 'API Key contém caracteres inválidos'
    };
  }

  return {
    isValid: true,
    message: 'API Key válida'
  };
}

/**
 * Mascara uma API Key para exibição (mostra apenas os primeiros e últimos caracteres)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 10) {
    return '••••••••••';
  }

  const firstPart = apiKey.substring(0, 8);
  const lastPart = apiKey.substring(apiKey.length - 4);
  const maskedPart = '•'.repeat(Math.max(0, apiKey.length - 12));

  return `${firstPart}${maskedPart}${lastPart}`;
}

/**
 * Retorna a primeira mensagem de erro de validação (útil para formulários)
 */
export function getFirstValidationError(walletId?: string, apiKey?: string): string | null {
  if (walletId !== undefined) {
    const walletValidation = validateWalletId(walletId);
    if (!walletValidation.isValid) {
      return walletValidation.message;
    }
  }

  if (apiKey !== undefined) {
    const apiKeyValidation = validateApiKey(apiKey);
    if (!apiKeyValidation.isValid) {
      return apiKeyValidation.message;
    }
  }

  return null;
}

/**
 * Valida se as credenciais têm o formato esperado antes de testar conexão
 */
export function validateCredentialsFormat(walletId: string, apiKey: string): ValidationResult {
  const walletValidation = validateWalletId(walletId);
  if (!walletValidation.isValid) {
    return walletValidation;
  }

  const apiKeyValidation = validateApiKey(apiKey);
  if (!apiKeyValidation.isValid) {
    return apiKeyValidation;
  }

  return {
    isValid: true,
    message: 'Formato das credenciais válido'
  };
}

/**
 * Limpa e normaliza credenciais antes de uso
 */
export function sanitizeCredentials(walletId: string, apiKey: string): {
  walletId: string;
  apiKey: string;
} {
  return {
    walletId: walletId.trim(),
    apiKey: apiKey.trim()
  };
}