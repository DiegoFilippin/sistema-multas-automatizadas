import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, DollarSign, Eye, RefreshCw, X, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CobrancaDetalhes } from './CobrancaDetalhes';

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
  bank_slip_url?: string;
  credit_card_brand?: string;
  credit_card_last_digits?: string;
  installments?: number;
  discount_amount?: number;
  interest_amount?: number;
  fine_amount?: number;
  net_value?: number;
  asaas_fee?: number;
}

interface CobrancasClienteProps {
  clientId: string;
  onViewDetails?: (cobranca: Cobranca) => void;
}

export function CobrancasCliente({ clientId, onViewDetails }: CobrancasClienteProps) {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCobranca, setSelectedCobranca] = useState<Cobranca | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });

  const fetchCobrancas = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await fetch(`/api/payments/client/${clientId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setCobrancas(data.payments || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        toast.error(data.error || 'Erro ao carregar cobranças');
      }
    } catch (error) {
      console.error('Erro ao buscar cobranças:', error);
      toast.error('Erro ao carregar cobranças do cliente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCobrancas();
  }, [clientId, page, filters]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'refunded':
        return 'bg-red-100 text-red-800';
      case 'expired':
      case 'overdue':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'received':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
      case 'refunded':
      case 'expired':
      case 'overdue':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendente',
      'confirmed': 'Confirmado',
      'received': 'Recebido',
      'cancelled': 'Cancelado',
      'expired': 'Vencido',
      'overdue': 'Vencido',
      'refunded': 'Reembolsado'
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({ status: '', startDate: '', endDate: '' });
    setPage(1);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Cobranças ({cobrancas.length})
          </h2>
          <button
            onClick={fetchCobrancas}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmado</option>
              <option value="cancelled">Cancelado</option>
              <option value="expired">Vencido</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <X className="h-4 w-4 inline mr-1" />
              Limpar
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Carregando cobranças...</span>
          </div>
        ) : cobrancas.length > 0 ? (
          <>
            <div className="space-y-4">
              {cobrancas.map((cobranca) => (
                <div key={cobranca.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{cobranca.description}</h3>
                        <p className="text-sm text-gray-600">
                          {cobranca.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">
                        R$ {cobranca.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(cobranca.status)}`}>
                        {getStatusIcon(cobranca.status)}
                        {getStatusLabel(cobranca.status)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <p><span className="font-medium">Método:</span> {cobranca.payment_method || 'PIX'}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Vencimento:</span> {format(new Date(cobranca.due_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Criado em:</span> {format(new Date(cobranca.created_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedCobranca(cobranca);
                          setShowDetailsModal(true);
                          if (onViewDetails) {
                            onViewDetails(cobranca);
                          }
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        Ver detalhes
                      </button>
                    </div>
                  </div>
                  
                  {cobranca.paid_at && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-green-600">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Pago em {format(new Date(cobranca.paid_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Página {page} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhuma cobrança encontrada para este cliente</p>
            <p className="text-sm mt-2">As cobranças aparecerão aqui quando forem criadas</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      <CobrancaDetalhes
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedCobranca(null);
        }}
        cobranca={selectedCobranca}
        onResend={() => {}}
        onCancel={() => {}}
      />
    </div>
  );
}