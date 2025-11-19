import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useWizardState } from './hooks/useWizardState';
import { toast } from 'sonner';
import StepIndicator from './components/StepIndicator';
import { WizardStep } from './types';

const NovoRecursoWizard: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    setCliente,
    setServico,
    setPagamento,
    setRecurso,
    nextStep,
    previousStep,
    goToStep,
    validateCurrentStep,
    resetWizard,
    saveDraft
  } = useWizardState();

  // Auto-save a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft();
    }, 30000);

    return () => clearInterval(interval);
  }, [saveDraft]);

  const handleBack = () => {
    if (state.currentStep === 1) {
      navigate('/recursos');
    } else {
      previousStep();
    }
  };

  const handleSaveDraft = async () => {
    await saveDraft();
    toast.success('Rascunho salvo com sucesso!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Voltar</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">
                Novo Recurso
              </h1>
            </div>

            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Salvar Rascunho</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {/* Step Indicator */}
          <div className="mb-8">
            <StepIndicator
              currentStep={state.currentStep}
              completedSteps={[]}
              onStepClick={(step: WizardStep) => goToStep(step)}
              allowNavigation={false}
            />
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {state.currentStep === 1 && (
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Etapa 1: Selecione o Cliente
                </h2>
                <p className="text-gray-600 mb-8">
                  Componente Step1Cliente será implementado na Task 1.3
                </p>
                <button
                  onClick={nextStep}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Próximo (Teste)
                </button>
              </div>
            )}

            {state.currentStep === 2 && (
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Etapa 2: Escolha o Serviço
                </h2>
                <p className="text-gray-600 mb-8">
                  Componente Step2Servico será implementado na Task 1.4
                </p>
                <button
                  onClick={nextStep}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Próximo (Teste)
                </button>
              </div>
            )}

            {state.currentStep === 3 && (
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Etapa 3: Pagamento
                </h2>
                <p className="text-gray-600 mb-8">
                  Componente Step3Pagamento será implementado na Fase 2
                </p>
                <button
                  onClick={nextStep}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Próximo (Teste)
                </button>
              </div>
            )}

            {state.currentStep === 4 && (
              <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Etapa 4: Dados do Recurso
                </h2>
                <p className="text-gray-600 mb-8">
                  Componente Step4Recurso será implementado na Fase 3
                </p>
                <button
                  onClick={() => {
                    toast.success('Wizard completo! (Modo teste)');
                    navigate('/recursos');
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Finalizar (Teste)
                </button>
              </div>
            )}
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{state.error}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={previousStep}
              disabled={state.currentStep === 1}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>

            <div className="text-sm text-gray-500">
              Etapa {state.currentStep} de 4
            </div>

            <button
              onClick={nextStep}
              disabled={state.currentStep === 4 || !state.canProceed}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NovoRecursoWizard;
