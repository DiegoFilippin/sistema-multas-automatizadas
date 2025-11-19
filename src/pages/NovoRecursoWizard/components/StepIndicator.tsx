import React from 'react';
import { Check } from 'lucide-react';
import { WizardStep } from '../types';

interface Step {
  number: WizardStep;
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  currentStep: WizardStep;
  completedSteps?: WizardStep[];
  onStepClick?: (step: WizardStep) => void;
  allowNavigation?: boolean;
}

const steps: Step[] = [
  { number: 1, label: 'Cliente', description: 'Selecione o cliente' },
  { number: 2, label: 'Serviço', description: 'Escolha o serviço' },
  { number: 3, label: 'Pagamento', description: 'Processe o pagamento' },
  { number: 4, label: 'Recurso', description: 'Preencha os dados' },
];

const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  completedSteps = [],
  onStepClick,
  allowNavigation = false,
}) => {
  const isStepCompleted = (stepNumber: WizardStep) => {
    return completedSteps.includes(stepNumber) || stepNumber < currentStep;
  };

  const isStepActive = (stepNumber: WizardStep) => {
    return stepNumber === currentStep;
  };

  const canNavigateToStep = (stepNumber: WizardStep) => {
    return allowNavigation && (isStepCompleted(stepNumber) || stepNumber <= currentStep);
  };

  const handleStepClick = (stepNumber: WizardStep) => {
    if (canNavigateToStep(stepNumber) && onStepClick) {
      onStepClick(stepNumber);
    }
  };

  return (
    <div className="w-full">
      {/* Desktop View */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = isStepCompleted(step.number);
            const isActive = isStepActive(step.number);
            const isClickable = canNavigateToStep(step.number);

            return (
              <React.Fragment key={step.number}>
                {/* Step Circle */}
                <div className="flex flex-col items-center relative">
                  <button
                    onClick={() => handleStepClick(step.number)}
                    disabled={!isClickable}
                    className={`
                      relative z-10 flex items-center justify-center
                      w-12 h-12 rounded-full font-bold text-sm
                      transition-all duration-300 ease-in-out
                      ${isActive ? 'ring-4 ring-blue-200 ring-offset-2' : ''}
                      ${isCompleted 
                        ? 'bg-green-500 text-white shadow-lg scale-105' 
                        : isActive 
                          ? 'bg-blue-600 text-white shadow-lg scale-110' 
                          : 'bg-gray-200 text-gray-500'
                      }
                      ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}
                    `}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6 animate-in zoom-in duration-300" />
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </button>
                  
                  {/* Step Label */}
                  <div className="mt-3 text-center">
                    <p className={`
                      text-sm font-semibold transition-colors
                      ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}
                    `}>
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 hidden lg:block">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-4 relative">
                    <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                    <div 
                      className={`
                        absolute inset-0 rounded-full transition-all duration-500 ease-in-out
                        ${isStepCompleted(step.number) ? 'bg-green-500' : 'bg-gray-200'}
                      `}
                      style={{
                        width: isStepCompleted(step.number) ? '100%' : '0%',
                      }}
                    ></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="space-y-3">
          {steps.map((step) => {
            const isCompleted = isStepCompleted(step.number);
            const isActive = isStepActive(step.number);
            const isClickable = canNavigateToStep(step.number);

            return (
              <button
                key={step.number}
                onClick={() => handleStepClick(step.number)}
                disabled={!isClickable}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-xl
                  transition-all duration-300
                  ${isActive 
                    ? 'bg-blue-50 border-2 border-blue-500 shadow-md' 
                    : isCompleted
                      ? 'bg-green-50 border-2 border-green-500'
                      : 'bg-gray-50 border-2 border-gray-200'
                  }
                  ${isClickable ? 'cursor-pointer hover:shadow-lg' : 'cursor-not-allowed opacity-60'}
                `}
              >
                {/* Step Circle */}
                <div className={`
                  flex items-center justify-center
                  w-10 h-10 rounded-full font-bold text-sm flex-shrink-0
                  ${isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-300 text-gray-600'
                  }
                `}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 text-left">
                  <p className={`
                    font-semibold text-sm
                    ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-600'}
                  `}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {step.description}
                  </p>
                </div>

                {/* Status Indicator */}
                {isActive && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress Bar (Mobile Only) */}
      <div className="md:hidden mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Progresso</span>
          <span>{Math.round((currentStep / 4) * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
