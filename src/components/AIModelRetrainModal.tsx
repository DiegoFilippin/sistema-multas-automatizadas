import { useState } from 'react';
import {
  X,
  RefreshCw,
  Settings,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Cpu,
  TrendingUp,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AIModel {
  id: string;
  name: string;
  type: 'classificacao' | 'geracao' | 'analise';
  accuracy: number;
  status: 'treinando' | 'ativo' | 'erro';
  lastTrained: string;
  version: string;
  description: string;
}

interface RetrainConfig {
  epochs: number;
  learningRate: number;
  batchSize: number;
  validationSplit: number;
  useNewData: boolean;
  optimizer: 'adam' | 'sgd' | 'rmsprop';
  earlyStopping: boolean;
  saveCheckpoints: boolean;
}

interface AIModelRetrainModalProps {
  model: AIModel;
  isOpen: boolean;
  onClose: () => void;
  onRetrainStart?: (config: RetrainConfig) => void;
  onRetrainComplete?: (model: AIModel) => void;
}

type RetrainStep = 'config' | 'confirm' | 'training' | 'complete';

function ProgressBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ConfigField({ 
  label, 
  value, 
  onChange, 
  type = 'number', 
  min, 
  max, 
  step, 
  options 
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'number' | 'select' | 'checkbox';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: any; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {type === 'number' && (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      )}
      {type === 'select' && options && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {type === 'checkbox' && (
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Ativar</span>
        </label>
      )}
    </div>
  );
}

export default function AIModelRetrainModal({ 
  model, 
  isOpen, 
  onClose, 
  onRetrainStart,
  onRetrainComplete 
}: AIModelRetrainModalProps) {
  const [currentStep, setCurrentStep] = useState<RetrainStep>('config');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  
  const [config, setConfig] = useState<RetrainConfig>({
    epochs: 50,
    learningRate: 0.001,
    batchSize: 32,
    validationSplit: 0.2,
    useNewData: true,
    optimizer: 'adam',
    earlyStopping: true,
    saveCheckpoints: true
  });
  
  const updateConfig = (key: keyof RetrainConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };
  
  const handleStartTraining = () => {
    setCurrentStep('training');
    setIsTraining(true);
    onRetrainStart?.(config);
    
    // Simular progresso de treinamento
    let progress = 0;
    let epoch = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 3;
      epoch = Math.floor((progress / 100) * config.epochs);
      
      if (progress >= 100) {
        progress = 100;
        epoch = config.epochs;
        setIsTraining(false);
        setCurrentStep('complete');
        clearInterval(interval);
        toast.success('Retreinamento concluído com sucesso!');
        
        // Chamar callback de conclusão
        onRetrainComplete?.({
          ...model,
          accuracy: Math.min(model.accuracy + Math.random() * 5, 99.9),
          lastTrained: new Date().toISOString().split('T')[0],
          status: 'ativo' as const
        });
      }
      
      setTrainingProgress(Math.min(progress, 100));
      setCurrentEpoch(epoch);
    }, 200);
  };
  
  const handleClose = () => {
    if (isTraining) {
      toast.error('Não é possível fechar durante o treinamento');
      return;
    }
    setCurrentStep('config');
    setTrainingProgress(0);
    setCurrentEpoch(0);
    onClose();
  };
  
  const resetModal = () => {
    setCurrentStep('config');
    setTrainingProgress(0);
    setCurrentEpoch(0);
    setIsTraining(false);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <RefreshCw className={cn(
                'w-6 h-6 text-orange-600',
                isTraining && 'animate-spin'
              )} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Retreinar Modelo</h2>
              <p className="text-gray-600">{model.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isTraining}
            className={cn(
              'p-2 rounded-lg',
              isTraining 
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {[
              { id: 'config', label: 'Configuração', icon: Settings },
              { id: 'confirm', label: 'Confirmação', icon: AlertTriangle },
              { id: 'training', label: 'Treinamento', icon: Play },
              { id: 'complete', label: 'Concluído', icon: CheckCircle }
            ].map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = ['config', 'confirm', 'training'].indexOf(currentStep) > ['config', 'confirm', 'training'].indexOf(step.id);
              
              return (
                <div key={step.id} className="flex items-center space-x-2">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-600 text-white' :
                    'bg-gray-200 text-gray-600'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    'text-sm font-medium',
                    isActive ? 'text-blue-600' :
                    isCompleted ? 'text-green-600' :
                    'text-gray-500'
                  )}>
                    {step.label}
                  </span>
                  {index < 3 && (
                    <div className={cn(
                      'w-8 h-0.5',
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {currentStep === 'config' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Configurações de Retreinamento</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Ajuste os parâmetros de treinamento conforme necessário. As configurações padrão são otimizadas para a maioria dos casos.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                    <Cpu className="w-4 h-4" />
                    <span>Parâmetros de Treinamento</span>
                  </h4>
                  
                  <ConfigField
                    label="Épocas"
                    value={config.epochs}
                    onChange={(value) => updateConfig('epochs', value)}
                    min={1}
                    max={200}
                  />
                  
                  <ConfigField
                    label="Taxa de Aprendizado"
                    value={config.learningRate}
                    onChange={(value) => updateConfig('learningRate', value)}
                    step={0.0001}
                    min={0.0001}
                    max={1}
                  />
                  
                  <ConfigField
                    label="Tamanho do Lote"
                    value={config.batchSize}
                    onChange={(value) => updateConfig('batchSize', value)}
                    min={1}
                    max={128}
                  />
                  
                  <ConfigField
                    label="Divisão de Validação"
                    value={config.validationSplit}
                    onChange={(value) => updateConfig('validationSplit', value)}
                    step={0.05}
                    min={0.1}
                    max={0.5}
                  />
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Configurações Avançadas</span>
                  </h4>
                  
                  <ConfigField
                    label="Otimizador"
                    value={config.optimizer}
                    onChange={(value) => updateConfig('optimizer', value)}
                    type="select"
                    options={[
                      { value: 'adam', label: 'Adam' },
                      { value: 'sgd', label: 'SGD' },
                      { value: 'rmsprop', label: 'RMSprop' }
                    ]}
                  />
                  
                  <ConfigField
                    label="Usar Novos Dados"
                    value={config.useNewData}
                    onChange={(value) => updateConfig('useNewData', value)}
                    type="checkbox"
                  />
                  
                  <ConfigField
                    label="Early Stopping"
                    value={config.earlyStopping}
                    onChange={(value) => updateConfig('earlyStopping', value)}
                    type="checkbox"
                  />
                  
                  <ConfigField
                    label="Salvar Checkpoints"
                    value={config.saveCheckpoints}
                    onChange={(value) => updateConfig('saveCheckpoints', value)}
                    type="checkbox"
                  />
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 'confirm' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900">Confirmar Retreinamento</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      O retreinamento irá substituir o modelo atual. Este processo pode levar algum tempo e não pode ser interrompido.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Resumo da Configuração</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Épocas:</span>
                      <span className="font-medium">{config.epochs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taxa de Aprendizado:</span>
                      <span className="font-medium">{config.learningRate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tamanho do Lote:</span>
                      <span className="font-medium">{config.batchSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Otimizador:</span>
                      <span className="font-medium capitalize">{config.optimizer}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Validação:</span>
                      <span className="font-medium">{(config.validationSplit * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Novos Dados:</span>
                      <span className="font-medium">{config.useNewData ? 'Sim' : 'Não'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Early Stopping:</span>
                      <span className="font-medium">{config.earlyStopping ? 'Sim' : 'Não'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Checkpoints:</span>
                      <span className="font-medium">{config.saveCheckpoints ? 'Sim' : 'Não'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Tempo Estimado</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Aproximadamente {Math.ceil(config.epochs / 10)} - {Math.ceil(config.epochs / 5)} minutos</span>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 'training' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Retreinando Modelo</h3>
                <p className="text-gray-600">O modelo está sendo retreinado com as novas configurações...</p>
              </div>
              
              <div className="space-y-4">
                <ProgressBar 
                  progress={trainingProgress} 
                  label={`Progresso Geral (Época ${currentEpoch}/${config.epochs})`} 
                />
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">{currentEpoch}</div>
                    <div className="text-sm text-gray-600">Época Atual</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">{trainingProgress.toFixed(1)}%</div>
                    <div className="text-sm text-gray-600">Progresso</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.ceil((100 - trainingProgress) * 0.1)}m
                    </div>
                    <div className="text-sm text-gray-600">Tempo Restante</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Log de Treinamento</h4>
                <div className="space-y-1 text-sm font-mono text-gray-600 max-h-32 overflow-y-auto">
                  <div>Iniciando retreinamento...</div>
                  <div>Carregando dataset...</div>
                  <div>Configurando modelo...</div>
                  {currentEpoch > 0 && <div>Época {currentEpoch}: Loss = 0.{Math.floor(Math.random() * 900 + 100)}</div>}
                  {currentEpoch > 5 && <div>Validação: Accuracy = {(85 + Math.random() * 10).toFixed(1)}%</div>}
                  {currentEpoch > 10 && <div>Checkpoint salvo</div>}
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 'complete' && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900">Retreinamento Concluído!</h3>
                <p className="text-gray-600 mt-2">
                  O modelo foi retreinado com sucesso e está pronto para uso.
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">Resultados do Retreinamento</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">94.2%</div>
                    <div className="text-green-700">Nova Precisão</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">+2.1%</div>
                    <div className="text-green-700">Melhoria</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-between space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {currentStep === 'complete' && (
              <button
                onClick={resetModal}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Retreinar Novamente
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            {currentStep === 'config' && (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setCurrentStep('confirm')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Continuar
                </button>
              </>
            )}
            
            {currentStep === 'confirm' && (
              <>
                <button
                  onClick={() => setCurrentStep('config')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Voltar
                </button>
                <button
                  onClick={handleStartTraining}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Iniciar Retreinamento</span>
                </button>
              </>
            )}
            
            {currentStep === 'training' && (
              <button
                disabled
                className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Treinando...</span>
              </button>
            )}
            
            {currentStep === 'complete' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Concluir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}