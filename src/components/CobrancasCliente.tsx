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
      
      // Verificar se a resposta tem conteúdo antes de tentar fazer o parse
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      
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