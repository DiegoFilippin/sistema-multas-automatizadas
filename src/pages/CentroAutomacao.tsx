import { useState, useEffect } from 'react';
import { 
  Bot,
  Play,
  Pause,
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  FileText,
  Calendar,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Brain,
  Cpu,
  Database,
  Globe,
  Mail,
  MessageSquare,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import AIModelViewModal from '../components/AIModelViewModal';
import AIModelRetrainModal from '../components/AIModelRetrainModal';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  type: 'deteccao' | 'recurso' | 'notificacao' | 'pagamento';
  status: 'ativo' | 'inativo' | 'pausado';
  trigger: string;
  actions: string[];
  lastRun: string;
  successRate: number;
  executionCount: number;
  createdAt: string;
}

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

interface AutomationMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  resourcesGenerated: number;
  detectedFines: number;
  notificationsSent: number;
  costSavings: number;
}

function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ativo':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Ativo' };
      case 'inativo':
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inativo' };
      case 'pausado':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pausado' };
      case 'treinando':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Treinando' };
      case 'erro':
        return { bg: 'bg-red-100', text: 'text-red-800', label: 'Erro' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    }
  };
  
  const config = getStatusConfig(status);
  
  return (
    <span className={cn(
      'px-2 py-1 text-xs font-medium rounded-full',
      config.bg,
      config.text
    )}>
      {config.label}
    </span>
  );
}

function MetricCard({ title, value, change, icon: Icon, trend }: {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500 mr-1" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500 mr-1" />}
              <span className={cn(
                'text-sm font-medium',
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
              )}>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function AutomationCard({ automation, onToggle, onEdit, onDelete, onView }: {
  automation: AutomationRule;
  onToggle: (id: string) => void;
  onEdit: (automation: AutomationRule) => void;
  onDelete: (id: string) => void;
  onView: (automation: AutomationRule) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{automation.name}</h3>
          <p className="text-gray-600 text-sm mt-1">{automation.description}</p>
        </div>
        <StatusBadge status={automation.status} />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Taxa de Sucesso</p>
          <p className="text-sm font-medium">{automation.successRate}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Execuções</p>
          <p className="text-sm font-medium">{automation.executionCount}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => onView(automation)}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Visualizar"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(automation)}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(automation.id)}
            className="p-2 text-gray-400 hover:text-red-600"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={() => onToggle(automation.id)}
          className={cn(
            'flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium',
            automation.status === 'ativo'
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          )}
        >
          {automation.status === 'ativo' ? (
            <><Pause className="w-4 h-4" /> Pausar</>
          ) : (
            <><Play className="w-4 h-4" /> Ativar</>
          )}
        </button>
      </div>
    </div>
  );
}

function AIModelCard({ model, onRetrain, onView }: {
  model: AIModel;
  onRetrain: (id: string) => void;
  onView: (model: AIModel) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
          <p className="text-gray-600 text-sm mt-1">{model.description}</p>
        </div>
        <StatusBadge status={model.status} />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Precisão</p>
          <p className="text-sm font-medium">{model.accuracy}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Versão</p>
          <p className="text-sm font-medium">{model.version}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => onView(model)}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Visualizar"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={() => onRetrain(model.id)}
          className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Retreinar
        </button>
      </div>
    </div>
  );
}

