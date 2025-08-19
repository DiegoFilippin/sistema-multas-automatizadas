import { useState, useEffect } from 'react';
import { 
  CreditCard,
  DollarSign,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Download,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Mail,
  Phone,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Receipt,
  Banknote,
  Wallet,
  Building,
  User,
  Calendar as CalendarIcon,
  Target,
  Zap,
  Bell,
  Settings,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  description: string;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  paymentMethod?: string;
  services: InvoiceService[];
}

interface InvoiceService {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PaymentMethod {
  id: string;
  type: 'pix' | 'boleto' | 'cartao' | 'transferencia';
  name: string;
  enabled: boolean;
  config: any;
}

interface BillingMetrics {
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  paidAmount: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  averageTicket: number;
  conversionRate: number;
}

function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pago':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Pago' };
      case 'pendente':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente' };
      case 'vencido':
        return { bg: 'bg-red-100', text: 'text-red-800', label: 'Vencido' };
      case 'cancelado':
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelado' };
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

function MetricCard({ title, value, change, icon: Icon, trend, color = 'blue' }: {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600'
  };
  
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
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', colorClasses[color as keyof typeof colorClasses])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

    </div>
  );
}

// Componente de formulário para fatura
const InvoiceForm = ({ invoice, onSave, onCancel }: {
  invoice: Invoice | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    clientName: invoice?.clientName || '',
    clientEmail: invoice?.clientEmail || '',
    amount: invoice?.amount || 0,
    description: invoice?.description || '',
    dueDate: invoice?.dueDate || new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Cliente
            </label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email do Cliente
            </label>
            <input
              type="email"
              value={formData.clientEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Vencimento
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
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
            placeholder="Descreva os serviços ou produtos..."
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {invoice ? 'Atualizar' : 'Criar'} Fatura
        </button>
      </div>
    </form>
  );
};

// Componente de formulário para método de pagamento
const PaymentMethodForm = ({ method, onSave, onCancel }: {
  method: PaymentMethod | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: method?.name || '',
    config: method?.config || {}
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const renderConfigFields = () => {
    switch (method?.type) {
      case 'pix':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chave PIX
            </label>
            <input
              type="text"
              value={formData.config.key || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                config: { ...prev.config, key: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email@exemplo.com ou CPF/CNPJ"
            />
          </div>
        );
      case 'boleto':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banco
            </label>
            <input
              type="text"
              value={formData.config.bank || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                config: { ...prev.config, bank: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome do banco"
            />
          </div>
        );
      case 'cartao':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gateway de Pagamento
            </label>
            <input
              type="text"
              value={formData.config.gateway || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                config: { ...prev.config, gateway: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Stripe, PagSeguro"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Método
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {renderConfigFields()}
      </div>

      <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Salvar Configurações
        </button>
      </div>
    </form>
  );
};

function InvoiceCard({ invoice, onView, onEdit, onDelete, onSend, onDownload }: {
  invoice: Invoice;
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
  onSend: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
}) {
  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status === 'pendente';
  const actualStatus = isOverdue ? 'vencido' : invoice.status;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900">#{invoice.id}</h3>
            <StatusBadge status={actualStatus} />
          </div>
          <p className="text-sm text-gray-600">{invoice.clientName}</p>
          <p className="text-xs text-gray-500">{invoice.clientEmail}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">R$ {invoice.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500">Venc: {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-700 line-clamp-2">{invoice.description}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs text-gray-500">
        <div>
          <span className="font-medium">Criado:</span> {new Date(invoice.createdAt).toLocaleDateString('pt-BR')}
        </div>
        <div>
          <span className="font-medium">Serviços:</span> {invoice.services.length} item(s)
        </div>
        {invoice.paidAt && (
          <div className="col-span-2">
            <span className="font-medium">Pago em:</span> {new Date(invoice.paidAt).toLocaleDateString('pt-BR')}
            {invoice.paymentMethod && <span className="ml-2">via {invoice.paymentMethod}</span>}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onView(invoice)}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            title="Visualizar"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDownload(invoice)}
            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          {invoice.status === 'pendente' && (
            <button
              onClick={() => onSend(invoice)}
              className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
              title="Enviar"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {invoice.status !== 'pago' && (
            <button
              onClick={() => onEdit(invoice)}
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(invoice.id)}
            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentMethodCard({ method, onToggle, onEdit }: {
  method: PaymentMethod;
  onToggle: (id: string) => void;
  onEdit: (method: PaymentMethod) => void;
}) {
  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'pix': return Zap;
      case 'boleto': return Receipt;
      case 'cartao': return CreditCard;
      case 'transferencia': return Banknote;
      default: return Wallet;
    }
  };
  
  const MethodIcon = getMethodIcon(method.type);
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <MethodIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{method.name}</h3>
            <p className="text-sm text-gray-600 capitalize">{method.type}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggle(method.id)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              method.enabled ? 'bg-blue-600' : 'bg-gray-200'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                method.enabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
          <button
            onClick={() => onEdit(method)}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SistemaCobranca() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showPaymentConfigModal, setShowPaymentConfigModal] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  
  // Mock data
  const [metrics] = useState<BillingMetrics>({
    totalRevenue: 45680,
    pendingAmount: 12340,
    overdueAmount: 3450,
    paidAmount: 29890,
    totalInvoices: 156,
    paidInvoices: 98,
    pendingInvoices: 45,
    overdueInvoices: 13,
    averageTicket: 293,
    conversionRate: 87.2
  });
  
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 'INV-001',
      clientId: '1',
      clientName: 'João Silva',
      clientEmail: 'joao@email.com',
      amount: 450.00,
      description: 'Recurso de multa por excesso de velocidade - Processo 2024001',
      status: 'pago',
      dueDate: '2024-01-15',
      createdAt: '2024-01-01',
      paidAt: '2024-01-10',
      paymentMethod: 'PIX',
      services: [
        { id: '1', description: 'Recurso de Defesa', quantity: 1, unitPrice: 450, total: 450 }
      ]
    },
    {
      id: 'INV-002',
      clientId: '2',
      clientName: 'Maria Santos',
      clientEmail: 'maria@email.com',
      amount: 320.00,
      description: 'Recurso de multa por estacionamento irregular - Processo 2024002',
      status: 'pendente',
      dueDate: '2024-02-20',
      createdAt: '2024-01-20',
      services: [
        { id: '1', description: 'Recurso de Defesa', quantity: 1, unitPrice: 320, total: 320 }
      ]
    },
    {
      id: 'INV-003',
      clientId: '3',
      clientName: 'Carlos Oliveira',
      clientEmail: 'carlos@email.com',
      amount: 680.00,
      description: 'Múltiplos recursos - Processos 2024003, 2024004',
      status: 'pendente',
      dueDate: '2024-01-10',
      createdAt: '2024-01-05',
      services: [
        { id: '1', description: 'Recurso de Defesa', quantity: 2, unitPrice: 340, total: 680 }
      ]
    },
    {
      id: 'INV-004',
      clientId: '4',
      clientName: 'Ana Costa',
      clientEmail: 'ana@email.com',
      amount: 520.00,
      description: 'Recurso de multa por avanço de sinal - Processo 2024005',
      status: 'pago',
      dueDate: '2024-01-25',
      createdAt: '2024-01-15',
      paidAt: '2024-01-22',
      paymentMethod: 'Cartão',
      services: [
        { id: '1', description: 'Recurso de Defesa', quantity: 1, unitPrice: 450, total: 450 },
        { id: '2', description: 'Taxa de Urgência', quantity: 1, unitPrice: 70, total: 70 }
      ]
    }
  ]);
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'pix',
      name: 'PIX',
      enabled: true,
      config: { key: 'pix@empresa.com' }
    },
    {
      id: '2',
      type: 'boleto',
      name: 'Boleto Bancário',
      enabled: true,
      config: { bank: 'Banco do Brasil' }
    },
    {
      id: '3',
      type: 'cartao',
      name: 'Cartão de Crédito',
      enabled: true,
      config: { gateway: 'Stripe' }
    },
    {
      id: '4',
      type: 'transferencia',
      name: 'Transferência Bancária',
      enabled: false,
      config: { account: '12345-6' }
    }
  ]);
  
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (filterStatus !== 'all') {
      if (filterStatus === 'vencido') {
        matchesStatus = new Date(invoice.dueDate) < new Date() && invoice.status === 'pendente';
      } else {
        matchesStatus = invoice.status === filterStatus;
      }
    }
    
    return matchesSearch && matchesStatus;
  });
  
  const handleViewInvoice = (invoice: Invoice) => {
    toast.info('Abrindo detalhes da fatura...');
  };
  
  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowEditModal(true);
  };
  
  const handleDeleteInvoice = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta fatura?')) {
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      toast.success('Fatura excluída com sucesso!');
    }
  };
  
  const handleSendInvoice = (invoice: Invoice) => {
    toast.success(`Fatura ${invoice.id} enviada para ${invoice.clientEmail}`);
  };
  
  const handleDownloadInvoice = (invoice: Invoice) => {
    toast.success(`Download da fatura ${invoice.id} iniciado`);
  };
  
  const handleCreateInvoice = () => {
    setShowCreateModal(true);
  };

  const handleSaveInvoice = (invoiceData: any) => {
    if (editingInvoice) {
      // Simular edição
      setInvoices(prev => prev.map(inv => 
        inv.id === editingInvoice.id 
          ? { ...inv, ...invoiceData }
          : inv
      ));
      toast.success('Fatura atualizada com sucesso!');
    } else {
      // Simular criação
      const newInvoice: Invoice = {
        id: `INV-${Date.now()}`,
        clientId: Date.now().toString(),
        clientName: invoiceData.clientName,
        clientEmail: invoiceData.clientEmail,
        amount: invoiceData.amount,
        description: invoiceData.description,
        status: 'pendente',
        dueDate: invoiceData.dueDate,
        createdAt: new Date().toISOString(),
        services: invoiceData.services || []
      };
      setInvoices(prev => [newInvoice, ...prev]);
      toast.success('Fatura criada com sucesso!');
    }
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingInvoice(null);
  };
  
  const handleTogglePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.map(method => {
      if (method.id === id) {
        const newEnabled = !method.enabled;
        toast.success(`${method.name} ${newEnabled ? 'habilitado' : 'desabilitado'}`);
        return { ...method, enabled: newEnabled };
      }
      return method;
    }));
  };
  
  const handleEditPaymentMethod = (method: PaymentMethod) => {
    setEditingPaymentMethod(method);
    setShowPaymentConfigModal(true);
  };

  const handleSavePaymentMethod = (methodData: any) => {
    if (editingPaymentMethod) {
      setPaymentMethods(prev => prev.map(method => 
        method.id === editingPaymentMethod.id 
          ? { ...method, ...methodData }
          : method
      ));
      toast.success('Método de pagamento atualizado com sucesso!');
    }
    setShowPaymentConfigModal(false);
    setEditingPaymentMethod(null);
  };
  
  const handleExportData = () => {
    toast.success('Relatório exportado com sucesso!');
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
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Receita Total"
          value={`R$ ${metrics.totalRevenue.toLocaleString('pt-BR')}`}
          change="+15% este mês"
          icon={DollarSign}
          trend="up"
          color="green"
        />
        <MetricCard
          title="Valor Pendente"
          value={`R$ ${metrics.pendingAmount.toLocaleString('pt-BR')}`}
          change="-8% este mês"
          icon={Clock}
          trend="down"
          color="yellow"
        />
        <MetricCard
          title="Valor Vencido"
          value={`R$ ${metrics.overdueAmount.toLocaleString('pt-BR')}`}
          change="-12% este mês"
          icon={AlertTriangle}
          trend="down"
          color="red"
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${metrics.conversionRate}%`}
          change="+3.2% este mês"
          icon={Target}
          trend="up"
          color="purple"
        />
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status das Faturas</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Pagas</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{metrics.paidInvoices}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Pendentes</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{metrics.pendingInvoices}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Vencidas</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{metrics.overdueInvoices}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Financeiro</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Ticket Médio</span>
              <span className="text-sm font-semibold text-gray-900">R$ {metrics.averageTicket.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total de Faturas</span>
              <span className="text-sm font-semibold text-gray-900">{metrics.totalInvoices}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Valor Recebido</span>
              <span className="text-sm font-semibold text-green-600">R$ {metrics.paidAmount.toLocaleString('pt-BR')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">A Receber</span>
              <span className="text-sm font-semibold text-yellow-600">R$ {(metrics.pendingAmount + metrics.overdueAmount).toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Faturas Recentes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Faturas Recentes</h2>
          <button
            onClick={handleCreateInvoice}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Fatura</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {invoices.slice(0, 4).map(invoice => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onView={handleViewInvoice}
              onEdit={handleEditInvoice}
              onDelete={handleDeleteInvoice}
              onSend={handleSendInvoice}
              onDownload={handleDownloadInvoice}
            />
          ))}
        </div>
      </div>
    </div>
  );
  
  const renderInvoicesTab = () => (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar faturas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os status</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="vencido">Vencido</option>
              <option value="cancelado">Cancelado</option>
            </select>
            
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleExportData}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
            <button
              onClick={handleRefreshData}
              disabled={isLoading}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
            <button
              onClick={handleCreateInvoice}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Fatura</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Lista de Faturas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInvoices.map(invoice => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            onView={handleViewInvoice}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            onSend={handleSendInvoice}
            onDownload={handleDownloadInvoice}
          />
        ))}
      </div>
      
      {filteredInvoices.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma fatura encontrada</h3>
          <p className="text-gray-600 mb-6">Tente ajustar os filtros ou criar uma nova fatura.</p>
          <button
            onClick={handleCreateInvoice}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Criar Primeira Fatura
          </button>
        </div>
      )}
    </div>
  );
  
  const renderPaymentMethodsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Métodos de Pagamento</h2>
            <p className="text-gray-600 mt-1">Configure as formas de pagamento aceitas</p>
          </div>
          <button
            onClick={() => toast.info('Funcionalidade em desenvolvimento')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Método</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paymentMethods.map(method => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              onToggle={handleTogglePaymentMethod}
              onEdit={handleEditPaymentMethod}
            />
          ))}
        </div>
      </div>
      
      {/* Configurações Adicionais */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Cobrança</h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prazo padrão de vencimento (dias)
              </label>
              <input
                type="number"
                defaultValue={30}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Juros por atraso (% ao mês)
              </label>
              <input
                type="number"
                step="0.1"
                defaultValue={2.0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Multa por atraso (%)
              </label>
              <input
                type="number"
                step="0.1"
                defaultValue={10.0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desconto para pagamento antecipado (%)
              </label>
              <input
                type="number"
                step="0.1"
                defaultValue={5.0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Cobrança</h1>
          <p className="text-gray-600 mt-1">Gerencie faturas, pagamentos e métodos de cobrança</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={handleRefreshData}
            disabled={isLoading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={handleCreateInvoice}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Fatura</span>
          </button>
        </div>
      </div>

      {/* Modal de Criação/Edição de Fatura */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingInvoice ? 'Editar Fatura' : 'Nova Fatura'}
              </h2>
            </div>
            
            <InvoiceForm
              invoice={editingInvoice}
              onSave={handleSaveInvoice}
              onCancel={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setEditingInvoice(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de Configuração de Método de Pagamento */}
      {showPaymentConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Configurar {editingPaymentMethod?.name}
              </h2>
            </div>
            
            <PaymentMethodForm
              method={editingPaymentMethod}
              onSave={handleSavePaymentMethod}
              onCancel={() => {
                setShowPaymentConfigModal(false);
                setEditingPaymentMethod(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
              { id: 'invoices', label: 'Faturas', icon: FileText },
              { id: 'payment-methods', label: 'Métodos de Pagamento', icon: CreditCard }
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
          {activeTab === 'invoices' && renderInvoicesTab()}
          {activeTab === 'payment-methods' && renderPaymentMethodsTab()}
        </div>
      </div>
    </div>
  );
}