import { useState, useEffect } from 'react';
import { Plus, Wallet, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PrepaidRechargesHistory } from '@/components/PrepaidRechargesHistory';
import { PrepaidRechargeModal } from '@/components/PrepaidRechargeModal';
import { usePrepaidWallet } from '@/hooks/usePrepaidWallet';
import { useSearchParams } from 'react-router-dom';

export default function Recargas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { balance, isLoadingBalance, transactions, isLoadingTransactions, loadBalance, loadTransactions } = usePrepaidWallet();
  const [activeTab, setActiveTab] = useState('historico');
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  // Abrir modal se vier da URL
  useEffect(() => {
    if (searchParams.get('acao') === 'adicionar-saldo') {
      setShowRechargeModal(true);
    }
  }, [searchParams]);

  // Recarregar transações ao trocar para aba de consumo
  useEffect(() => {
    if (activeTab === 'consumo') {
      console.log('🔄 Recarregando transações...');
      loadTransactions();
    }
  }, [activeTab, loadTransactions]);

  // Calcular estatísticas
  const totalCredits = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleAddCredits = () => {
    setShowRechargeModal(true);
  };

  const handleCloseModal = () => {
    setShowRechargeModal(false);
    setSearchParams({}); // Limpar URL
    loadBalance(); // Recarregar saldo
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recargas de Saldo</h1>
          <p className="text-gray-600 mt-1">
            Gerencie suas recargas e acompanhe o consumo do saldo pré-pago
          </p>
        </div>
        <Button
          onClick={handleAddCredits}
          className="mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Saldo
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Saldo Atual */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoadingBalance ? '...' : formatCurrency(balance)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Disponível para uso
            </p>
          </CardContent>
        </Card>

        {/* Total de Créditos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Creditado</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingTransactions ? '...' : formatCurrency(totalCredits)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Soma de todas as recargas
            </p>
          </CardContent>
        </Card>

        {/* Total Consumido */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consumido</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {isLoadingTransactions ? '...' : formatCurrency(totalDebits)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Usado em serviços
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="historico">Histórico de Recargas</TabsTrigger>
          <TabsTrigger value="consumo">Consumo de Saldo</TabsTrigger>
        </TabsList>

        {/* Aba: Histórico de Recargas */}
        <TabsContent value="historico" className="space-y-4">
          <PrepaidRechargesHistory limit={50} />
        </TabsContent>

        {/* Aba: Consumo de Saldo */}
        <TabsContent value="consumo" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Consumo de Saldo</CardTitle>
                  <CardDescription>
                    Histórico de uso do saldo pré-pago em serviços
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('🔄 Recarregando manualmente...');
                    loadTransactions();
                    loadBalance();
                  }}
                  disabled={isLoadingTransactions}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingTransactions ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Carregando...</p>
                </div>
              ) : transactions.filter(t => t.type === 'debit').length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum consumo registrado
                  </h3>
                  <p className="text-gray-600">
                    Você ainda não utilizou seu saldo pré-pago
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions
                    .filter(t => t.type === 'debit')
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="p-2 bg-orange-100 rounded-lg">
                              <TrendingDown className="h-5 w-5 text-orange-600" />
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {transaction.notes || 'Pagamento de serviço'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(transaction.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-orange-600">
                            - {formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-xs text-gray-600">
                            Saldo: {formatCurrency(transaction.balance_after)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Recarga */}
      <PrepaidRechargeModal
        isOpen={showRechargeModal}
        onClose={handleCloseModal}
      />
    </div>
  );
}