function AutomationModal({ showCreateModal, showEditModal, editingAutomation, handleSaveAutomation, setShowCreateModal, setShowEditModal, setEditingAutomation }: {
  showCreateModal: boolean;
  showEditModal: boolean;
  editingAutomation: AutomationRule | null;
  handleSaveAutomation: (data: any) => void;
  setShowCreateModal: (show: boolean) => void;
  setShowEditModal: (show: boolean) => void;
  setEditingAutomation: (automation: AutomationRule | null) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'deteccao' as 'deteccao' | 'recurso' | 'notificacao' | 'pagamento',
    description: '',
    trigger: '',
    actions: []
  });

  useEffect(() => {
    if (editingAutomation) {
      setFormData({
        name: editingAutomation.name,
        type: editingAutomation.type,
        description: editingAutomation.description,
        trigger: editingAutomation.trigger,
        actions: editingAutomation.actions
      });
    } else {
      setFormData({
        name: '',
        type: 'deteccao',
        description: '',
        trigger: '',
        actions: []
      });
    }
  }, [editingAutomation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveAutomation(formData);
  };

  const handleClose = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingAutomation(null);
  };

  if (!showCreateModal && !showEditModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingAutomation ? 'Editar Automação' : 'Nova Automação'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Automação
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Detecção automática de multas"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'deteccao' | 'recurso' | 'notificacao' | 'pagamento' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="deteccao">Detecção</option>
                <option value="recurso">Recurso</option>
                <option value="notificacao">Notificação</option>
                <option value="pagamento">Pagamento</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descreva o que esta automação faz..."
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingAutomation ? 'Salvar Alterações' : 'Criar Automação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const CentroAutomacao = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRetrainModal, setShowRetrainModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationRule | null>(null);

  // Mock data
  const metrics: AutomationMetrics = {
    totalExecutions: 15420,
    successfulExecutions: 14876,
    failedExecutions: 544,
    averageExecutionTime: 2.3,
    resourcesGenerated: 1247,
    detectedFines: 892,
    notificationsSent: 3456,
    costSavings: 125000
  };

  const automations: AutomationRule[] = [
    {
      id: '1',
      name: 'Detecção Automática de Multas',
      description: 'Monitora automaticamente novos autos de infração',
      type: 'deteccao',
      status: 'ativo',
      trigger: 'Novo documento recebido',
      actions: ['Classificar documento', 'Extrair dados', 'Notificar cliente'],
      lastRun: '2024-01-15 14:30',
      successRate: 96.5,
      executionCount: 1247,
      createdAt: '2024-01-01'
    },
    {
      id: '2',
      name: 'Geração de Recursos',
      description: 'Gera automaticamente recursos para multas elegíveis',
      type: 'recurso',
      status: 'ativo',
      trigger: 'Multa classificada como recorrível',
      actions: ['Analisar viabilidade', 'Gerar recurso', 'Enviar para revisão'],
      lastRun: '2024-01-15 13:45',
      successRate: 89.2,
      executionCount: 456,
      createdAt: '2024-01-05'
    }
  ];

  const aiModels: AIModel[] = [
    {
      id: '1',
      name: 'Classificador de Documentos',
      type: 'classificacao',
      accuracy: 96.8,
      status: 'ativo',
      lastTrained: '2024-01-10',
      version: '2.1.0',
      description: 'Classifica automaticamente tipos de documentos'
    },
    {
      id: '2',
      name: 'Gerador de Recursos',
      type: 'geracao',
      accuracy: 92.4,
      status: 'ativo',
      lastTrained: '2024-01-08',
      version: '1.8.3',
      description: 'Gera textos de recursos baseados em jurisprudência'
    }
  ];

  // Filtrar automações
  const filteredAutomations = automations.filter(automation => {
    const matchesSearch = automation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         automation.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || automation.type === filterType;
    const matchesStatus = filterStatus === 'all' || automation.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Handlers
  const handleToggleAutomation = (id: string) => {
    toast.success('Status da automação alterado!');
  };

  const handleEditAutomation = (automation: AutomationRule) => {
    setEditingAutomation(automation);
    setShowEditModal(true);
  };

  const handleViewAutomation = (automation: AutomationRule) => {
    toast.info(`Visualizando: ${automation.name}`);
  };

  const handleRetrainModel = (id: string) => {
    const model = aiModels.find(m => m.id === id);
    if (model) {
      setSelectedModel(model);
      setShowRetrainModal(true);
    }
  };

  const handleViewModel = (model: AIModel) => {
    setSelectedModel(model);
    setShowViewModal(true);
  };

  const handleDeleteAutomation = (id: string) => {
    toast.success('Automação excluída!');
  };

  const handleCreateAutomation = () => {
    setEditingAutomation(null);
    setShowCreateModal(true);
  };

  const handleSaveAutomation = (data: any) => {
    if (editingAutomation) {
      toast.success('Automação atualizada!');
    } else {
      toast.success('Nova automação criada!');
    }
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingAutomation(null);
  };

  const handleExportLogs = () => {
    toast.success('Logs exportados!');
  };

  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Dados atualizados!');
    } finally {
      setIsLoading(false);
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Execuções Totais"
          value={metrics.totalExecutions.toLocaleString()}
          change="+12% este mês"
          icon={Activity}
          trend="up"
        />
        <MetricCard
          title="Taxa de Sucesso"
          value={`${((metrics.successfulExecutions / metrics.totalExecutions) * 100).toFixed(1)}%`}
          change="+2.3% este mês"
          icon={CheckCircle}
          trend="up"
        />
        <MetricCard
          title="Recursos Gerados"
          value={metrics.resourcesGenerated}
          change="+18% este mês"
          icon={FileText}
          trend="up"
        />
        <MetricCard
          title="Economia Gerada"
          value={`R$ ${metrics.costSavings.toLocaleString()}`}
          change="+25% este mês"
          icon={TrendingUp}
          trend="up"
        />
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Automações Ativas</h2>
          <button
            onClick={handleCreateAutomation}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Automação</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {automations.slice(0, 4).map(automation => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onToggle={handleToggleAutomation}
              onEdit={handleEditAutomation}
              onDelete={handleDeleteAutomation}
              onView={handleViewAutomation}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderAutomationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar automações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os tipos</option>
              <option value="deteccao">Detecção</option>
              <option value="recurso">Recurso</option>
              <option value="notificacao">Notificação</option>
              <option value="pagamento">Pagamento</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleRefreshData}
              disabled={isLoading}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
            <button
              onClick={handleCreateAutomation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Automação</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAutomations.map(automation => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            onToggle={handleToggleAutomation}
            onEdit={handleEditAutomation}
            onDelete={handleDeleteAutomation}
            onView={handleViewAutomation}
          />
        ))}
      </div>
      
      {filteredAutomations.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma automação encontrada</h3>
          <p className="text-gray-600 mb-6">Tente ajustar os filtros ou criar uma nova automação.</p>
          <button
            onClick={handleCreateAutomation}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Criar Primeira Automação
          </button>
        </div>
      )}
    </div>
  );

  const renderAIModelsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Modelos de IA Teste</h2>
            <p className="text-gray-600 mt-1">Gerencie e monitore os modelos de inteligência artificial</p>
          </div>
          <button
            onClick={handleExportLogs}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Logs</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {aiModels.map(model => (
            <AIModelCard
              key={model.id}
              model={model}
              onRetrain={handleRetrainModel}
              onView={handleViewModel}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centro de Automação</h1>
          <p className="text-gray-600 mt-1">Gerencie automações e modelos de IA</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Sistema Online</span>
          </div>
          <button
            onClick={handleRefreshData}
            disabled={isLoading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
              { id: 'automations', label: 'Automações', icon: Bot },
              { id: 'ai-models', label: 'Modelos IA', icon: Brain }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'automations' && renderAutomationsTab()}
          {activeTab === 'ai-models' && renderAIModelsTab()}
        </div>
      </div>
      
      {(showCreateModal || showEditModal) && (
        <AutomationModal
          showCreateModal={showCreateModal}
          showEditModal={showEditModal}
          editingAutomation={editingAutomation}
          handleSaveAutomation={handleSaveAutomation}
          setShowCreateModal={setShowCreateModal}
          setShowEditModal={setShowEditModal}
          setEditingAutomation={setEditingAutomation}
        />
      )}
      
      {showViewModal && selectedModel && (
        <AIModelViewModal
          model={selectedModel}
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedModel(null);
          }}
        />
      )}
      
      {showRetrainModal && selectedModel && (
        <AIModelRetrainModal
          model={selectedModel}
          isOpen={showRetrainModal}
          onClose={() => {
            setShowRetrainModal(false);
            setSelectedModel(null);
          }}
          onRetrainComplete={(updatedModel) => {
            toast.success(`Modelo ${updatedModel.name} retreinado com sucesso!`);
            setShowRetrainModal(false);
            setSelectedModel(null);
          }}
        />
      )}
    </div>
  );
};

export default CentroAutomacao;