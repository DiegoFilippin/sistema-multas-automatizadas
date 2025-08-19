import { useState } from 'react';
import {
  X,
  Brain,
  TrendingUp,
  Clock,
  Target,
  Activity,
  BarChart3,
  Calendar,
  Cpu,
  Database,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingTime: string;
  datasetSize: number;
  epochs: number;
  learningRate: number;
}

interface TrainingLog {
  epoch: number;
  loss: number;
  accuracy: number;
  timestamp: string;
}

interface AIModelViewModalProps {
  model: AIModel;
  isOpen: boolean;
  onClose: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ativo':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Ativo', icon: CheckCircle };
      case 'treinando':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Treinando', icon: Activity };
      case 'erro':
        return { bg: 'bg-red-100', text: 'text-red-800', label: 'Erro', icon: AlertTriangle };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: status, icon: Info };
    }
  };
  
  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <span className={cn(
      'inline-flex items-center space-x-1 px-3 py-1 text-sm font-medium rounded-full',
      config.bg,
      config.text
    )}>
      <Icon className="w-4 h-4" />
      <span>{config.label}</span>
    </span>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        {trend && (
          <TrendingUp className={cn(
            'w-4 h-4',
            trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'
          )} />
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-sm text-gray-600 mt-1">{subtitle}</div>}
    </div>
  );
}

function PerformanceChart({ logs }: { logs: TrainingLog[] }) {
  const maxAccuracy = Math.max(...logs.map(log => log.accuracy));
  const minAccuracy = Math.min(...logs.map(log => log.accuracy));
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-4">Evolução da Precisão</h4>
      <div className="h-32 flex items-end space-x-1">
        {logs.slice(-10).map((log, index) => {
          const height = ((log.accuracy - minAccuracy) / (maxAccuracy - minAccuracy)) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                style={{ height: `${Math.max(height, 5)}%` }}
                title={`Época ${log.epoch}: ${log.accuracy.toFixed(2)}%`}
              />
              <span className="text-xs text-gray-500 mt-1">{log.epoch}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>Épocas</span>
        <span>{minAccuracy.toFixed(1)}% - {maxAccuracy.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function AIModelViewModal({ model, isOpen, onClose }: AIModelViewModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Mock data - em uma implementação real, estes dados viriam de uma API
  const metrics: ModelMetrics = {
    accuracy: model.accuracy,
    precision: 92.5,
    recall: 88.3,
    f1Score: 90.3,
    trainingTime: '2h 34m',
    datasetSize: 15420,
    epochs: 50,
    learningRate: 0.001
  };
  
  const trainingLogs: TrainingLog[] = [
    { epoch: 1, loss: 0.85, accuracy: 65.2, timestamp: '2024-01-15 10:00' },
    { epoch: 5, loss: 0.72, accuracy: 72.1, timestamp: '2024-01-15 10:15' },
    { epoch: 10, loss: 0.58, accuracy: 78.5, timestamp: '2024-01-15 10:30' },
    { epoch: 15, loss: 0.45, accuracy: 83.2, timestamp: '2024-01-15 10:45' },
    { epoch: 20, loss: 0.38, accuracy: 86.7, timestamp: '2024-01-15 11:00' },
    { epoch: 25, loss: 0.32, accuracy: 89.1, timestamp: '2024-01-15 11:15' },
    { epoch: 30, loss: 0.28, accuracy: 90.8, timestamp: '2024-01-15 11:30' },
    { epoch: 35, loss: 0.25, accuracy: 91.9, timestamp: '2024-01-15 11:45' },
    { epoch: 40, loss: 0.23, accuracy: 92.5, timestamp: '2024-01-15 12:00' },
    { epoch: 45, loss: 0.21, accuracy: 93.1, timestamp: '2024-01-15 12:15' },
    { epoch: 50, loss: 0.19, accuracy: model.accuracy, timestamp: '2024-01-15 12:30' }
  ];
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{model.name}</h2>
              <p className="text-gray-600">{model.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <StatusBadge status={model.status} />
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Visão Geral' },
              { id: 'metrics', label: 'Métricas' },
              { id: 'training', label: 'Treinamento' },
              { id: 'logs', label: 'Logs' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Precisão"
                  value={`${model.accuracy}%`}
                  icon={Target}
                  trend="up"
                />
                <MetricCard
                  title="Versão"
                  value={model.version}
                  subtitle="Última versão"
                  icon={Info}
                />
                <MetricCard
                  title="Último Treino"
                  value={model.lastTrained}
                  icon={Calendar}
                />
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Informações do Modelo</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <span className="ml-2 font-medium capitalize">{model.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ID:</span>
                    <span className="ml-2 font-mono text-xs">{model.id}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Precisão"
                  value={`${metrics.precision}%`}
                  icon={Target}
                  trend="up"
                />
                <MetricCard
                  title="Recall"
                  value={`${metrics.recall}%`}
                  icon={Activity}
                  trend="up"
                />
                <MetricCard
                  title="F1-Score"
                  value={`${metrics.f1Score}%`}
                  icon={BarChart3}
                  trend="up"
                />
                <MetricCard
                  title="Acurácia"
                  value={`${metrics.accuracy}%`}
                  icon={CheckCircle}
                  trend="up"
                />
              </div>
              
              <PerformanceChart logs={trainingLogs} />
            </div>
          )}
          
          {activeTab === 'training' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Tempo de Treino"
                  value={metrics.trainingTime}
                  icon={Clock}
                />
                <MetricCard
                  title="Dataset"
                  value={metrics.datasetSize.toLocaleString()}
                  subtitle="amostras"
                  icon={Database}
                />
                <MetricCard
                  title="Épocas"
                  value={metrics.epochs}
                  icon={Cpu}
                />
                <MetricCard
                  title="Learning Rate"
                  value={metrics.learningRate}
                  icon={TrendingUp}
                />
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Configurações de Treinamento</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Otimizador:</span>
                      <span className="font-medium">Adam</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Batch Size:</span>
                      <span className="font-medium">32</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dropout:</span>
                      <span className="font-medium">0.2</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Função de Perda:</span>
                      <span className="font-medium">CrossEntropy</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Regularização:</span>
                      <span className="font-medium">L2 (0.01)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Early Stopping:</span>
                      <span className="font-medium">Ativo</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Logs de Treinamento</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {trainingLogs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded border text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="font-mono text-gray-500">Época {log.epoch}</span>
                        <span className="text-gray-600">{log.timestamp}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-600">Loss: {log.loss.toFixed(3)}</span>
                        <span className="font-medium">Acc: {log.accuracy.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}