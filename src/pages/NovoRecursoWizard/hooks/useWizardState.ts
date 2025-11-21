import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  WizardState,
  WizardStep,
  Cliente,
  Servico,
  Pagamento,
  RecursoFormData,
  StepValidation
} from '../types';
import { useRecursoDraft } from '@/hooks/useRecursoDraft';

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
  const [searchParams] = useSearchParams();
  const { 
    currentDraft, 
    isSaving, 
    createDraft, 
    saveDraft: saveDraftToDb, 
    loadDraft: loadDraftFromDb 
  } = useRecursoDraft();

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

  // Salvar rascunho no banco de dados
  const saveDraft = useCallback(async () => {
    if (!currentDraft?.id) {
      console.log('⚠️ Nenhum rascunho ativo para salvar');
      return;
    }

    try {
      console.log(`💾 Salvando rascunho ${currentDraft.id} - Step ${state.currentStep}...`);
      
      // Preparar dados organizados por step
      const wizardData: any = {};
      
      // Step 1 - Cliente
      if (state.cliente) {
        wizardData.step1 = {
          cliente_id: state.cliente.id,
          cliente_nome: state.cliente.nome,
          cliente_cpf_cnpj: state.cliente.cpf_cnpj,
          cliente_email: state.cliente.email
        };
      }
      
      // Step 2 - Serviço
      if (state.servico) {
        wizardData.step2 = {
          servico_id: state.servico.id,
          servico_nome: state.servico.nome,
          servico_preco: state.servico.preco,
          servico_tipo: state.servico.tipo_recurso
        };
      }
      
      // Step 3 - Pagamento
      if (state.pagamento) {
        wizardData.step3 = {
          payment_method: state.pagamento.metodo
        };
      }
      
      console.log('📦 Dados a salvar:', wizardData);
      
      // Salvar no banco
      await saveDraftToDb(currentDraft.id, state.currentStep, wizardData);
      
      console.log('✅ Rascunho salvo com sucesso');
    } catch (error) {
      console.error('❌ Erro ao salvar rascunho:', error);
    }
  }, [currentDraft, state, saveDraftToDb]);

  // Criar ou carregar rascunho ao iniciar
  useEffect(() => {
    const recursoId = searchParams.get('recursoId');
    
    if (recursoId) {
      // Carregar rascunho existente
      console.log('📂 Carregando rascunho existente:', recursoId);
      loadDraft(recursoId);
    } else {
      // Criar novo rascunho
      console.log('📝 Criando novo rascunho...');
      createDraft().then(draft => {
        if (draft) {
          console.log('✅ Novo rascunho criado:', draft.id);
        }
      });
    }
  }, []);

  // Auto-save ao mudar dados importantes
  useEffect(() => {
    if (currentDraft?.id && (state.cliente || state.servico || state.pagamento)) {
      const timeoutId = setTimeout(() => {
        saveDraft();
      }, 2000); // Debounce de 2 segundos

      return () => clearTimeout(timeoutId);
    }
  }, [state.cliente, state.servico, state.pagamento, currentDraft, saveDraft]);

  // Carregar rascunho do banco de dados
  const loadDraft = useCallback(async (draftId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      console.log(`📂 Carregando rascunho ${draftId}...`);
      
      const draft = await loadDraftFromDb(draftId);
      
      if (draft && draft.wizard_data) {
        // Restaurar dados do wizard
        const wizardData = draft.wizard_data;
        
        setState(prev => ({
          ...prev,
          currentStep: (draft.current_step || 1) as WizardStep,
          cliente: wizardData.step1 ? {
            id: wizardData.step1.cliente_id || '',
            nome: wizardData.step1.cliente_nome || '',
            cpf_cnpj: wizardData.step1.cliente_cpf_cnpj || '',
            email: wizardData.step1.cliente_email || '',
          } as Cliente : null,
          servico: wizardData.step2 ? {
            id: wizardData.step2.servico_id || '',
            nome: wizardData.step2.servico_nome || '',
            preco: wizardData.step2.servico_preco || 0,
            tipo_recurso: wizardData.step2.servico_tipo || '',
            ativo: true,
          } as Servico : null,
          isLoading: false,
        }));
        
        console.log('✅ Rascunho carregado com sucesso');
      } else {
        console.log('⚠️ Rascunho não encontrado ou vazio');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('❌ Erro ao carregar rascunho:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erro ao carregar rascunho'
      }));
    }
  }, [loadDraftFromDb]);

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
    loadDraft,
    isSaving,
    currentDraft
  };
};
