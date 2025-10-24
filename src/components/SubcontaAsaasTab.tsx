import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Wallet,
  BarChart3,
  ArrowDownLeft,
  RefreshCw,
  Key,
  Shield,
  TestTube,
  Info,
  User,
  Plus,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';
import { subaccountService, SubaccountDetails, SubaccountStats, SubaccountTransaction, ApiKeyTestResult, type AsaasSubaccount } from '../services/subaccountService';

import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { CreateSubaccountModal } from '@/components/CreateSubaccountModal';
import { ManualSubaccountConfigModal } from '@/components/ManualSubaccountConfigModal';

interface CompanyData {
  id: string;
  nome: string;
  email: string;
  cnpj: string;
  telefone?: string;
  endereco?: string;
  asaas_customer_id?: string;
  company_level: string;
}

interface SubcontaAsaasTabProps {
  companyId: string;
}

interface PaymentItem {
  id: string;
  customer?: { name?: string; email?: string };
  value: number;
  status: string;
  dateCreated: string;
}

export default function SubcontaAsaasTab({ companyId }: SubcontaAsaasTabProps) {
  const [details, setDetails] = useState<SubaccountDetails | null>(null);
  const [stats, setStats] = useState<SubaccountStats | null>(null);
  const [transactions, setTransactions] = useState<SubaccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiKeyTest, setApiKeyTest] = useState<ApiKeyTestResult | null>(null);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManualConfigModal, setShowManualConfigModal] = useState(false);
  const [selectedSubaccount, setSelectedSubaccount] = useState<AsaasSubaccount | null>(null);
  const [baseSubaccount, setBaseSubaccount] = useState<AsaasSubaccount | null>(null);
  const [showWallet, setShowWallet] = useState(false);
  const maskWalletId = (id?: string, reveal?: boolean) => {
    if (!id) return '';
    if (reveal) return id;
    const prefix = id.slice(0, 6);
    const suffix = id.slice(-6);
    return `${prefix}•••${suffix}`;
  };

  useEffect(() => {
    loadSubaccountData();
    loadCompanyData();
  }, [companyId]);

  const loadCompanyData = async () => {
    try {
      setLoadingCompany(true);
      
      // Buscar dados da empresa diretamente
      const { data: company, error } = await supabase
        .from('companies')
        .select(`
          id,
          nome,
          email,
          cnpj,
          telefone,
          endereco,
          asaas_customer_id,
          company_level
        `)
        .eq('id', companyId)
        .single();
      
      if (error || !company) {
        console.error('Erro ao buscar dados da empresa:', error);
        setCompanyData(null);
      } else {
        setCompanyData({
          id: company.id,
          nome: company.nome,
          email: company.email,
          cnpj: company.cnpj,
          telefone: company.telefone,
          endereco: company.endereco,
          asaas_customer_id: company.asaas_customer_id,
          company_level: company.company_level
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
      setCompanyData(null);
    } finally {
      setLoadingCompany(false);
    }
  };

  const loadSubaccountData = async () => {
    try {
      setLoading(true);
      // Carregar dados em paralelo, incluindo subconta base (mesmo sem API key)
      const [baseData, detailsData, statsData, transactionsData] = await Promise.all([
        subaccountService.getSubaccountByCompany(companyId),
        subaccountService.getSubaccountDetails(companyId),
        subaccountService.getSubaccountStats(companyId),
        subaccountService.getSubaccountTransactions(companyId, 10, 0)
      ]);

      setBaseSubaccount(baseData);
      setDetails(detailsData);
      setStats(statsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Erro ao carregar dados da subconta:', error);
      toast.error('Erro ao carregar dados da subconta Asaas');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubaccountData();
    setRefreshing(false);
    toast.success('Dados atualizados com sucesso!');
  };

  const handleTestApiKey = async () => {
    if (!companyId) return;
    
    setTestingApiKey(true);
    try {
      const result = await subaccountService.testSubaccountApiKey(companyId);
      setApiKeyTest(result);
      
      if (result.isValid) {
        toast.success('API Key está funcionando corretamente!');
      } else {
        toast.error(`Erro na API Key: ${result.message}`);
      }
    } catch {
      toast.error('Erro ao testar API Key');
    } finally {
      setTestingApiKey(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!companyData || !companyData.id) {
      toast.error('Dados da empresa não encontrados');
      return;
    }

    setCreatingCustomer(true);
    try {
      const response = await fetch('/api/companies/create-asaas-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId: companyData.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar customer');
      }

      // Atualizar o estado local da empresa
      setCompanyData({
        ...companyData,
        asaas_customer_id: result.customerId
      });
      
      toast.success('Customer da empresa criado com sucesso no Asaas!');
    } catch (error) {
      console.error('Erro ao criar customer:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar customer');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Ações para modais
  const openCreateSubaccountModal = () => {
    if (!companyData) {
      toast.error('Carregue os dados da empresa antes de criar a subconta');
      return;
    }
    setShowCreateModal(true);
  };

  const openManualConfigModal = async () => {
    try {
      if (!companyData) {
        toast.error('Carregue os dados da empresa antes de editar credenciais');
        return;
      }

      // Aproveitar subconta base já carregada se existir
      if (baseSubaccount) {
        setSelectedSubaccount(baseSubaccount);
        setShowManualConfigModal(true);
        return;
      }

      const existing = await subaccountService.getSubaccountByCompany(companyId);
      if (existing) {
        setSelectedSubaccount(existing);
        setShowManualConfigModal(true);
        return;
      }

      // Criar registro mínimo para permitir configuração manual
      const suffix = Date.now().toString(36);
      const placeholder = `manual_${companyId.slice(0, 8)}_${suffix}`;
      const accountType: 'subadquirente' | 'despachante' = 'despachante';

      const { data: created, error } = await supabase
        .from('asaas_subaccounts')
        .insert({
          company_id: companyId,
          asaas_account_id: placeholder,
          wallet_id: '',
          account_type: accountType,
          status: 'inactive',
          account_origin: 'external',
          is_manual_config: true
        })
        .select()
        .single();

      if (error || !created) {
        toast.error('Falha ao criar registro para configuração manual');
        return;
      }

      toast.success('Registro criado. Informe o Wallet ID e a API Key.');
      setSelectedSubaccount(created as AsaasSubaccount);
      setShowManualConfigModal(true);
    } catch (err) {
      console.error('Erro ao preparar edição manual:', err);
      toast.error('Erro ao preparar edição manual');
    }
  };


  const getApiKeyStatusColor = () => {
    if (!apiKeyTest) return 'text-gray-500 bg-gray-100';
    
    switch (apiKeyTest.status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'unauthorized':
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'network_error':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  const getApiKeyStatusIcon = () => {
    if (!apiKeyTest) return <Key className="w-4 h-4" />;
    
    switch (apiKeyTest.status) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'unauthorized':
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'network_error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Key className="w-4 h-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'RECEIVED':
        return 'text-green-600 bg-green-100';
      case 'PENDING':
      case 'CONFIRMED':
        return 'text-yellow-600 bg-yellow-100';
      case 'INACTIVE':
      case 'SUSPENDED':
      case 'OVERDUE':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'RECEIVED':
        return <CheckCircle className="w-4 h-4" />;
      case 'PENDING':
      case 'CONFIRMED':
        return <Clock className="w-4 h-4" />;
      case 'INACTIVE':
      case 'SUSPENDED':
      case 'OVERDUE':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!details) {
    // Quando não há detalhes (API key ausente), mas existe registro de subconta, mostrar informações básicas
    if (baseSubaccount) {
      return (
        <div className="space-y-6">
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Subconta sem API Key</h3>
            <p className="text-gray-500 mb-6">
              Esta empresa possui uma subconta cadastrada, mas ainda não há API Key ativa para carregar os detalhes.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={openManualConfigModal}
                className="inline-flex items-center px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar Wallet ID
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Informações da Subconta</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Asaas</label>
                <p className="text-gray-900 font-mono text-sm">{baseSubaccount.asaas_account_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wallet ID</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-1 rounded border">
                    {maskWalletId(
                       (baseSubaccount.manual_wallet_id || baseSubaccount.wallet_id) || '',
                       showWallet
                     )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowWallet((v) => !v)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    aria-label={showWallet ? 'Ocultar Wallet ID' : 'Mostrar Wallet ID'}
                    title="Clique para ver o Wallet ID completo"
                  >
                    {showWallet ? (
                      <EyeOff className="w-4 h-4 text-gray-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conta</label>
                <p className="text-gray-900 capitalize">{baseSubaccount.account_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(baseSubaccount.status)}`}>
                  {getStatusIcon(baseSubaccount.status)}
                  <span className="ml-2">{baseSubaccount.status}</span>
                </div>
              </div>
              {baseSubaccount.is_manual_config && (
                <div className="md:col-span-2 lg:col-span-3">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-blue-600 bg-blue-100">
                    <Shield className="w-4 h-4 mr-2" />
                    Configuração Manual Ativa
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modais */}
          <ManualSubaccountConfigModal
            isOpen={showManualConfigModal}
            onClose={() => setShowManualConfigModal(false)}
            subaccount={selectedSubaccount}
            onSuccess={() => {
              setShowManualConfigModal(false);
              loadSubaccountData();
            }}
          />
        </div>
      );
    }

    // Sem subconta alguma
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Subconta não encontrada</h3>
          <p className="text-gray-500 mb-6">
            Esta empresa ainda não possui uma subconta Asaas configurada.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={openCreateSubaccountModal}
              className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Subconta
            </button>
            <button
              onClick={openManualConfigModal}
              className="inline-flex items-center px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar Wallet ID
            </button>
          </div>
        </div>

        {/* Modais */}
        <CreateSubaccountModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          company={companyData ? { id: companyData.id, nome: companyData.nome, cnpj: companyData.cnpj, email: companyData.email, telefone: companyData.telefone, endereco: companyData.endereco } : null}
          onSuccess={() => {
            setShowCreateModal(false);
            loadSubaccountData();
          }}
        />

        <ManualSubaccountConfigModal
          isOpen={showManualConfigModal}
          onClose={() => setShowManualConfigModal(false)}
          subaccount={selectedSubaccount}
          onSuccess={() => {
            setShowManualConfigModal(false);
            loadSubaccountData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Subconta Asaas</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Informações do Customer da Empresa */}
      {loadingCompany ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Carregando informações da empresa...</span>
          </div>
        </div>
      ) : companyData ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              Informações do Customer da Empresa
            </h3>
            {companyData.asaas_customer_id ? (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-green-600 bg-green-100">
                <CheckCircle className="w-4 h-4 mr-2" />
                Customer Ativo
              </div>
            ) : (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-yellow-600 bg-yellow-100">
                <AlertCircle className="w-4 h-4 mr-2" />
                Customer Não Criado
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
              <p className="text-gray-900 font-medium">{companyData.nome}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900">{companyData.email}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <p className="text-gray-900 font-mono">{companyData.cnpj}</p>
            </div>
            
            {companyData.telefone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <p className="text-gray-900">{companyData.telefone}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <p className="text-gray-900 capitalize">{companyData.company_level}</p>
            </div>
            
            {companyData.asaas_customer_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID Asaas</label>
                <p className="text-gray-900 font-mono text-sm bg-white px-3 py-2 rounded border">
                  {companyData.asaas_customer_id}
                </p>
              </div>
            )}
          </div>
          
          {!companyData.asaas_customer_id && (
            <div className="bg-white border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">
                    Customer da empresa não encontrado
                  </h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    Para poder comprar créditos e utilizar os serviços de cobrança, é necessário criar um customer no Asaas para esta empresa despachante.
                  </p>
                  <button
                    onClick={handleCreateCustomer}
                    disabled={creatingCustomer}
                    className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Plus className={`w-4 h-4 mr-2 ${creatingCustomer ? 'animate-spin' : ''}`} />
                    {creatingCustomer ? 'Criando Customer...' : 'Criar Customer da Empresa'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-red-50 to-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-900">Empresa não encontrada</h3>
              <p className="text-sm text-red-700 mt-1">
                Não foi possível carregar os dados desta empresa. Entre em contato com o administrador.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Informações da Conta */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Informações da Conta</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status da Conta</label>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              getStatusColor(details.accountInfo.accountStatus || details.subaccount.status)
            }`}>
              {getStatusIcon(details.accountInfo.accountStatus || details.subaccount.status)}
              <span className="ml-2">
                {details.accountInfo.accountStatus || details.subaccount.status}
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wallet ID</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-1 rounded border">
                {maskWalletId(
                  (details.subaccount.manual_wallet_id || details.subaccount.wallet_id) || '',
                  showWallet
                )}
              </span>
              <button
                type="button"
                onClick={() => setShowWallet((v) => !v)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label={showWallet ? 'Ocultar Wallet ID' : 'Mostrar Wallet ID'}
                title="Clique para ver o Wallet ID completo"
              >
                {showWallet ? (
                  <EyeOff className="w-4 h-4 text-gray-600" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conta</label>
            <p className="text-gray-900 capitalize">{details.subaccount.account_type}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <p className="text-gray-900">{details.accountInfo.name}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{details.accountInfo.email}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
            <p className="text-gray-900">{details.accountInfo.cpfCnpj}</p>
          </div>
        </div>
        
        {/* Seção da API Key */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              API Key da Subconta
            </h4>
            <button
              onClick={handleTestApiKey}
              disabled={testingApiKey}
              className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <TestTube className={`w-4 h-4 mr-2 ${testingApiKey ? 'animate-spin' : ''}`} />
              {testingApiKey ? 'Testando...' : 'Testar API Key'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                API Key
                <div className="group relative ml-2">
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    API Key mascarada por segurança. Use o botão 'Testar' para verificar se está funcionando.
                  </div>
                </div>
              </label>
              <div className="flex items-center space-x-2">
                <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded border flex-1">
                  {details.subaccount.api_key ? subaccountService.maskApiKey(details.subaccount.api_key) : 'Não disponível'}
                </p>
                {apiKeyTest && (
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getApiKeyStatusColor()}`}>
                    {getApiKeyStatusIcon()}
                  </div>
                )}
              </div>
            </div>
            
            {apiKeyTest && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status da Verificação</label>
                <div className="space-y-2">
                  <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${getApiKeyStatusColor()}`}>
                    {getApiKeyStatusIcon()}
                    <span className="ml-2">{apiKeyTest.message}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Testado em: {new Date(apiKeyTest.testedAt).toLocaleString('pt-BR')}
                    {apiKeyTest.responseTime && (
                      <span className="ml-2">({apiKeyTest.responseTime}ms)</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Saldo Atual */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Saldo Atual</p>
              <p className="text-2xl font-bold">{formatCurrency(details.balance)}</p>
            </div>
            <Wallet className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        {/* Total de Cobranças */}
        {stats && (
          <>
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Cobranças</p>
                  <p className="text-2xl font-bold">{stats.totalPayments}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-200" />
              </div>
            </div>

            {/* Valor Recebido */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Recebido (mês)</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalReceived)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-200" />
              </div>
            </div>

            {/* Taxa de Conversão */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Taxa Conversão</p>
                  <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-200" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Estatísticas Detalhadas */}
      {stats && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas do Mês</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-900">{stats.paidPayments}</p>
              <p className="text-sm text-green-600">Cobranças Pagas</p>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-900">{stats.pendingPayments}</p>
              <p className="text-sm text-yellow-600">Cobranças Pendentes</p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.totalPending)}</p>
              <p className="text-sm text-blue-600">Valor Pendente</p>
            </div>
          </div>
        </div>
      )}

      {/* Cobranças Recentes */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cobranças Recentes</h3>
        
        {details.recentPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {details.recentPayments.slice(0, 5).map((payment: PaymentItem) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.customer?.name || 'Cliente não informado'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.customer?.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payment.value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStatusColor(payment.status)
                      }`}>
                        {getStatusIcon(payment.status)}
                        <span className="ml-1">{payment.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.dateCreated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma cobrança encontrada</p>
          </div>
        )}
      </div>

      {/* Splits Recebidos */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Splits Recebidos</h3>
        
        {transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-medium text-green-600">{formatCurrency(transaction.amount)}</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    getStatusColor(transaction.status)
                  }`}>
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ArrowDownLeft className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum split recebido</p>
          </div>
        )}
      </div>
    </div>
  );
}