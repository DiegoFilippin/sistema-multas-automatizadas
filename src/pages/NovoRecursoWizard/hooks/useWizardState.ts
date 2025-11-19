import { useState, useCallback } from 'react';
import {
  WizardState,
  WizardStep,
  Cliente,
  Servico,
  Pagamento,
  RecursoFormData,
  StepValidation
} from '../types';

const initialState: WizardState = {
  currentStep: 1,
  cliente: null,
  servico: null,
  pagamento: null,
  recurso: {},
  canProceed: false,
  isLoading: false,
  error: null,
};

export const useWizardState = () => {
  const [state, setState] = useState<WizardState>(initialState);

  // Atualizar cliente
  const setCliente = useCallback((cliente: Cliente | null) => {
    setState(prev => ({
      ...prev,
      cliente,
      canProceed: cliente !== null
    }));
  }, []);

  // Atualizar serviço
  const setServico = useCallback((servico: Servico | null) => {
    setState(prev => ({
      ...prev,
      servico,
      canProceed: servico !== null
    }));
  }, []);

  // Atualizar pagamento
  const setPagamento = useCallback((pagamento: Pagamento | null) => {
    setState(prev => ({
      ...prev,
      pagamento,
      canProceed: pagamento?.status === 'paid'
    }));
  }, []);

  // Atualizar dados do recurso
  const setRecurso = useCallback((recurso: RecursoFormData) => {
    setState(prev => ({
      ...prev,
      recurso: { ...prev.recurso, ...recurso }
    }));
  }, []);

  // Validar etapa atual
  const validateCurrentStep = useCallback((): StepValidation => {
    const { currentStep, cliente, servico, pagamento, recurso } = state;

    switch (currentStep) {
      case 1:
        // Validar seleção de cliente
        if (!cliente) {
          return {
            isValid: false,
            errors: ['Selecione um cliente para continuar']
          };
        }
        return { isValid: true, errors: [] };

      case 2:
        // Validar seleção de serviço
        if (!servico) {
          return {
            isValid: false,
            errors: ['Selecione um serviço para continuar']
          };
        }
        return { isValid: true, errors: [] };

      case 3:
        // Validar pagamento
        if (!pagamento) {
          return {
            isValid: false,
            errors: ['Selecione uma forma de pagamento']
          };
        }
        if (pagamento.status !== 'paid') {
          return {
            isValid: false,
            errors: ['Aguardando confirmação do pagamento']
          };
        }
        return { isValid: true, errors: [] };

      case 4:
        // Validar dados do recurso
        const errors: string[] = [];
        
        if (!recurso.placa_veiculo) {
          errors.push('Placa do veículo é obrigatória');
        }
        if (!recurso.data_infracao) {
          errors.push('Data da infração é obrigatória');
        }
        
        return {
          isValid: errors.length === 0,
          errors
        };

      default:
        return { isValid: false, errors: ['Etapa inválida'] };
    }
  }, [state]);

  // Ir para uma etapa específica
  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({
      ...prev,
      currentStep: step
    }));
  }, []);

  // Avançar para próxima etapa
  const nextStep = useCallback(() => {
    const validation = validateCurrentStep();
    
    if (!validation.isValid) {
      setState(prev => ({
        ...prev,
        error: validation.errors[0]
      }));
      return;
    }

    setState(prev => {
      const nextStep = Math.min(prev.currentStep + 1, 4) as WizardStep;
      return {
        ...prev,
        currentStep: nextStep,
        error: null,
        canProceed: false
      };
    });
  }, [validateCurrentStep]);

  // Voltar para etapa anterior
  const previousStep = useCallback(() => {
    setState(prev => {
      const prevStep = Math.max(prev.currentStep - 1, 1) as WizardStep;
      return {
        ...prev,
        currentStep: prevStep,
        error: null
      };
    });
  }, []);

  // Resetar wizard
  const resetWizard = useCallback(() => {
    setState(initialState);
  }, []);

  // Salvar rascunho (implementação básica)
  const saveDraft = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // TODO: Implementar salvamento no banco
      const draftData = {
        cliente: state.cliente,
        servico: state.servico,
        recurso: state.recurso,
        currentStep: state.currentStep
      };
      
      localStorage.setItem('wizard_draft', JSON.stringify(draftData));
      
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erro ao salvar rascunho'
      }));
    }
  }, [state]);

  // Carregar rascunho (implementação básica)
  const loadDraft = useCallback(async (draftId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // TODO: Implementar carregamento do banco
      const draftData = localStorage.getItem('wizard_draft');
      
      if (draftData) {
        const parsed = JSON.parse(draftData);
        setState(prev => ({
          ...prev,
          ...parsed,
          isLoading: false,
          draftId
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar rascunho:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erro ao carregar rascunho'
      }));
    }
  }, []);

  return {
    state,
    setCliente,
    setServico,
    setPagamento,
    setRecurso,
    goToStep,
    nextStep,
    previousStep,
    validateCurrentStep,
    resetWizard,
    saveDraft,
    loadDraft
  };
};
