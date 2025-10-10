import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface CreditStats {
  currentBalance: number;
  totalPurchased: number;
  totalUsed: number;
  transactionCount: number;
}

interface CreditBalanceProps {
  clientId?: string;
  companyId?: string;
  onPurchaseClick?: () => void;
  showPurchaseButton?: boolean;
  refreshTrigger?: number;
}

export function CreditBalance({
  clientId,
  companyId,
  onPurchaseClick,
  showPurchaseButton = true,
  refreshTrigger = 0
}: CreditBalanceProps) {
  const { user } = useAuthStore();
  const [clientStats, setClientStats] = useState<CreditStats | null>(null);
  const [companyStats, setCompanyStats] = useState<CreditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Usar IDs do usuário logado se não fornecidos
  const effectiveClientId = clientId || user?.id;
  const effectiveCompanyId = companyId || user?.company_id;

  const fetchCreditStats = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const promises = [];

      // Buscar créditos do cliente se disponível
      if (effectiveClientId) {
        promises.push(
          fetch(`/api/credits/balance?ownerType=client&clientId=${effectiveClientId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }).then(res => res.json())
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      // Buscar créditos da empresa se disponível
      if (effectiveCompanyId) {
        promises.push(
          fetch(`/api/credits/balance?ownerType=company&companyId=${effectiveCompanyId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }).then(res => res.json())
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      const [clientResponse, companyResponse] = await Promise.all(promises);

      if (clientResponse?.success) {
        setClientStats(clientResponse.data);
      }

      if (companyResponse?.success) {
        setCompanyStats(companyResponse.data);
      }
    } catch (error) {
      console.error('Erro ao buscar saldo de créditos:', error);
      toast.error('Erro ao carregar saldo de créditos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCreditStats();
  }, [effectiveClientId, effectiveCompanyId, refreshTrigger]);

  const handleRefresh = () => {
    fetchCreditStats(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getBalanceColor = (balance: number) => {
    if (balance >= 50) return 'text-green-600';
    if (balance >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBalanceStatus = (balance: number) => {
    if (balance >= 50) return { text: 'Saldo Alto', variant: 'default' as const };
    if (balance >= 20) return { text: 'Saldo Médio', variant: 'secondary' as const };
    return { text: 'Saldo Baixo', variant: 'destructive' as const };
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </CardHeader>
          <CardContent className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </CardHeader>
          <CardContent className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Saldo de Créditos
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {showPurchaseButton && onPurchaseClick && (
            <Button size="sm" onClick={onPurchaseClick}>
              <Plus className="h-4 w-4 mr-2" />
              Comprar Créditos
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Créditos do Cliente */}
        {effectiveClientId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Créditos do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${getBalanceColor(clientStats?.currentBalance || 0)}`}>
                    {formatCurrency(clientStats?.currentBalance || 0)}
                  </span>
                  <Badge variant={getBalanceStatus(clientStats?.currentBalance || 0).variant}>
                    {getBalanceStatus(clientStats?.currentBalance || 0).text}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-muted-foreground">Comprado</p>
                      <p className="font-medium">{formatCurrency(clientStats?.totalPurchased || 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-muted-foreground">Usado</p>
                      <p className="font-medium">{formatCurrency(clientStats?.totalUsed || 0)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {clientStats?.transactionCount || 0} transações realizadas
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Créditos da Empresa */}
        {effectiveCompanyId && user?.role !== 'Usuario/Cliente' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Créditos da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${getBalanceColor(companyStats?.currentBalance || 0)}`}>
                    {formatCurrency(companyStats?.currentBalance || 0)}
                  </span>
                  <Badge variant={getBalanceStatus(companyStats?.currentBalance || 0).variant}>
                    {getBalanceStatus(companyStats?.currentBalance || 0).text}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-muted-foreground">Comprado</p>
                      <p className="font-medium">{formatCurrency(companyStats?.totalPurchased || 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-muted-foreground">Usado</p>
                      <p className="font-medium">{formatCurrency(companyStats?.totalUsed || 0)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {companyStats?.transactionCount || 0} transações realizadas
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Saldo Total Disponível */}
      {clientStats && companyStats && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Saldo Total Disponível</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency((clientStats.currentBalance || 0) + (companyStats.currentBalance || 0))}
                </p>
              </div>
              <div className="text-blue-600">
                <Wallet className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}