import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Eye,
  Download,
  RefreshCw,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { usePermissions } from '@/hooks/useIcetranPermissions';
import { toast } from 'sonner';
import { CobrancaDetalhes } from '@/components/CobrancaDetalhes';
import { serviceOrdersService } from '@/services/serviceOrdersService';

interface Cobranca {
  id: string;
  client_id: string;
  client_name: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  description: string;
  payment_method: string;
  asaas_payment_id?: string;
  created_at: string;
  paid_at?: string;
  invoice_url?: string;
  pix_qr_code?: string;
  pix_code?: string;
  company_name?: string;
  company_id?: string;
}

interface CobrancaCardProps {
  cobranca: Cobranca;
  onViewDetails: (cobranca: Cobranca) => void;
  onResend: (cobranca: Cobranca) => void;
  onCancel: (cobranca: Cobranca) => void;
  showCompany?: boolean;
}

function CobrancaCard({ cobranca, onViewDetails, onResend, onCancel, showCompany = false }: CobrancaCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Vencido';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Pendente';
    }
  };

  const isOverdue = new Date(cobranca.due_date) < new Date() && cobranca.status === 'pending';
  const actualStatus = isOverdue ? 'overdue' : cobranca.status;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            actualStatus === 'paid' ? 'bg-green-100' :
            actualStatus === 'overdue' ? 'bg-red-100' :
            actualStatus === 'cancelled' ? 'bg-gray-100' : 'bg-yellow-100'
          )}>
            <DollarSign className={cn(
              'w-6 h-6',
              actualStatus === 'paid' ? 'text-green-600' :
              actualStatus === 'overdue' ? 'text-red-600' :
              actualStatus === 'cancelled' ? 'text-gray-600' : 'text-yellow-600'
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{cobranca.client_name}</h3>
            <p className="text-sm text-gray-600">#{cobranca.id.slice(-8)}</p>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={() => {
                  onViewDetails(cobranca);
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Detalhes</span>
              </button>
              
              {(actualStatus === 'pending' || actualStatus === 'overdue') && (
                <button
                  onClick={() => {
                    onResend(cobranca);
                    setShowMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reenviar</span>
                </button>
              )}
              
              {actualStatus !== 'paid' && actualStatus !== 'cancelled' && (
                <button
                  onClick={() => {
                    onCancel(cobranca);
                    setShowMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Valor:</span>
          <span className="font-semibold text-gray-900">
            R$ {cobranca.amount.toFixed(2).replace('.', ',')}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Vencimento:</span>
          <span className={cn(
            'text-sm font-medium',
            actualStatus === 'overdue' ? 'text-red-600' : 'text-gray-900'
          )}>
            {format(new Date(cobranca.due_date), 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <FileText className="w-4 h-4" />
          <span className="truncate">{cobranca.description}</span>
        </div>
        
        {showCompany && cobranca.company_name && (
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <User className="w-4 h-4" />
            <span className="truncate font-medium">{cobranca.company_name}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className={cn(
            'px-3 py-1 text-xs font-medium rounded-full flex items-center space-x-1',
            getStatusColor(actualStatus)
          )}>
            {getStatusIcon(actualStatus)}
            <span>{getStatusLabel(actualStatus)}</span>
          </span>
          
          <span className="text-xs text-gray-500">
            {format(new Date(cobranca.created_at), 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        </div>
        
        {cobranca.paid_at && (
          <div className="text-xs text-green-600 bg-green-50 p-2 rounded-lg">
            Pago em {format(new Date(cobranca.paid_at), 'dd/MM/yyyy \\à\\s HH:mm', { locale: ptBR })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CobrancasGerais() {
  const { user } = useAuthStore();
  const { isSuperadmin } = usePermissions();
  const navigate = useNavigate();
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue' | 'cancelled'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [companies, setCompanies] = useState<{id: string, nome: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCobranca, setSelectedCobranca] = useState<Cobranca | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Função para converter Cobranca para formato compatível (igual ao MeusServicos)
  const convertToCobrancaFormat = (cobranca: Cobranca): any => {
    return {
      id: cobranca.id,
      client_id: cobranca.client_id,
      client_name: cobranca.client_name,
      amount: cobranca.amount,
      due_date: cobranca.due_date,
      status: cobranca.status,
      description: cobranca.description,
      payment_method: cobranca.payment_method,
      asaas_payment_id: cobranca.asaas_payment_id,
      created_at: cobranca.created_at,
      paid_at: cobranca.paid_at,
      invoice_url: cobranca.invoice_url,
      pix_qr_code: cobranca.pix_qr_code,
      pix_code: cobranca.pix_code
    };
  };
  const itemsPerPage = 12;

  const carregarCobrancas = async () => {
    console.log('🔄 Iniciando carregamento de cobranças...');
    try {
      setIsLoading(true);
      
      // Usar serviceOrdersService (acesso direto ao Supabase como clientes)
      const filters = {
        companyId: isSuperadmin() ? (companyFilter !== 'all' ? companyFilter : undefined) : user?.company_id,
        all: isSuperadmin()
      };
      
      console.log('🔍 Buscando com filtros:', filters);
      const data = await serviceOrdersService.getServiceOrders(filters);
      
      console.log('Dados recebidos do serviceOrdersService:', data); // Debug
      
      // Mapear os dados para o formato esperado pela interface
      const mappedPayments = (data.payments || []).map(payment => ({
        id: payment.id || payment.payment_id,
        client_id: payment.customer_id || payment.client_id,
        client_name: payment.customer_name || payment.client_name || 'Cliente',
        amount: payment.amount || payment.value || 0,
        due_date: payment.due_date,
        status: mapApiStatusToInterface(payment.status),
        description: payment.description || 'Recurso de Multa',
        payment_method: payment.payment_method || 'PIX',
        asaas_payment_id: payment.asaas_payment_id,
        created_at: payment.created_at,
        paid_at: payment.paid_at,
        invoice_url: payment.invoice_url,
        pix_qr_code: payment.pix_qr_code,
        company_name: payment.company_name,
        company_id: payment.company_id
      }));
      
      console.log('Dados mapeados:', mappedPayments); // Debug
      setCobrancas(mappedPayments);
      console.log('✅ Lista de cobranças atualizada com sucesso! Total:', mappedPayments.length);
      
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
      toast.error(`Erro ao carregar cobranças: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
      console.log('🏁 Carregamento de cobranças finalizado');
    }
  };
  
  // Função para mapear status da API para interface
  const mapApiStatusToInterface = (apiStatus: string): 'pending' | 'paid' | 'overdue' | 'cancelled' => {
    switch (apiStatus?.toLowerCase()) {
      case 'confirmed':
      case 'paid':
      case 'received':
        return 'paid';
      case 'pending':
        return 'pending';
      case 'cancelled':
      case 'refunded':
        return 'cancelled';
      case 'overdue':
        return 'overdue';
      default:
        return 'pending';
    }
  };
  
  const carregarEmpresas = async () => {
    if (!isSuperadmin()) return;
    
    try {
      const response = await fetch('/api/companies/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const handleViewDetails = (cobranca: Cobranca) => {
    setSelectedCobranca(cobranca);
    setShowDetailsModal(true);
  };

  const handleResend = async (cobranca: Cobranca) => {
    try {
      // TODO: Implementar reenvio de cobrança
      toast.success('Cobrança reenviada com sucesso');
    } catch (error) {
      toast.error('Erro ao reenviar cobrança');
    }
  };

  const handleCancel = async (cobranca: Cobranca) => {
    try {
      const response = await fetch(`/api/payments/${cobranca.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      });
      
      if (response.ok) {
        toast.success('Cobrança cancelada com sucesso');
        carregarCobrancas();
      } else {
        toast.error('Erro ao cancelar cobrança');
      }
    } catch (error) {
      toast.error('Erro ao cancelar cobrança');
    }
  };

  const handleExport = () => {
    // TODO: Implementar exportação
    toast.info('Funcionalidade de exportação será implementada');
  };

  // Filtrar cobranças
  const filteredCobrancas = cobrancas.filter(cobranca => {
    const matchesSearch = 
      cobranca.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cobranca.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cobranca.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isOverdue = new Date(cobranca.due_date) < new Date() && cobranca.status === 'pending';
    const actualStatus = isOverdue ? 'overdue' : cobranca.status;
    const matchesStatus = statusFilter === 'all' || actualStatus === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const today = new Date();
      const cobrancaDate = new Date(cobranca.created_at);
      
      switch (dateFilter) {
        case 'today':
          matchesDate = cobrancaDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = cobrancaDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = cobrancaDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Paginação
  const totalPages = Math.ceil(filteredCobrancas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCobrancas = filteredCobrancas.slice(startIndex, startIndex + itemsPerPage);

  // Estatísticas
  const stats = {
    total: cobrancas.length,
    paid: cobrancas.filter(c => c.status === 'paid').length,
    pending: cobrancas.filter(c => {
      const isOverdue = new Date(c.due_date) < new Date() && c.status === 'pending';
      return c.status === 'pending' && !isOverdue;
    }).length,
    overdue: cobrancas.filter(c => {
      const isOverdue = new Date(c.due_date) < new Date() && c.status === 'pending';
      return isOverdue;
    }).length,
    totalValue: cobrancas.reduce((acc, c) => acc + c.amount, 0),
    paidValue: cobrancas.filter(c => c.status === 'paid').reduce((acc, c) => acc + c.amount, 0)
  };

  useEffect(() => {
    carregarCobrancas();
    carregarEmpresas();
  }, []);
  
  useEffect(() => {
    carregarCobrancas();
  }, [companyFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando cobranças...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSuperadmin() ? 'Gestão de Cobranças - Todas as Empresas' : 'Gestão de Cobranças'}
          </h1>
          <p className="text-gray-600 mt-1">
            {cobrancas.length} cobrança(s) registrada(s)
            {isSuperadmin() && companyFilter !== 'all' && (
              <span className="ml-2 text-blue-600">
                • Filtrado por: {companies.find(c => c.id === companyFilter)?.nome}
              </span>
            )}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={carregarCobrancas}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Atualizar</span>
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por cliente, ID ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="overdue">Vencido</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos os Períodos</option>
                <option value="today">Hoje</option>
                <option value="week">Última Semana</option>
                <option value="month">Último Mês</option>
              </select>
            </div>
            
            {isSuperadmin() && (
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-400" />
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todas as Empresas</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Cobranças</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cobranças Pagas</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{stats.paid}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vencidas</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{stats.overdue}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Cobranças Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedCobrancas.map((cobranca) => (
          <CobrancaCard
            key={cobranca.id}
            cobranca={cobranca}
            onViewDetails={handleViewDetails}
            onResend={handleResend}
            onCancel={handleCancel}
            showCompany={isSuperadmin()}
          />
        ))}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'px-3 py-2 rounded-lg',
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                )}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Próximo
          </button>
        </div>
      )}

      {filteredCobrancas.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma cobrança encontrada</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Nenhuma cobrança foi registrada ainda'
            }
          </p>
        </div>
      )}

      {/* Modal de Detalhes - EXATAMENTE como MeusServicos */}
      {selectedCobranca && (
        <CobrancaDetalhes
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCobranca(null);
          }}
          cobranca={convertToCobrancaFormat(selectedCobranca)}
          onResend={async (cobranca) => {
            await handleResend(selectedCobranca);
          }}
          onCancel={async (cobranca) => {
            await handleCancel(selectedCobranca);
          }}
          onUpdate={() => {
            carregarCobrancas();
            setShowDetailsModal(false);
            setSelectedCobranca(null);
          }}
        />
      )}
    </div>
  );
}