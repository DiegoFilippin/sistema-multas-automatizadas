import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  History,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Wrench,
  RotateCcw,
  ArrowRightLeft,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { PaymentDetailsModal } from './PaymentDetailsModal';

interface CreditTransaction {
  id: string;
  transaction_type: 'purchase' | 'usage' | 'refund' | 'transfer';
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  created_at: string;
  payment_id?: string;
  services?: { name: string };
  payments?: { amount: number; status: string };
}

interface CreditHistoryProps {
  clientId?: string;
  companyId?: string;
  ownerType?: 'client' | 'company';
  refreshTrigger?: number;
}

export function CreditHistory({
  clientId,
  companyId,
  ownerType,
  refreshTrigger = 0
}: CreditHistoryProps) {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CreditTransaction | null>(null);
  const itemsPerPage = 10;

  // Determinar parâmetros baseado no usuário ou props
  const effectiveOwnerType = ownerType || (user?.role === 'Usuario/Cliente' ? 'client' : 'company');
  const effectiveClientId = clientId || user?.id;
  const effectiveCompanyId = companyId || user?.company_id;
  const ownerId = effectiveOwnerType === 'client' ? effectiveClientId : effectiveCompanyId;

  const fetchTransactions = async (showRefreshIndicator = false) => {
    if (!ownerId) return;

    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const params = new URLSearchParams({
        ownerType: effectiveOwnerType,
        [effectiveOwnerType === 'client' ? 'clientId' : 'companyId']: ownerId,
        limit: itemsPerPage.toString(),
        offset: offset.toString()
      });

      const response = await fetch(`/api/credits/transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setTransactions(data.data);
        setTotalPages(Math.ceil(data.pagination.total / itemsPerPage));
      } else {
        toast.error('Erro ao carregar histórico de transações');
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [ownerId, effectiveOwnerType, currentPage, refreshTrigger]);

  const handleRefresh = () => {
    fetchTransactions(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Math.abs(value));
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <ShoppingCart className="h-4 w-4 text-green-600" />;
      case 'usage':
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case 'refund':
        return <RotateCcw className="h-4 w-4 text-orange-600" />;
      case 'transfer':
        return <ArrowRightLeft className="h-4 w-4 text-purple-600" />;
      default:
        return <History className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionBadge = (transaction: CreditTransaction) => {
    const { transaction_type, payments } = transaction;
    const isPending = payments?.status === 'pending';
    
    switch (transaction_type) {
      case 'purchase':
        if (isPending) {
          return <Badge variant="default" className="bg-yellow-100 text-yellow-800 animate-pulse">Pagamento Pendente</Badge>;
        }
        return <Badge variant="default" className="bg-green-100 text-green-800">Compra</Badge>;
      case 'usage':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Uso</Badge>;
      case 'refund':
        return <Badge variant="default" className="bg-orange-100 text-orange-800">Estorno</Badge>;
      case 'transfer':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Transferência</Badge>;
      default:
        return <Badge variant="secondary">Outro</Badge>;
    }
  };

  const getAmountDisplay = (transaction: CreditTransaction) => {
    const isPositive = transaction.amount > 0;
    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        <span className="font-medium">
          {isPositive ? '+' : ''}{formatCurrency(transaction.amount)}
        </span>
      </div>
    );
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.transaction_type === filter;
  });

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleViewDetails = (transaction: CreditTransaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setSelectedTransaction(null);
    setShowDetailsModal(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Transações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Transações
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="purchase">Compras</SelectItem>
                <SelectItem value="usage">Usos</SelectItem>
                <SelectItem value="refund">Estornos</SelectItem>
                <SelectItem value="transfer">Transferências</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Seção de Pagamentos Pendentes */}
        {transactions.some(t => t.transaction_type === 'purchase' && t.payments?.status === 'pending') && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">Pagamentos Pendentes</h3>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              Você tem pagamentos pendentes. Clique em "Pagar Agora" para finalizar suas compras.
            </p>
            <div className="space-y-2">
              {transactions
                .filter(t => t.transaction_type === 'purchase' && t.payments?.status === 'pending')
                .map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(transaction.created_at)} • {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleViewDetails(transaction)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Pagar Agora
                    </Button>
                  </div>
                ))
              }
            </div>
          </div>
        )}
        
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma transação encontrada
            </h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'Ainda não há transações em sua conta.'
                : `Não há transações do tipo "${filter}" para exibir.`
              }
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Saldo Após</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.transaction_type)}
                          {getTransactionBadge(transaction)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {transaction.description || 'Transação'}
                          </p>
                          {transaction.services?.name && (
                            <p className="text-sm text-muted-foreground">
                              Serviço: {transaction.services.name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getAmountDisplay(transaction)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatCurrency(transaction.balance_after)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {transaction.transaction_type === 'purchase' && transaction.payment_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(transaction)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              Ver Detalhes
                            </Button>
                          )}
                          {transaction.transaction_type === 'purchase' && 
                           transaction.payments?.status === 'pending' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleViewDetails(transaction)}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <ShoppingCart className="h-3 w-3" />
                              Pagar Agora
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal de Detalhes do Pagamento */}
        {showDetailsModal && selectedTransaction?.payment_id && (
          <PaymentDetailsModal
            isOpen={showDetailsModal}
            onClose={handleCloseDetails}
            paymentId={selectedTransaction.payment_id}
          />
        )}
      </CardContent>
    </Card>
  );
}