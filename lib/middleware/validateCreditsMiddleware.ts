import { Request, Response, NextFunction } from 'express';
import { creditService, InsufficientCreditsError } from '../services/creditService.js';
import { servicePricingService } from '../services/servicePricingService.js';

// Interface para request com dados de créditos
export interface CreditValidationRequest extends Request {
  creditValidation?: {
    serviceId: string;
    clientId: string;
    companyId: string;
    useCompanyCredits?: boolean;
    servicePrice: number;
    availableBalance: number;
  };
}

// Interface para configuração do middleware
export interface ValidateCreditsOptions {
  serviceIdField?: string; // Campo do body que contém o serviceId
  clientIdField?: string;  // Campo do body que contém o clientId
  companyIdField?: string; // Campo do body que contém o companyId
  useCompanyCreditsField?: string; // Campo do body que indica uso de créditos da empresa
  skipValidation?: boolean; // Pular validação (para testes)
}

// Middleware principal para validar créditos
export const validateCreditsMiddleware = (options: ValidateCreditsOptions = {}) => {
  return async (req: CreditValidationRequest, res: Response, next: NextFunction) => {
    try {
      // Configurações padrão
      const {
        serviceIdField = 'serviceId',
        clientIdField = 'clientId',
        companyIdField = 'companyId',
        useCompanyCreditsField = 'useCompanyCredits',
        skipValidation = false
      } = options;

      // Pular validação se configurado (útil para testes)
      if (skipValidation) {
        return next();
      }

      // Extrair dados do request
      const serviceId = req.body[serviceIdField] || req.params.serviceId;
      const clientId = req.body[clientIdField] || req.params.clientId;
      const companyId = req.body[companyIdField] || req.params.companyId;
      const useCompanyCredits = req.body[useCompanyCreditsField] || false;
      const userId = req.user?.id;

      // Validar campos obrigatórios
      if (!serviceId) {
        return res.status(400).json({
          error: 'Campo serviceId é obrigatório',
          code: 'MISSING_SERVICE_ID'
        });
      }

      if (!clientId) {
        return res.status(400).json({
          error: 'Campo clientId é obrigatório',
          code: 'MISSING_CLIENT_ID'
        });
      }

      if (!companyId) {
        return res.status(400).json({
          error: 'Campo companyId é obrigatório',
          code: 'MISSING_COMPANY_ID'
        });
      }

      // Buscar preço do serviço
      const servicePrice = await servicePricingService.getServicePrice(serviceId, companyId);
      
      if (!servicePrice || servicePrice <= 0) {
        return res.status(400).json({
          error: 'Serviço não encontrado ou preço inválido',
          code: 'INVALID_SERVICE_PRICE',
          serviceId
        });
      }

      // Verificar saldo disponível
      const balanceInfo = await creditService.getAvailableBalance(
        clientId,
        companyId,
        useCompanyCredits
      );

      // Validar saldo suficiente
      if (balanceInfo.total < servicePrice) {
        return res.status(402).json({
          error: 'Saldo insuficiente para executar o serviço',
          code: 'INSUFFICIENT_CREDITS',
          details: {
            requiredAmount: servicePrice,
            availableAmount: balanceInfo.total,
            clientBalance: balanceInfo.clientBalance,
            companyBalance: balanceInfo.companyBalance,
            serviceId,
            clientId,
            companyId
          }
        });
      }

      // Adicionar informações ao request para uso posterior
      req.creditValidation = {
        serviceId,
        clientId,
        companyId,
        useCompanyCredits,
        servicePrice,
        availableBalance: balanceInfo.total
      };

      // Continuar para o próximo middleware
      next();
    } catch (error) {
      console.error('Erro no middleware de validação de créditos:', error);
      
      if (error instanceof InsufficientCreditsError) {
        return res.status(402).json({
          error: error.message,
          code: 'INSUFFICIENT_CREDITS',
          details: {
            requiredAmount: error.requiredAmount,
            availableAmount: error.availableAmount
          }
        });
      }

      return res.status(500).json({
        error: 'Erro interno ao validar créditos',
        code: 'CREDIT_VALIDATION_ERROR'
      });
    }
  };
};

