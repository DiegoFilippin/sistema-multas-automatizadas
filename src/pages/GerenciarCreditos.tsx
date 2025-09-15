import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coins, CreditCard, Users, Plus, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { CreditPurchaseModal } from '@/components/CreditPurchaseModal';
import { CreditBalance } from '@/components/CreditBalance';
import { CreditHistory } from '@/components/CreditHistory';

interface ClientCredit {
  id: string;
  nome: string;
  email: string;
  balance: number;
  total_purchased: number;
  total_used: number;
  last_transaction?: string;
  status: 'ativo' | 'inativo';
}

interface CompanyStats {
  balance: number;
  total_purchased: number;
  total_used: number;
  transaction_count: number;
}

export default function GerenciarCreditos() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyStats, setCompanyStats] = useState<CompanyStats | null>(null);
  const [clientCredits, setClientCredits] = useState<ClientCredit[]>([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'history'>('overview');

  // Verificar se o usuário é despachante
  useEffect(() => {
    if (user?.role !== 'Despachante') {
      toast.error('Acesso negado. Apenas despachantes podem gerenciar créditos.');
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  // Carregar dados da empresa
  const fetchCompanyStats = async () => {
    try {
      const response = await fetch(`/api/credits/balance?ownerType=company&ownerId=${user?.company_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setCompanyStats({
          balance: data.data.balance || 0,
          total_purchased: data.data.total_purchased || 0,
          total_used: data.data.total_used || 0,
          transaction_count: data.data.transaction_count || 0
        });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas da empresa:', error);
      toast.error('Erro ao carregar dados da empresa');
    }
  };

  // Carregar créditos dos clientes
  const fetchClientCredits = async () => {
    try {
      const response = await fetch(`/api/credits/clients-balance?companyId=${user?.company_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setClientCredits(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar créditos dos clientes:', error);
      toast.error('Erro ao carregar dados dos clientes');
    }
  };

  // Carregar todos os dados
  const fetchAllData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      await Promise.all([
        fetchCompanyStats(),
        fetchClientCredits()
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.company_id) {
      fetchAllData();
    }
  }, [user?.company_id]);

  // Função para comprar créditos para cliente específico
  const handleBuyForClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setShowClientModal(true);
  };

  // Callback após compra bem-sucedida
  const handlePurchaseComplete = () => {
    fetchAllData(true);
    toast.success('Créditos adicionados com sucesso!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Créditos</h1>
            <p className="text-gray-600">Gerencie créditos da empresa e dos clientes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => setShowCompanyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Comprar Créditos
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'clients'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Clientes
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Histórico
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Estatísticas da Empresa */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Créditos da Empresa
              </h2>
              <button
                onClick={() => setShowCompanyModal(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CreditCard className="h-4 w-4" />
                Comprar Créditos
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Saldo Atual</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {companyStats?.balance?.toFixed(2) || '0.00'}
                </p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Total Comprado</span>
                </div>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {companyStats?.total_purchased?.toFixed(2) || '0.00'}
                </p>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">Total Usado</span>
                </div>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {companyStats?.total_used?.toFixed(2) || '0.00'}
                </p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Transações</span>
                </div>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {companyStats?.transaction_count || 0}
                </p>
              </div>
            </div>
            
            {companyStats && companyStats.balance <= 10 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    <strong>Saldo baixo!</strong> Considere comprar mais créditos para garantir a continuidade dos serviços.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Resumo dos Clientes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Resumo dos Clientes
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{clientCredits.length}</p>
                <p className="text-sm text-gray-600">Total de Clientes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {clientCredits.filter(c => c.balance > 0).length}
                </p>
                <p className="text-sm text-gray-600">Com Saldo</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {clientCredits.filter(c => c.balance <= 0).length}
                </p>
                <p className="text-sm text-gray-600">Sem Saldo</p>
              </div>
            </div>
            
            <button
              onClick={() => setActiveTab('clients')}
              className="w-full py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Ver Detalhes dos Clientes
            </button>
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Créditos dos Clientes
            </h2>
          </div>
          
          <div className="p-6">
            {clientCredits.length > 0 ? (
              <div className="space-y-4">
                {clientCredits.map((client) => (
                  <div key={client.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-medium text-gray-900">{client.nome}</h3>
                            <p className="text-sm text-gray-600">{client.email}</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            client.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {client.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-gray-600">Saldo Atual</p>
                            <p className={`font-semibold ${
                              client.balance > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {client.balance.toFixed(2)} créditos
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total Comprado</p>
                            <p className="font-semibold text-gray-900">
                              {client.total_purchased.toFixed(2)} créditos
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total Usado</p>
                            <p className="font-semibold text-gray-900">
                              {client.total_used.toFixed(2)} créditos
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/clientes/${client.id}`)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        >
                          Ver Detalhes
                        </button>
                        <button
                          onClick={() => handleBuyForClient(client.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Comprar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum cliente encontrado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Histórico de Transações</h2>
          </div>
          <div className="p-6">
            <CreditHistory 
              ownerType="company" 
              companyId={user?.company_id || ''}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <CreditPurchaseModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        companyId={user?.company_id}
        targetType="company"
        onPurchaseComplete={handlePurchaseComplete}
      />

      <CreditPurchaseModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setSelectedClientId(null);
        }}
        clientId={selectedClientId || undefined}
        targetType="client"
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  );
}