// Middleware para debitar créditos após execução bem-sucedida
export const debitCreditsMiddleware = () => {
  return async (req: CreditValidationRequest, res: Response, next: NextFunction) => {
    try {
      // Verificar se a validação foi feita
      if (!req.creditValidation) {
        return res.status(500).json({
          error: 'Validação de créditos não foi executada',
          code: 'MISSING_CREDIT_VALIDATION'
        });
      }

      const {
        serviceId,
        clientId,
        companyId,
        useCompanyCredits
      } = req.creditValidation;

      const userId = req.user?.id;
      const description = `Uso do serviço: ${serviceId}`;

      // Debitar créditos
      await creditService.validateAndDebitCredits({
        serviceId,
        clientId,
        companyId,
        useCompanyCredits,
        userId,
        description
      });

      console.log(`Créditos debitados com sucesso: ${req.creditValidation.servicePrice} para cliente ${clientId}`);
      
      next();
    } catch (error) {
      console.error('Erro ao debitar créditos:', error);
      
      if (error instanceof InsufficientCreditsError) {
        return res.status(402).json({
          error: error.message,
          code: 'INSUFFICIENT_CREDITS',
          details: {
            requiredAmount: error.requiredAmount,
            availableAmount: error.availableAmount
          }
        });
      }

      return res.status(500).json({
        error: 'Erro interno ao debitar créditos',
        code: 'CREDIT_DEBIT_ERROR'
      });
    }
  };
};

// Middleware combinado: validar e debitar em uma única operação
export const validateAndDebitCreditsMiddleware = (options: ValidateCreditsOptions = {}) => {
  return async (req: CreditValidationRequest, res: Response, next: NextFunction) => {
    try {
      // Configurações padrão
      const {
        serviceIdField = 'serviceId',
        clientIdField = 'clientId',
        companyIdField = 'companyId',
        useCompanyCreditsField = 'useCompanyCredits',
        skipValidation = false
      } = options;

      // Pular validação se configurado
      if (skipValidation) {
        return next();
      }

      // Extrair dados do request
      const serviceId = req.body[serviceIdField] || req.params.serviceId;
      const clientId = req.body[clientIdField] || req.params.clientId;
      const companyId = req.body[companyIdField] || req.params.companyId;
      const useCompanyCredits = req.body[useCompanyCreditsField] || false;
      const userId = req.user?.id;

      // Validar campos obrigatórios
      if (!serviceId || !clientId || !companyId) {
        return res.status(400).json({
          error: 'Campos serviceId, clientId e companyId são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Validar e debitar créditos em uma única operação
      await creditService.validateAndDebitCredits({
        serviceId,
        clientId,
        companyId,
        useCompanyCredits,
        userId,
        description: `Execução do serviço: ${serviceId}`
      });

      console.log(`Créditos validados e debitados com sucesso para serviço ${serviceId}`);
      
      next();
    } catch (error) {
      console.error('Erro ao validar e debitar créditos:', error);
      
      if (error instanceof InsufficientCreditsError) {
        return res.status(402).json({
          error: error.message,
          code: 'INSUFFICIENT_CREDITS',
          details: {
            requiredAmount: error.requiredAmount,
            availableAmount: error.availableAmount
          }
        });
      }

      return res.status(500).json({
        error: 'Erro interno ao processar créditos',
        code: 'CREDIT_PROCESSING_ERROR'
      });
    }
  };
};

// Middleware para verificar saldo sem debitar (apenas informativo)
export const checkCreditsMiddleware = (options: ValidateCreditsOptions = {}) => {
  return async (req: CreditValidationRequest, res: Response, next: NextFunction) => {
    try {
      const {
        serviceIdField = 'serviceId',
        clientIdField = 'clientId',
        companyIdField = 'companyId',
        useCompanyCreditsField = 'useCompanyCredits'
      } = options;

      const serviceId = req.body[serviceIdField] || req.params.serviceId;
      const clientId = req.body[clientIdField] || req.params.clientId;
      const companyId = req.body[companyIdField] || req.params.companyId;
      const useCompanyCredits = req.body[useCompanyCreditsField] || false;

      if (serviceId && clientId && companyId) {
        // Buscar preço do serviço
        const servicePrice = await servicePricingService.getServicePrice(serviceId, companyId);
        
        // Verificar saldo disponível
        const balanceInfo = await creditService.getAvailableBalance(
          clientId,
          companyId,
          useCompanyCredits
        );

        // Adicionar informações ao request
        req.creditValidation = {
          serviceId,
          clientId,
          companyId,
          useCompanyCredits,
          servicePrice: servicePrice || 0,
          availableBalance: balanceInfo.total
        };
      }

      next();
    } catch (error) {
      console.error('Erro ao verificar créditos:', error);
      // Não bloquear a execução, apenas logar o erro
      next();
    }
  };
};

// Exportar middleware padrão
export default validateAndDebitCreditsMiddleware;