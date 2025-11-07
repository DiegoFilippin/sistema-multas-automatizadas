import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, DollarSign, Calculator, Save, CheckCircle, Plus, FileText, QrCode, Copy, Eye, ExternalLink, RefreshCw, Clock, UserPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { serviceOrdersService } from '@/services/serviceOrdersService';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { CobrancaDetalhes } from '@/components/CobrancaDetalhes';
import { splitService } from '@/services/splitService';
import { logger } from '@/utils/logger';
import { ClienteModal } from '@/components/ClienteModal';

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
}

interface SplitConfiguration {
  id: string;
  service_id: string;
  acsm_type: 'percentage' | 'fixed';
  acsm_value: number;
  acsm_minimum?: number;
  icetran_type: 'percentage' | 'fixed';
  icetran_value: number;
  icetran_minimum?: number;
}

interface DespachanteServicePricing {
  id?: string;
  service_id: string;
  despachante_id: string;
  client_price: number;
  created_at?: string;
  updated_at?: string;
}

interface ServiceWithPricing extends Service {
  split_configuration: SplitConfiguration;
  despachante_pricing?: DespachanteServicePricing;
  base_cost: number;
  profit: number;
}

interface Client {
  id: string;
  nome: string;
  cpf_cnpj: string;
  cpf?: string; // Adicionar campo cpf separado
  email?: string;
  telefone?: string;
  asaas_customer_id?: string; // Adicionar campo asaas_customer_id
}

interface MultaType {
  id: string;
  type: string;
  name: string;
  description: string;
  suggested_price: number;
  total_price: number; // Custo total (equivale ao cost_price)
  acsm_value: number;
  icetran_value: number;
  fixed_value: number;
  taxa_cobranca: number;
  active: boolean;
  severity?: string; // Propriedade opcional para severidade
}

interface PaymentResponse {
  success: boolean;
  service_order_id?: string;
  payment_id?: string;
  payment_url?: string;
  qr_code?: string;
  pix_copy_paste?: string;
  amount?: number;
  client_name?: string;
  multa_type?: string;
  status?: string;
  created_at?: string;
  paid_at?: string;
  due_date?: string;
  customer_id?: string;
  customer_name?: string;
  description?: string;
  payment_method?: string;
  asaas_payment_id?: string;
  invoice_url?: string;
  pix_qr_code?: string;
  error?: string;
  webhook_data?: {
    customer?: {
      name?: string;
      cpf_cnpj?: string;
      endereco?: string;
      email?: string;
      telefone?: string;
    };
  };
  processed_data?: {
    customer_name?: string;
    customer_cpf?: string;
    customer_endereco?: string;
  };
  // Novos campos da API
  payment?: {
    id?: string;
    webhook_id?: string;
    amount?: number;
    qr_code?: string;
    pix_code?: string;
    description?: string;
    due_date?: string;
    webhook_response?: {
      payment_url?: string;
      [key: string]: any;
    };
  };
}

const MeusServicos: React.FC = () => {
  const log = logger.scope('pages/meus-servicos');
  log.debug('Componente MeusServicos renderizado');
  
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceWithPricing[]>([]);
  const [loading, setLoading] = useState(true);
  
  log.debug('Contexto inicial', { userId: user?.id, companyId: user?.company_id });
  
  // Estados para criação de cobranças
  const [clients, setClients] = useState<Client[]>([]);
  const [multaTypes, setMultaTypes] = useState<MultaType[]>([]);
  const [loadingMultaTypes, setLoadingMultaTypes] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientQuery, setClientQuery] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  const [selectedMultaType, setSelectedMultaType] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Estados para sistema de splits dinâmicos
  const [custoMinimo, setCustoMinimo] = useState<number>(0);
  const [margemDespachante, setMargemDespachante] = useState<number>(0);
  const [serviceSplitConfig, setServiceSplitConfig] = useState<{
    acsm_value: number;
    icetran_value: number;
    taxa_cobranca: number;
  } | null>(null);
  
  // Estados para listagem de cobranças
  const [cobrancas, setCobrancas] = useState<PaymentResponse[]>([]);
  const [loadingCobrancas, setLoadingCobrancas] = useState(false);
  const [syncingWithAsaas, setSyncingWithAsaas] = useState(false);
  const [activeTab, setActiveTab] = useState('criar');
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  
  // Estado para modal de novo cliente
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  
  // Função para salvar novo cliente
  const handleSalvarNovoCliente = async (novoCliente: any) => {
    try {
      if (!user?.company_id) {
        toast.error('Empresa do usuário não encontrada. Faça login novamente.');
        return;
      }

      const clienteData = {
        nome: novoCliente.nome || '',
        cpf_cnpj: novoCliente.cpf || novoCliente.cpf_cnpj || '',
        email: novoCliente.email || novoCliente.emails?.[0]?.endereco || null,
        telefone: novoCliente.telefone || novoCliente.telefones?.[0]?.numero || null,
        company_id: user.company_id,
        status: 'ativo',
        endereco: novoCliente.endereco || novoCliente.enderecos?.[0]?.logradouro || null,
        cidade: novoCliente.cidade || novoCliente.enderecos?.[0]?.cidade || null,
        estado: novoCliente.estado || novoCliente.enderecos?.[0]?.estado || null,
        cep: novoCliente.cep || novoCliente.enderecos?.[0]?.cep || null
      };

      // Inserir cliente no banco de dados
      const { data, error } = await supabase
        .from('clients')
        .insert(clienteData)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      // Adicionar o novo cliente à lista de clientes
      if (data) {
        setClients([...clients, data]);
        toast.success('Cliente cadastrado com sucesso!');
        setShowNovoClienteModal(false);
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast.error('Erro ao cadastrar cliente. Tente novamente.');
    }
  };
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    log.debug('useEffect principal executado', { hasUser: !!user, companyId: user?.company_id });
    
    if (user) {
      log.debug('Usuário encontrado, carregando dados');
      loadServices();
      loadClients();
      loadMultaTypes();
      loadCobrancas();
      loadServiceSplitConfig();
      testBackendConnection();
    } else {
      log.warn('Usuário não encontrado, não carregando dados');
    }
  }, [user]);

  // Função para forçar refresh dos serviços
  const refreshServices = async () => {
    console.log('🔄 === REFRESH MANUAL DOS SERVIÇOS ===');
    console.log('Serviços antes do refresh:', services.length);
    await loadServices(true); // forceRefresh = true
    console.log('Serviços após refresh:', services.length);
  };

  // Carregar automaticamente (sem auto-refresh)
  useEffect(() => {
    if (user?.company_id) {
      loadCobrancas();
    }
  }, [user?.company_id]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, nome, cpf_cnpj, email, telefone, asaas_customer_id')
        .eq('company_id', user?.company_id)
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  // Função para carregar configuração de splits do serviço
  const loadServiceSplitConfig = async () => {
    try {
      console.log('🔄 Carregando configuração de splits do serviço...');
      
      // Buscar qualquer serviço ativo de trânsito para obter configuração de splits
      const { data: services, error } = await supabase
        .from('services')
        .select('acsm_value, icetran_value, taxa_cobranca, name')
        .eq('category', 'Trânsito')
        .eq('is_active', true)
        .not('acsm_value', 'is', null)
        .not('icetran_value', 'is', null)
        .limit(1);
      
      if (error || !services || services.length === 0) {
        log.warn('Configuração de splits não encontrada, usando valores padrão');
        const defaultConfig = {
          acsm_value: 6.00,
          icetran_value: 6.00,
          taxa_cobranca: 3.50
        };
        setServiceSplitConfig(defaultConfig);
        const custo = defaultConfig.acsm_value + defaultConfig.icetran_value + defaultConfig.taxa_cobranca;
        setCustoMinimo(custo);
        return;
      }
      
      const service = services[0];
      console.log('✅ Configuração de splits carregada do serviço:', service.name, service);
      
      const splitConfig = {
        acsm_value: service.acsm_value || 6.00,
        icetran_value: service.icetran_value || 6.00,
        taxa_cobranca: service.taxa_cobranca || 3.50
      };
      
      setServiceSplitConfig(splitConfig);
      
      const custo = splitConfig.acsm_value + splitConfig.icetran_value + splitConfig.taxa_cobranca;
      setCustoMinimo(custo);
      
      log.debug('Configuração de splits aplicada', {
        acsm_value: splitConfig.acsm_value,
        icetran_value: splitConfig.icetran_value,
        taxa_cobranca: splitConfig.taxa_cobranca,
        custoMinimo: custo
      });
      
      // Ajustar valor customizado se for menor que o custo mínimo
      if (customAmount > 0 && customAmount < custo) {
        setCustomAmount(custo);
      }
      
    } catch (error) {
      log.error('Erro ao carregar configuração de splits', error);
    }
  };

  // Calcular margem em tempo real
  useEffect(() => {
    if (custoMinimo > 0 && customAmount > 0) {
      const margem = Math.max(0, customAmount - custoMinimo);
      setMargemDespachante(margem);
      log.debug('Cálculo de margem', {
        valorCobranca: customAmount,
        custoMinimo,
        margemDespachante: margem
      });
    }
  }, [customAmount, custoMinimo]);

  const loadCobrancas = async (forceRefresh = false) => {
    log.debug('Iniciando loadCobrancas', { forceRefresh, loadingCobrancas, companyId: user?.company_id });
    
    if (loadingCobrancas && !forceRefresh) {
      log.debug('Já está carregando, pulando');
      return;
    }
    
    if (!user?.company_id) {
      log.warn('Company ID não disponível, não pode carregar cobranças');
      return;
    }
    
    setLoadingCobrancas(true);
    try {
      log.debug('Carregando cobranças via serviceOrdersService', { companyId: user?.company_id });
      
      const result = await serviceOrdersService.getServiceOrders({
        companyId: user?.company_id,
        all: false
      });
      
      log.debug('Resultado do serviceOrdersService', { success: result.success, total: result.total, paymentsLength: result.payments?.length });
      
      if (result.success && Array.isArray(result.payments)) {
        log.debug('Definindo cobranças no estado', { count: result.payments.length });
        setCobrancas(result.payments);
        log.debug('Cobranças carregadas com sucesso', { count: result.payments.length });
        
        if (result.payments.length > 0) {
          log.debug('Amostra dos dados carregados', { sample: result.payments[0] });
        }
      } else {
        log.warn('Resposta inválida do serviceOrdersService', { result });
        setCobrancas([]);
      }
      
    } catch (error) {
      log.error('Erro ao carregar cobranças via serviceOrdersService', error);
      setCobrancas([]);
    } finally {
      setLoadingCobrancas(false);
      log.debug('LoadCobrancas finalizado');
    }
  };

  // Função para sincronizar cobranças com o Asaas
  const syncWithAsaas = async () => {
    if (!user?.company_id) {
      toast.error('ID da empresa não disponível');
      return;
    }

    setSyncingWithAsaas(true);
    try {
      log.api('Iniciando sincronização com Asaas', { companyId: user.company_id });
      
      const response = await fetch(`/api/payments/sync/${user.company_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        log.info('Sincronização concluída', { synced: result.synced });
        
        if (result.synced > 0) {
          toast.success(`${result.synced} cobranças sincronizadas com sucesso!`);
        } else {
          toast.info('Nenhuma cobrança nova encontrada no Asaas');
        }
        
        await loadCobrancas(true);
      } else {
        log.error('Erro na sincronização', result);
        toast.error(result.error || 'Erro ao sincronizar com Asaas');
      }
    } catch (error) {
      log.error('Erro na sincronização', error);
      toast.error('Erro de conexão ao sincronizar com Asaas');
    } finally {
      setSyncingWithAsaas(false);
    }
  };

  // Função para sincronização forçada de cobrança específica
  const forceSyncPayment = async (paymentId: string) => {
    if (!user?.company_id) {
      toast.error('ID da empresa não disponível');
      return;
    }

    try {
      log.api('Sincronização forçada', { paymentId, companyId: user.company_id });
      
      const response = await fetch(`/api/force-sync/${paymentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: user.company_id
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        log.info('Sincronização forçada concluída', { paymentId });
        toast.success('Cobrança sincronizada com sucesso!');
        
        await loadCobrancas(true);
      } else {
        log.error('Erro na sincronização forçada', result);
        toast.error(result.error || 'Erro ao sincronizar cobrança');
      }
    } catch (error) {
      log.error('Erro na sincronização forçada', error);
      toast.error('Erro de conexão ao sincronizar cobrança');
    }
  };

  // Função para testar conexão com Asaas
  const testAsaasConnection = async () => {
    if (!user?.company_id) {
      toast.error('ID da empresa não disponível');
      return;
    }

    try {
      log.api('Teste de conexão Asaas', { companyId: user.company_id });
      
      const response = await fetch(`/api/force-sync/test/${user.company_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        log.info('Teste de conexão bem-sucedido', { totalPayments: result.asaas_data?.total_payments });
        toast.success(`Conexão OK! ${result.asaas_data.total_payments} cobranças no Asaas`);
      } else {
        log.error('Erro no teste de conexão', result);
        toast.error(result.error || 'Erro ao testar conexão');
      }
    } catch (error) {
      log.error('Erro no teste de conexão', error);
      toast.error('Erro de conexão ao testar Asaas');
    }
  };

  const loadMultaTypes = async () => {
    try {
      setLoadingMultaTypes(true);
      console.log('🏷️ === CARREGANDO SERVIÇOS DE MULTA (NOVA ARQUITETURA) ===');
      console.log('🔍 User atual:', user);
      console.log('🔍 Company ID:', user?.company_id);
      
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('category', 'Trânsito')
        .eq('active', true)
        .not('tipo_multa', 'is', null)
        .order('base_price');
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Serviços carregados:', services?.length);
      console.log('📋 Serviços encontrados:', services?.map(s => ({ name: s.name, tipo: s.tipo_multa, preco: s.base_price })));
      
      // Converter serviços para formato de tipos de multa
      const multaTypesFromServices = services?.map(service => ({
        id: service.id,
        type: service.tipo_multa?.toLowerCase() || 'leve',
        name: service.name,
        description: service.description,
        suggested_price: service.suggested_price || 0,
        total_price: (service.acsm_value || 0) + (service.icetran_value || 0) + (service.taxa_cobranca || 0),
        acsm_value: service.acsm_value || 0,
        icetran_value: service.icetran_value || 0,
        taxa_cobranca: service.taxa_cobranca || 0,
        active: service.active,
        severity: service.tipo_multa?.toLowerCase() || 'leve',
        service_id: service.id // Manter referência ao serviço
      })) || [];
      
      console.log('🔄 Tipos convertidos:', multaTypesFromServices.length);
      setMultaTypes(multaTypesFromServices);
      
      if (multaTypesFromServices.length === 0) {
        toast.error('Nenhum serviço de multa encontrado. Verifique se os serviços foram criados corretamente.');
      } else {
        console.log('🎉 Serviços de multa carregados com sucesso!');
      }
    } catch (error) {
      console.error('💥 Erro ao carregar serviços de multa:', error);
      setMultaTypes([]);
    } finally {
      setLoadingMultaTypes(false);
    }
  };

  const createServiceOrder = async () => {
    console.log('\n=== DEBUG CRIAÇÃO DE COBRANÇA ===');
    console.log('🔍 Dados de entrada:');
    console.log('  - Cliente selecionado:', selectedClient);
    console.log('  - Tipo de multa:', selectedMultaType);
    console.log('  - Valor customizado:', customAmount);
    
    // Validações com logs
    if (!selectedClient) {
      console.error('❌ ERRO: Cliente não selecionado');
      toast.error('Por favor, selecione um cliente primeiro.');
      return;
    }
    
    if (!selectedMultaType) {
      console.error('❌ ERRO: Tipo de multa não selecionado');
      toast.error('Por favor, selecione um tipo de multa.');
      return;
    }

    // Verificar se já está processando para evitar cliques múltiplos
    if (creatingPayment) {
      console.log('⚠️ AVISO: Já existe uma requisição em andamento, ignorando clique');
      toast.warning('Aguarde o processamento da cobrança atual.');
      return;
    }

    // Buscar dados do serviço/tipo de multa selecionado
    console.log('🔍 Procurando serviço por type:', selectedMultaType);
    console.log('📋 Tipos disponíveis:', multaTypes.map(t => ({ id: t.id, type: t.type, name: t.name })));
    
    const selectedType = multaTypes.find(t => t.type === selectedMultaType);
    if (!selectedType) {
      console.error('❌ ERRO: Serviço de multa não encontrado');
      console.log('  - Tipo procurado:', selectedMultaType);
      console.log('  - Tipos disponíveis:', multaTypes.map(t => ({ id: t.id, type: t.type, name: t.name })));
      toast.error('Serviço de multa não encontrado');
      return;
    }
    
    console.log('✅ Serviço selecionado:', {
      id: selectedType.id,
      name: selectedType.name,
      tipo_multa: selectedType.type,
      custo_minimo: selectedType.total_price
    });

    const finalAmount = customAmount || selectedType.suggested_price;
    
    console.log('\n💰 CÁLCULO DE VALORES:');
    console.log('  - Valor customizado:', customAmount);
    console.log('  - Valor base:', selectedType.suggested_price);
    console.log('  - Valor final:', finalAmount);
    
    try {
      setCreatingPayment(true);

      // Validar dados do cliente
      console.log('\n🔍 VALIDAÇÃO DOS DADOS DO CLIENTE:');
      console.log('  - ID:', selectedClient.id);
      console.log('  - Nome:', selectedClient.nome);
      console.log('  - CPF/CNPJ:', selectedClient.cpf_cnpj);
      console.log('  - Email:', selectedClient.email);
      console.log('  - Asaas Customer ID:', selectedClient.asaas_customer_id);
      
      if (!selectedClient.cpf_cnpj) {
        console.error('❌ ERRO: CPF/CNPJ do cliente não encontrado');
        toast.error('CPF/CNPJ do cliente não encontrado. Verifique os dados do cliente.');
        return;
      }
      
      if (!selectedClient.asaas_customer_id) {
         console.warn('⚠️ AVISO: Cliente não possui asaas_customer_id, será criado automaticamente');
         toast.warning('Cliente não possui integração com Asaas. O customer será criado automaticamente.');
       }

      console.log('✅ Dados validados, prosseguindo com criação da cobrança');
      
      console.log('📋 Dados do serviço:', {
        service_id: selectedType.id,
        service_name: selectedType.name,
        tipo_multa: selectedType.type,
        valor_cobranca: customAmount || selectedType.suggested_price,
        custo_minimo: selectedType.total_price
      });
      
      console.log('\n✅ VALIDAÇÃO DOS DADOS:');
      console.log('  - Cliente ID:', selectedClient.id);
      console.log('  - Serviço ID:', selectedType.id);
      console.log('  - Empresa ID:', user?.company_id);
      console.log('  - Valor cobrança:', customAmount || selectedType.suggested_price);
      
      // Configurar timeout para a requisição (10 segundos para aguardar resposta do Asaas)
      const timeoutMs = 10000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ TIMEOUT: Requisição cancelada após', timeoutMs, 'ms');
      }, timeoutMs);
      
      // Configurar timeout para cancelar a requisição se necessário
      
      console.log('\n🌐 CONFIGURAÇÃO DA REQUISIÇÃO PARA WEBHOOK N8N:');
      console.log('  - URL: https://webhookn8n.synsoft.com.br/webhook/d37fac6e-9379-4bca-b015-9c56b104cae1');
      console.log('  - Method: POST');
      console.log('  - Timeout:', timeoutMs, 'ms (10s para aguardar resposta do Asaas)');
      console.log('  - Aguardando processamento completo do webhook e salvamento no banco...');
      
      // Buscar dados da empresa para obter wallet_id
      console.log('🔍 Buscando dados da empresa para wallet_id...');
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, nome, manual_wallet_id')
        .eq('id', user?.company_id)
        .single();
      
      if (companyError || !company) {
        console.error('❌ ERRO: Empresa não encontrada:', companyError);
        throw new Error('Empresa não encontrada');
      }
      
      console.log('✅ Empresa encontrada:', company.nome);
      console.log('  - Wallet ID:', (company as any).manual_wallet_id);
      
      // Resolver wallet da ICETRAN exclusivamente via manual_wallet_id
      let icetranWalletId: string | null = null;
      try {
        const { data: companyRow } = await supabase
          .from('companies')
          .select('parent_company_id')
          .eq('id', user?.company_id)
          .single();
        if (companyRow?.parent_company_id) {
          const { data: parent } = await supabase
            .from('companies')
            .select('id, nome, manual_wallet_id')
            .eq('id', companyRow.parent_company_id)
            .single();
          if (parent?.manual_wallet_id) {
            icetranWalletId = parent.manual_wallet_id;
          }
        }
        if (!icetranWalletId) {
          const { data: icetranCompanies } = await supabase
            .from('companies')
            .select('id, nome, manual_wallet_id, company_type, status')
            .or('company_type.eq.icetran,nome.ilike.%ICETRAN%')
            .eq('status', 'ativo')
            .limit(1);
          const icetran = Array.isArray(icetranCompanies) ? icetranCompanies[0] : null;
          if (icetran?.manual_wallet_id) {
            icetranWalletId = icetran.manual_wallet_id;
          }
        }
      } catch (err) {
        console.warn('⚠️  Falha ao resolver wallet do ICETRAN dinamicamente:', err);
      }
      const isDev = import.meta.env?.DEV;
      // Não usar defaults; exigir manual_wallet_id quando houver valor ICETRAN
      if (!icetranWalletId && (selectedType.icetran_value && selectedType.icetran_value > 0)) {
        if (isDev) {
          console.warn('🔧 DEV: Wallet da ICETRAN ausente; prosseguindo para teste.');
        } else {
          toast.error('Wallet da ICETRAN não configurada. Cadastre manual_wallet_id na empresa ICETRAN.');
          throw new Error('ICETRAN_WALLET_MISSING');
        }
      }
      console.log('🏦 Wallet ICETRAN usada:', icetranWalletId);
      
      // Resolver wallet do DESPACHANTE exclusivamente via manual_wallet_id
      let dispatcherWalletId: string | null = (company as any)?.manual_wallet_id || null;
      if (!dispatcherWalletId) {
        if (isDev) {
          console.warn('🔧 DEV: Wallet do despachante ausente; prosseguindo para teste.');
        } else {
          toast.error('Wallet do despachante não configurada. Cadastre manual_wallet_id na empresa.');
          throw new Error('DESPACHANTE_WALLET_MISSING');
        }
      }
      console.log('🏦 Wallet DESPACHANTE usada:', dispatcherWalletId);
      
      // Construir payload EXATO conforme especificado pelo usuário
      const webhookPayload = {
        wallet_icetran: icetranWalletId,
        wallet_despachante: dispatcherWalletId,
        Customer_cliente: {
          id: selectedClient.id,
          nome: selectedClient.nome,
          cpf_cnpj: selectedClient.cpf_cnpj,
          email: selectedClient.email,
          asaas_customer_id: selectedClient.asaas_customer_id
        },
        "Valor_cobrança": customAmount || selectedType.suggested_price,
        "Idserviço": selectedType.id,
        "descricaoserviço": selectedType.name,
        "multa_type": selectedType.type || "leve",
        valoracsm: selectedType.acsm_value || 11,
        valoricetran: selectedType.icetran_value || 11,
        taxa: selectedType.taxa_cobranca || 3.5,
        despachante: {
          company_id: user?.company_id,
          nome: company.nome,
          wallet_id: dispatcherWalletId,
          margem: (customAmount || selectedType.suggested_price) - (selectedType.acsm_value || 11) - (selectedType.icetran_value || 11) - (selectedType.taxa_cobranca || 3.5)
        }
      };
      
      console.log('\n📦 PAYLOAD PARA WEBHOOK N8N:');
      console.log('=====================================');
      console.log(JSON.stringify(webhookPayload, null, 2));
      console.log('=====================================');
      
      console.log('\n🚀 ENVIANDO REQUISIÇÃO PARA WEBHOOK N8N...');
      const startTime = Date.now();
      
      let response: Response;
      let responseText: string = '';
      
      try {
        // Obter token de acesso da API (JWT)
        const jwt = localStorage.getItem('token');
        if (!jwt) {
          console.warn('⚠️ Aviso: Token de acesso (JWT) não encontrado; prosseguindo sem Authorization');
        } else {
          console.log('🔑 Token de acesso (JWT) obtido:', jwt.substring(0, 20) + '...');
        }
        
        // Fazer a requisição para o webhook N8N via proxy backend
        response = await fetch('/api/webhook/n8n/process-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {})
          },
          body: JSON.stringify(webhookPayload),
          signal: controller.signal
        });
        
        // Limpar o timeout se a requisição foi bem-sucedida
        clearTimeout(timeoutId);
        console.log('✅ Timeout cancelado - requisição concluída');
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('\n📡 RESPOSTA RECEBIDA:');
        console.log('  - Status:', response.status);
        console.log('  - Status Text:', response.statusText);
        console.log('  - OK:', response.ok);
        console.log('  - Tempo de resposta:', duration, 'ms');
        console.log('  - URL final:', response.url);
        console.log('  - Redirected:', response.redirected);
        
        console.log('\n📋 HEADERS DA RESPOSTA:');
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
          console.log(`  - ${key}: ${value}`);
        });
        
        // Aguardar e ler o corpo da resposta ANTES de verificar erros
        responseText = await response.text();
        console.log('\n📄 RESPOSTA DO WEBHOOK N8N:');
        console.log('=====================================');
        console.log(responseText);
        console.log('=====================================');
        
        // Verificar erro HTTP após ler a resposta
        if (!response.ok) {
          console.error('❌ ERRO HTTP:', response.status, response.statusText);
          console.log('  - Corpo da resposta:', responseText);
          throw new Error(`Erro HTTP ${response.status}: ${response.statusText}${responseText ? ' - ' + responseText : ''}`);
        }
        
      } catch (fetchError) {
         console.error('❌ ERRO NA REQUISIÇÃO:', fetchError);
         
         // Limpar timeout em caso de erro
         clearTimeout(timeoutId);
         
         // Verificar tipo de erro
         if (fetchError.name === 'AbortError') {
           console.log('⏰ ERRO: Requisição cancelada por timeout de 10 segundos');
           throw new Error('Timeout: A requisição demorou mais que 10 segundos para processar no Asaas. Tente novamente.');
         } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
           throw new Error('Erro de conexão com o servidor. Verifique sua internet e tente novamente.');
         }
         
         // Re-lançar outros erros
         throw fetchError;
       }
      
      let result: any = {};
      
      // Tentar parsear JSON se a resposta não estiver vazia
      if (responseText && responseText.trim() !== '') {
        try {
          result = JSON.parse(responseText);
          console.log('\n✅ JSON PARSEADO COM SUCESSO:');
          console.log(JSON.stringify(result, null, 2));
        } catch (parseError) {
          console.log('⚠️ Resposta não é JSON, tratando como sucesso');
          result = { success: true, message: responseText };
        }
      } else {
        console.log('✅ Resposta vazia, tratando como sucesso');
        result = { success: true };
      }

      // ========== TRATAMENTO DE ERRO DO WEBHOOK ==========
      // Verificar se a resposta contém erro
      if (result && Array.isArray(result) && result[0] && result[0].erro) {
        console.log('\n❌ ERRO DETECTADO NA RESPOSTA DO WEBHOOK:');
        console.log('=====================================');
        
        try {
          // Parsear o JSON aninhado do erro
          const errorData = JSON.parse(result[0].erro);
          console.log('📋 Dados do erro parseados:', errorData);
          
          if (errorData.error && errorData.error.message) {
            // Extrair mensagem de erro do Asaas
            const errorMessage = errorData.error.message;
            console.log('📄 Mensagem de erro completa:', errorMessage);
            
            // Tentar extrair o JSON de erro do Asaas da mensagem
            const messageParts = errorMessage.split(' - ');
            if (messageParts.length > 1) {
              try {
                const asaasErrorJson = messageParts[1];
                console.log('🔍 JSON de erro do Asaas:', asaasErrorJson);
                
                // Fazer unescape das barras e parsear
                const cleanJson = asaasErrorJson.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
                console.log('🧹 JSON limpo:', cleanJson);
                
                const asaasError = JSON.parse(cleanJson);
                console.log('✅ Erro do Asaas parseado:', asaasError);
                
                if (asaasError.errors && asaasError.errors[0] && asaasError.errors[0].description) {
                  const errorDescription = asaasError.errors[0].description;
                  console.log('💥 Descrição do erro:', errorDescription);
                  
                  // Lançar erro com a mensagem específica do Asaas
                  throw new Error(errorDescription);
                }
              } catch (parseError) {
                console.error('❌ Erro ao parsear JSON do Asaas:', parseError);
                // Usar mensagem de erro genérica
                throw new Error('Erro no processamento da cobrança no Asaas');
              }
            }
            
            // Se não conseguiu extrair erro específico, usar mensagem genérica
            throw new Error('Erro no processamento da cobrança');
          }
          
          // Se não tem estrutura de erro esperada
          throw new Error('Erro desconhecido no processamento da cobrança');
          
        } catch (jsonError) {
          console.error('❌ Erro ao parsear JSON de erro:', jsonError);
          
          // Se o erro já foi lançado acima, re-lançar
          if (jsonError.message.includes('Wallet') || jsonError.message.includes('Customer') || jsonError.message.includes('invalid')) {
            throw jsonError;
          }
          
          // Caso contrário, usar mensagem genérica
          throw new Error('Erro no processamento da cobrança');
        }
      }
      // ========== FIM DO TRATAMENTO DE ERRO ==========

      console.log('\n🎉 COBRANÇA CRIADA COM SUCESSO NO WEBHOOK N8N!');
      console.log('  - Status HTTP:', response.status);
      console.log('  - Resposta:', result);
      console.log('  - Tempo total de processamento:', Date.now() - startTime, 'ms');
      
      // Verificar se a resposta contém os dados do pagamento
      // O webhook N8N retorna um array com os dados da cobrança
      let paymentData = null;
      
      console.log('\n🔍 ANALISANDO ESTRUTURA DA RESPOSTA:');
      console.log('  - É array?', Array.isArray(result));
      console.log('  - Tipo:', typeof result);
      console.log('  - Keys/Length:', Array.isArray(result) ? result.length : Object.keys(result));

      // Fallback: sucesso com corpo vazio (proxy padroniza emptyResponse)
      const isEmptySuccess = !!result && result.success === true && (
        (result.emptyResponse === true) || (!responseText || responseText.trim() === '')
      );

      if (isEmptySuccess) {
        console.log('✅ Sucesso com corpo vazio; criando cobrança placeholder enquanto aguarda dados do n8n');
        paymentData = {
          id: `pending_${Date.now()}`,
          value: customAmount || selectedType.suggested_price,
          status: 'pending',
          description: `Recurso de Multa - ${selectedType.name} - ${selectedClient.nome}`,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          invoiceUrl: '',
          encodedImage: '',
          payload: ''
        };
        console.log('🧩 Placeholder criado para cobrança pendente (sem QR/PIX).');
      } else if (Array.isArray(result) && result.length > 0) {
        // Webhook retorna array, pegar o primeiro elemento
        paymentData = result[0];
        console.log('✅ Dados extraídos do array (primeiro elemento)');
        console.log('  - ID do pagamento:', paymentData.id);
        console.log('  - Valor:', paymentData.value);
        console.log('  - Status:', paymentData.status);
      } else if (result.payment) {
        paymentData = result.payment;
        console.log('✅ Dados extraídos de result.payment');
      } else if (result.data && result.data.payment) {
        paymentData = result.data.payment;
        console.log('✅ Dados extraídos de result.data.payment');
      } else if (result.id || result.asaas_payment_id) {
        // Resposta direta do webhook com dados do pagamento
        paymentData = result;
        console.log('✅ Dados extraídos diretamente do result');
      } else {
        console.error('❌ ERRO: Resposta do webhook não contém dados válidos');
        console.log('  - Estrutura da resposta:', Array.isArray(result) ? 'Array com ' + result.length + ' elementos' : Object.keys(result));
        console.log('  - Resposta completa:', result);
        throw new Error('Resposta do webhook não contém dados válidos do pagamento');
      }
      
      console.log('\n✅ DADOS DO PAGAMENTO VALIDADOS COM SUCESSO!');
      console.log('  - Webhook N8N processou cobrança no Asaas corretamente');
      console.log('  - Dados foram retornados pelo webhook');
      console.log('  - QR Code e PIX payload extraídos da resposta');
      
      console.log('\n📋 DADOS DO PAGAMENTO RECEBIDOS:');
      console.log('  - ID:', paymentData.id);
      console.log('  - Customer:', paymentData.customer);
      console.log('  - Value:', paymentData.value);
      console.log('  - Status:', paymentData.status);
      console.log('  - Due Date:', paymentData.dueDate);
      console.log('  - Invoice URL:', paymentData.invoiceUrl ? 'PRESENTE' : 'AUSENTE');
      console.log('  - Encoded Image (QR):', paymentData.encodedImage ? 'PRESENTE (' + paymentData.encodedImage.length + ' chars)' : 'AUSENTE');
      console.log('  - PIX Payload:', paymentData.payload ? 'PRESENTE (' + paymentData.payload.length + ' chars)' : 'AUSENTE');
      console.log('  - Description:', paymentData.description ? 'PRESENTE' : 'AUSENTE');
      
      // Agora salvar os dados no banco local via API
      console.log('\n💾 SALVANDO DADOS NO BANCO LOCAL...');
      try {
        const saveResponse = await fetch('/api/payments/save-service-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            webhook_data: paymentData,
            customer_id: selectedClient.id,
            service_id: selectedType.id,
            company_id: user?.company_id,
            valor_cobranca: customAmount || selectedType.suggested_price
          })
        });
        
        if (saveResponse.ok) {
          console.log('✅ Dados salvos no banco local com sucesso');
        } else {
          console.warn('⚠️ Falha ao salvar no banco local, mas cobrança foi criada no Asaas');
        }
      } catch (saveError) {
        console.warn('⚠️ Erro ao salvar no banco local:', saveError);
        console.log('  - Cobrança foi criada no Asaas, mas não foi salva localmente');
      }
      
      // Criar objeto da nova cobrança para exibição local
      const novaCobranca: PaymentResponse = {
        service_order_id: paymentData.id,
        payment_id: paymentData.id,
        asaas_payment_id: paymentData.id,
        client_name: selectedClient.nome,
        customer_name: selectedClient.nome,
        amount: paymentData.value || (customAmount || selectedType.suggested_price),
        status: paymentData.status?.toLowerCase() === 'pending' ? 'pending' : 'confirmed',
        created_at: paymentData.dateCreated || new Date().toISOString(),
        description: paymentData.description || `Recurso de Multa - ${selectedType.name} - ${selectedClient.nome}`,
        payment_method: 'PIX',
        customer_id: selectedClient.id,
        qr_code: paymentData.encodedImage || '',
        pix_copy_paste: paymentData.payload || '',
        payment_url: paymentData.invoiceUrl || '',
        multa_type: selectedType.name,
        due_date: paymentData.dueDate,
        success: true
      };
      
      console.log('\n✅ OBJETO DA COBRANÇA CRIADO:');
      console.log('  - Payment ID:', novaCobranca.payment_id);
      console.log('  - Amount:', novaCobranca.amount);
      console.log('  - QR Code presente:', !!novaCobranca.qr_code);
      console.log('  - PIX Payload presente:', !!novaCobranca.pix_copy_paste);
      console.log('  - Invoice URL presente:', !!novaCobranca.payment_url);
      
      // Adicionar à lista de cobranças (no início da lista)
      setCobrancas(prev => [novaCobranca, ...prev]);
      console.log('✅ Cobrança adicionada à lista local');
      
      setPaymentResult(novaCobranca);
      setShowPaymentModal(true);
      setSelectedClient(null);
      setSelectedMultaType('');
      setCustomAmount(0);
      toast.success('Cobrança criada e salva no sistema com sucesso!');
    } catch (error) {
      console.error('\n💥 ERRO GERAL:', error);
      console.log('  - Tipo:', error.constructor.name);
      console.log('  - Mensagem:', error.message);
      console.log('  - Stack:', error.stack);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Exibir erro específico do Asaas com formatação melhorada
      if (errorMessage.includes('Wallet') || errorMessage.includes('Customer') || errorMessage.includes('invalid')) {
        console.log('\n🚨 ERRO ESPECÍFICO DO ASAAS DETECTADO:');
        console.log('  - Mensagem:', errorMessage);
        toast.error(`❌ Erro do Asaas: ${errorMessage}`, {
          duration: 8000, // Mostrar por mais tempo
          style: {
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#dc2626'
          }
        });
      } else if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
        // Erro de timeout
        console.log('\n⏰ ERRO DE TIMEOUT DETECTADO:');
        toast.error(`⏰ ${errorMessage}`, {
          duration: 8000,
          style: {
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            color: '#92400e'
          }
        });
      } else if (errorMessage.includes('conexão') || errorMessage.includes('rede') || errorMessage.includes('internet')) {
        // Erro de conexão
        console.log('\n🌐 ERRO DE CONEXÃO DETECTADO:');
        toast.error(`🌐 ${errorMessage}`, {
          duration: 6000,
          style: {
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            color: '#92400e'
          }
        });
      } else {
        // Erro genérico
        toast.error(`❌ Erro ao criar cobrança: ${errorMessage}`, {
          duration: 5000
        });
      }
      
      // IMPORTANTE: NÃO salvar dados quando há erro
      console.log('\n⚠️ COBRANÇA NÃO FOI SALVA DEVIDO AO ERRO');
      console.log('  - Lista de cobranças não foi atualizada');
      console.log('  - Modal de pagamento não será exibido');
      console.log('  - Formulário permanece aberto para correção');
      console.log('  - Estado creatingPayment será resetado no finally');
    } finally {
      // SEMPRE resetar o estado, independente de sucesso ou erro
      console.log('\n🔄 RESETANDO ESTADO DE LOADING...');
      setCreatingPayment(false);
      console.log('✅ Estado creatingPayment resetado para false');
      console.log('\n🏁 FIM DO PROCESSO DE CRIAÇÃO');
    }
  };

  // Função para enviar webhook após criação da cobrança
  const sendWebhook = async (webhookData: {
    wallet_icetran: string;
    wallet_despachante: string;
    Customer_cliente: any;
    Valor_cobrança: number;
    Idserviço: string;
  }) => {
    try {
      console.log('\n🔗 ENVIANDO WEBHOOK...');
      console.log('  - URL:', 'https://webhookn8n.synsoft.com.br/webhook/d37fac6e-9379-4bca-b015-9c56b104cae1');
      console.log('  - Dados:', webhookData);
      
      const jwt = localStorage.getItem('token');
      const response = await fetch('/api/webhook/n8n/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {})
        },
        body: JSON.stringify(webhookData)
      });
      
      console.log('  - Status webhook:', response.status);
      console.log('  - Webhook enviado:', response.ok);
      
      if (response.ok) {
        console.log('✅ Webhook enviado com sucesso!');
      } else {
        console.warn('⚠️ Webhook falhou, mas cobrança foi criada');
      }
    } catch (error) {
      console.error('❌ ERRO AO ENVIAR WEBHOOK:', error);
      console.log('  - Cobrança foi criada, mas webhook falhou');
      // Não propagar o erro para não afetar o fluxo principal
    }
  };

  // Função para testar conectividade com backend
  const testBackendConnection = async () => {
    try {
      const response = await fetch('/api/health');
      
      if (response.ok) {
        const data = await response.text();
        console.log('Backend conectado:', data);
      }
    } catch (error) {
      // Silenciosamente falha sem mostrar erros
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado para a área de transferência!');
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  // Funções auxiliares para status
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'received':
      case 'confirmed':
      case 'paid': return 'default'; // Verde para pago
      case 'pending':
      case 'awaiting_payment': return 'secondary'; // Cinza para pendente
      case 'overdue': return 'destructive'; // Vermelho para vencido
      case 'cancelled':
      case 'refunded': return 'outline'; // Outline para cancelado
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    if (!status || status.trim() === '') {
      return 'Pendente'; // Status padrão mais útil
    }
    
    switch (status?.toLowerCase()) {
      case 'received':
      case 'confirmed':
      case 'paid': return 'Pago';
      case 'pending':
      case 'pending_payment': return 'Pendente';
      case 'awaiting_payment': return 'Aguardando';
      case 'overdue': return 'Vencido';
      case 'cancelled': return 'Cancelado';
      case 'refunded': return 'Reembolsado';
      default: return 'Pendente'; // Mais útil que "Desconhecido"
    }
  };

  // Função para converter PaymentResponse para Cobranca
  const convertToCobranca = (payment: PaymentResponse): any => {
    console.log('🔄 === CONVERTENDO PAYMENT PARA COBRANCA ===');
    console.log('  - Payment original:', payment);
    console.log('  - QR Code disponível:', payment.qr_code);
    console.log('  - PIX QR Code disponível:', payment.pix_qr_code);
    console.log('  - PIX Copy Paste disponível:', payment.pix_copy_paste);
    
    const cobrancaConvertida = {
      id: payment.payment_id || payment.service_order_id || '',
      client_id: payment.customer_id || '',
      client_name: payment.client_name || payment.customer_name || 'N/A',
      amount: payment.amount || 0,
      due_date: payment.due_date || new Date().toISOString(),
      status: payment.status === 'paid' || payment.status === 'received' || payment.status === 'confirmed' ? 'paid' : 'pending',
      description: payment.description || payment.multa_type || '',
      payment_method: payment.payment_method || 'PIX',
      asaas_payment_id: payment.asaas_payment_id,
      created_at: payment.created_at || new Date().toISOString(),
      paid_at: payment.paid_at,
      invoice_url: payment.invoice_url,
      // Mapear múltiplas fontes de QR Code
      pix_qr_code: payment.pix_qr_code || payment.qr_code,
      pix_code: payment.pix_copy_paste || payment.payment?.pix_code,
      // Dados adicionais do payment
      payment_data: payment.payment
    };
    
    console.log('  - Cobrança convertida:', cobrancaConvertida);
    return cobrancaConvertida;
  };

  // Função auxiliar para verificar se cobrança está paga
  const isPaidStatus = (status: string): boolean => {
    return ['RECEIVED', 'CONFIRMED', 'confirmed', 'paid'].includes(status?.toUpperCase() || '');
  };

  // Função para exibir nome do cliente com fallback melhorado
  const getClientDisplay = (cobranca: PaymentResponse): string => {
    // Tentar múltiplas fontes de nome do cliente
    const possibleNames = [
      cobranca.client_name,
      cobranca.customer_name,
      cobranca.webhook_data?.customer?.name,
      cobranca.processed_data?.customer_name
    ].filter(name => name && name.trim() !== '' && name !== 'N/A');
    
    if (possibleNames.length > 0) {
      return possibleNames[0];
    }
    
    if (cobranca.customer_id) {
      return `Cliente ${cobranca.customer_id}`;
    }
    
    return 'Cliente não identificado';
  };

  // Função para criar recurso a partir de cobrança paga
  const handleCreateRecurso = async (cobranca: PaymentResponse) => {
    console.log('🚀 === INICIANDO CRIAÇÃO DE RECURSO ===');
    console.log('  - Cobrança:', cobranca);
    console.log('  - Status:', cobranca.status);
    console.log('  - Payment ID:', cobranca.payment_id);
    
    // Verificar se o pagamento foi confirmado
    if (!['RECEIVED', 'CONFIRMED', 'confirmed', 'paid'].includes(cobranca.status || '')) {
      console.log('❌ Status não permite criação de recurso:', cobranca.status);
      toast.error('Recurso só pode ser criado após confirmação do pagamento');
      return;
    }
    
    try {
      // Extrair dados do cliente da cobrança
      const clienteData = {
        nome: getClientDisplay(cobranca),
        cpf_cnpj: cobranca.webhook_data?.customer?.cpf_cnpj || cobranca.processed_data?.customer_cpf || '',
        endereco: cobranca.webhook_data?.customer?.endereco || cobranca.processed_data?.customer_endereco || '',
        email: cobranca.webhook_data?.customer?.email || '',
        telefone: cobranca.webhook_data?.customer?.telefone || ''
      };
      
      console.log('👤 Dados do cliente extraídos:', clienteData);
      
      // Criar parâmetros de URL com dados do cliente
      const params = new URLSearchParams({
        serviceOrderId: cobranca.service_order_id || cobranca.payment_id || '',
        payment_id: cobranca.payment_id || '',
        client_name: clienteData.nome,
        client_cpf: clienteData.cpf_cnpj,
        client_endereco: clienteData.endereco,
        client_email: clienteData.email,
        client_telefone: clienteData.telefone,
        amount_paid: cobranca.amount?.toString() || '0',
        multa_type: cobranca.multa_type || ''
      });
      
      console.log('🔄 Navegando para TesteRecursoIA com parâmetros:', params.toString());
      
      // Navegar para página de teste recurso IA com dados do cliente
      navigate(`/teste-recurso-ia?${params.toString()}`);
      
      toast.success('Direcionando para criação de recurso com IA...');
      
    } catch (error) {
      console.error('❌ Erro ao iniciar recurso:', error);
      toast.error('Erro ao iniciar processo de recurso');
    }
  };

  const handleSelectMultaType = (type: MultaType) => {
    console.log('🎯 Selecionando tipo de multa:', type);
    setSelectedMultaType(type.type);
    
    // Usar os valores corretos do serviço selecionado para configurar splits
    const splitConfigFromService = {
      acsm_value: type.acsm_value || 6.00,
      icetran_value: type.icetran_value || 6.00,
      taxa_cobranca: 3.50 // Taxa padrão
    };
    
    setServiceSplitConfig(splitConfigFromService);
    
    // Definir valor mínimo fixo de R$ 1,50 conforme regra de negócio
    const custoMinimoFixo = 1.50;
    setCustoMinimo(custoMinimoFixo);
    
    // Inicializar com o valor sugerido (sempre usar suggested_price como valor inicial)
    const valorInicial = type.suggested_price || custoMinimoFixo;
    setCustomAmount(valorInicial);
    setIsEditingAmount(false);
    
    console.log('💰 Configuração atualizada para tipo selecionado:', {
      tipoMulta: type.name,
      acsm_value: splitConfigFromService.acsm_value,
      icetran_value: splitConfigFromService.icetran_value,
      taxa_cobranca: splitConfigFromService.taxa_cobranca,
      custoMinimoFixo,
      valorSugerido: type.suggested_price,
      valorInicial
    });
  };
  
  const handleUseSuggested = (type: MultaType) => {
    setCustomAmount(type.suggested_price);
    toast.success(`Valor definido para R$ ${type.suggested_price.toFixed(2)}`);
  };

  const getSelectedType = (): MultaType | undefined => {
    return multaTypes.find(type => type?.type === selectedMultaType);
  };

  const calculateMargin = (amount: number, totalPrice: number): number => {
    if (!amount || !totalPrice || amount <= totalPrice) return 0;
    return ((amount - totalPrice) / totalPrice) * 100;
  };

  const loadServices = async (forceRefresh = false) => {
    log.debug('Carregando serviços', { forceRefresh, userId: user?.id });
    
    try {
      setLoading(true);

      const query = supabase
        .from('services')
        .select(`
          *,
          split_configurations(*)
        `)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });
      
      if (forceRefresh) {
        log.debug('Forçando refresh', { timestamp: Date.now() });
      }
      
      const { data: servicesData, error: servicesError } = await query;

      if (servicesError) {
        // Silenciosamente falha e propaga o erro sem logar
        throw servicesError;
      }
      
      log.debug('Serviços encontrados', { count: servicesData?.length || 0 });
      servicesData?.forEach((service, i) => {
        log.debug('Serviço', { index: i + 1, name: service.name, acsm_value: service.acsm_value, suggested_price: service.suggested_price });
      });

      // Buscar preços já definidos pelo despachante
      const { data: pricingData, error: pricingError } = await supabase
        .from('despachante_service_pricing')
        .select('*')
        .eq('despachante_id', user?.id);

      if (pricingError) {
        console.warn('⚠️ Erro ao buscar pricing (não crítico):', pricingError);
      }

      // Combinar dados e calcular custos base
      const servicesWithPricing: ServiceWithPricing[] = (servicesData || []).map(service => {
        const splitConfig = service.split_configurations?.[0];
        const existingPricing = pricingData?.find(p => p.service_id === service.id);
        
        // Calcular custo base usando os valores diretos do serviço
        const acsm_cost = service.acsm_value || 0;
        const icetran_cost = service.icetran_value || 0;
        const taxa_cobranca = service.taxa_cobranca || 3.50;
        
        const base_cost = acsm_cost + icetran_cost + taxa_cobranca;
        const client_price = existingPricing?.client_price || 0;
        const profit = client_price > base_cost ? client_price - base_cost : 0;
        
        return {
          ...service,
          split_configuration: splitConfig,
          despachante_pricing: existingPricing,
          base_cost,
          profit
        };
      });

      console.log('✅ Serviços processados:', servicesWithPricing.length);
      setServices(servicesWithPricing);
      
      if (forceRefresh) {
        // Alerta removido
      }
      
    } catch (error) {
      // Silenciosamente falha sem mostrar erros
    } finally {
      setLoading(false);
    }
  };

  // Funções de configuração de preços removidas - não necessárias para despachantes

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Funções auxiliares removidas - usando as que estão definidas mais abaixo

  // Componente de lista de cobranças melhorado
  const CobrancasList = () => {
    // Debug logs para verificar estado das cobranças
    console.log('🔍 DEBUG CobrancasList:');
    console.log('  - Total de cobranças:', cobrancas.length);
    console.log('  - Cobranças array:', cobrancas);
    console.log('  - Loading cobranças:', loadingCobrancas);
    console.log('  - Filtro atual:', filter);
    console.log('  - User company_id:', user?.company_id);
    
    // Filtrar cobranças baseado no filtro selecionado
    const allFilteredCobranças = cobrancas.filter(cobranca => {
      if (filter === 'pending') return ['PENDING', 'AWAITING_PAYMENT', 'pending', 'pending_payment'].includes(cobranca.status || '');
      if (filter === 'paid') return ['RECEIVED', 'CONFIRMED', 'confirmed', 'paid'].includes(cobranca.status || '');
      return true;
    });
    
    // Cálculos de paginação
    const totalItems = allFilteredCobranças.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const filteredCobranças = allFilteredCobranças.slice(startIndex, endIndex);
    
    // Reset página quando filtro muda
    React.useEffect(() => {
      setCurrentPage(1);
    }, [filter]);
    
    console.log('  - Cobranças filtradas (total):', totalItems);
    console.log('  - Página atual:', currentPage, 'de', totalPages);
    console.log('  - Mostrando itens:', startIndex + 1, 'a', Math.min(endIndex, totalItems));
    
    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Minhas Cobranças
              </CardTitle>
              <CardDescription>
                Gerencie cobranças e inicie recursos após pagamento
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                Todas ({cobrancas.length})
              </Button>
              <Button
                size="sm"
                variant={filter === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilter('pending')}
              >
                Pendentes ({cobrancas.filter(c => ['PENDING', 'AWAITING_PAYMENT', 'pending', 'pending_payment'].includes(c.status || '')).length})
              </Button>
              <Button
                size="sm"
                variant={filter === 'paid' ? 'default' : 'outline'}
                onClick={() => setFilter('paid')}
              >
                Pagas ({cobrancas.filter(c => ['RECEIVED', 'CONFIRMED', 'confirmed', 'paid'].includes(c.status || '')).length})
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadCobrancas(true)}
                disabled={loadingCobrancas}
                title="Atualizar lista de cobranças"
              >
                <RefreshCw className={`h-4 w-4 ${loadingCobrancas ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8">
          {loadingCobrancas ? (
            <div className="text-center py-12">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 max-w-md mx-auto">
                <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-6 text-blue-600" />
                <p className="text-lg font-medium text-gray-700">Carregando cobranças...</p>
              </div>
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-3xl p-12 max-w-lg mx-auto border border-gray-200/50">
                <FileText className="h-16 w-16 mx-auto mb-6 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhuma cobrança encontrada</h3>
                <p className="text-gray-500 mb-6">Não há cobranças para exibir no momento</p>
                {filter !== 'all' && (
                  <Button
                    variant="link"
                    onClick={() => setFilter('all')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver todas as cobranças
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-6">
                {filteredCobranças.map((cobranca, index) => {
                const isPaid = ['RECEIVED', 'CONFIRMED', 'confirmed', 'paid'].includes(cobranca.status?.toLowerCase() || '');
                
                return (
                  <div
                    key={cobranca.payment_id || index}
                    className={`relative overflow-hidden rounded-2xl border-0 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group ${
                      isPaid 
                        ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 shadow-lg shadow-green-100/50 hover:shadow-green-200/60' 
                        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 shadow-lg shadow-blue-100/50 hover:shadow-blue-200/60'
                    }`}
                  >
                    {/* Decorative gradient overlay */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      isPaid 
                        ? 'bg-gradient-to-r from-emerald-500/5 to-green-500/5' 
                        : 'bg-gradient-to-r from-blue-500/5 to-indigo-500/5'
                    }`} />
                    
                    {/* Status indicator */}
                    <div className={`absolute top-0 right-0 w-20 h-20 -mr-10 -mt-10 rounded-full opacity-10 ${
                      isPaid ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1 pr-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-3 h-3 rounded-full ${
                              isPaid ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-blue-500 shadow-lg shadow-blue-500/30'
                            }`} />
                            <h4 className="text-xl font-bold text-gray-900 tracking-tight">
                              {getClientDisplay(cobranca)}
                            </h4>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-base font-medium text-gray-700 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                              Multa {cobranca.multa_type}
                            </p>
                            <p className="text-sm text-gray-500 font-mono bg-white/60 px-3 py-1 rounded-lg inline-block">
                              ID: {cobranca.payment_id}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <span className="w-1 h-1 bg-gray-400 rounded-full" />
                              Criado: {new Date(cobranca.created_at).toLocaleString('pt-BR')}
                              {isPaid && cobranca.paid_at && (
                                <>
                                  <span className="mx-2 text-gray-400">•</span>
                                  <span className="text-green-600 font-medium">
                                    Pago: {new Date(cobranca.paid_at).toLocaleString('pt-BR')}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-3">
                          <div className={`px-4 py-2 rounded-xl font-bold text-2xl shadow-lg ${
                            isPaid 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/30' 
                              : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/30'
                          }`}>
                            {formatCurrency(cobranca.amount)}
                          </div>
                          <Badge 
                            variant={getStatusVariant(cobranca.status)}
                            className={`text-sm px-4 py-1.5 font-semibold shadow-md ${
                              isPaid 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                          >
                            {getStatusLabel(cobranca.status)}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Action buttons section */}
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-white/50">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            console.log('🔍 Abrindo modal com dados:', cobranca);
                            console.log('  - client_name:', cobranca.client_name);
                            console.log('  - customer_name:', cobranca.customer_name);
                            console.log('  - status:', cobranca.status);
                            console.log('  - qr_code:', !!cobranca.qr_code);
                            console.log('  - pix_copy_paste:', !!cobranca.pix_copy_paste);
                            setPaymentResult(cobranca);
                            setShowPaymentModal(true);
                          }}
                          className="bg-white/80 hover:bg-white border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 shadow-md hover:shadow-lg transition-all duration-200 font-medium px-4 py-2.5"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                        
                        {/* Botão Iniciar Recurso - apenas para cobranças pagas */}
                        {isPaid && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleCreateRecurso(cobranca)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-medium px-4 py-2.5"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Iniciar Recurso
                          </Button>
                        )}
                        
                        {/* Link de pagamento - apenas para cobranças pendentes */}
                        {!isPaid && cobranca.payment_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(cobranca.payment_url, '_blank')}
                            className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 shadow-md hover:shadow-lg transition-all duration-200 font-medium px-4 py-2.5"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Abrir Pagamento
                          </Button>
                        )}
                        
                        {/* Botão Copiar PIX - apenas para cobranças pendentes */}
                        {!isPaid && cobranca.pix_copy_paste && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(cobranca.pix_copy_paste);
                              toast.success('Código PIX copiado!');
                            }}
                            className="bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200 hover:border-purple-300 text-purple-700 hover:text-purple-800 shadow-md hover:shadow-lg transition-all duration-200 font-medium px-4 py-2.5"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar PIX
                          </Button>
                        )}
                        
                        {/* Indicador de pagamento realizado */}
                        {isPaid && (
                          <div className="flex items-center bg-green-100/80 text-green-700 px-4 py-2.5 rounded-xl font-semibold shadow-md border border-green-200/50">
                            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                            <span>Pagamento Confirmado</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
              
              {/* Componente de Paginação */}
              {totalPages > 1 && (
              <div className="mt-8 space-y-4">
                {/* Indicadores de página */}
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Página {currentPage} de {totalPages}</span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full" />
                    <span>Mostrando {startIndex + 1}-{Math.min(endIndex, totalItems)} de {totalItems} resultados</span>
                  </div>
                </div>
                
                {/* Controles de navegação */}
                <div className="flex justify-center items-center gap-2">
                  {/* Botão Primeira Página */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium"
                  >
                    ««
                  </Button>
                  
                  {/* Botão Página Anterior */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium"
                  >
                    « Anterior
                  </Button>
                  
                  {/* Números das páginas */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`w-10 h-10 p-0 text-sm font-medium ${
                            currentPage === pageNumber 
                              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                              : 'hover:bg-blue-50 hover:border-blue-300'
                          }`}
                        >
                          {pageNumber}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {/* Botão Próxima Página */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium"
                  >
                    Próxima »
                  </Button>
                  
                  {/* Botão Última Página */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium"
                  >
                    »»
                  </Button>
                </div>
               </div>
                )}
             </>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando serviços...</p>
          </div>
        </div>
      </div>
    );
  }

  const normalizedQuery = clientQuery.trim().toLowerCase();
  const digitsQuery = clientQuery.replace(/\D/g, '');
  const filteredClients = (normalizedQuery === '' && digitsQuery === '')
    ? clients
    : clients.filter((c) => {
        const nomeMatch = c.nome?.toLowerCase().includes(normalizedQuery);
        const cpfCnpjDigits = (c.cpf_cnpj || '').replace(/\D/g, '');
        const cpfMatch = digitsQuery !== '' ? cpfCnpjDigits.includes(digitsQuery) : false;
        return nomeMatch || cpfMatch;
      });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Meus Serviços</h1>
          <button
            onClick={() => setShowNovoClienteModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
        <p className="text-gray-600">
          Crie cobranças para recursos de multa e gerencie suas cobranças existentes.
        </p>
        {services.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            📊 {services.length} serviços disponíveis
          </p>
        )}
      </div>

      {/* Navegação por Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="criar">Criar Cobrança</TabsTrigger>
          <TabsTrigger value="listar">
            Minhas Cobranças ({cobrancas.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="criar">
          {/* Seção de Criação de Cobranças */}
          <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Criar Cobrança - Recurso de Multa
          </CardTitle>
          <CardDescription>
            Selecione o tipo de multa e defina o valor para criar uma cobrança PIX
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seleção de Cliente */}
          <div className="space-y-2">
            <Label htmlFor="client-select">Cliente *</Label>
            <div className="relative">
              <div className="flex gap-2">
                <Input
                  id="client-select"
                  placeholder="Digite nome ou CPF/CNPJ"
                  value={clientQuery}
                  onChange={(e) => { setClientQuery(e.target.value); setShowClientList(true); }}
                  onFocus={() => setShowClientList(true)}
                />
                {selectedClient && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    onClick={() => { setSelectedClient(null); setClientQuery(''); }}
                  >Limpar</Button>
                )}
              </div>

              {showClientList && (
                <div className="absolute mt-2 w-full max-h-56 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg z-10">
                  {filteredClients.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">Nenhum cliente encontrado</div>
                  ) : (
                    filteredClients.map((client) => (
                      <button
                        type="button"
                        key={client.id}
                        onClick={() => {
                          setSelectedClient(client);
                          setClientQuery(`${client.nome} - ${client.cpf_cnpj}`);
                          setShowClientList(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{client.nome}</span>
                          <span className="text-xs text-gray-500">{client.cpf_cnpj}</span>
                        </div>
                        {client.email && (
                          <div className="text-xs text-gray-500">{client.email}</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            
            {/* Feedback Visual do Cliente Selecionado */}
            {selectedClient && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-800">{selectedClient.nome}</h4>
                    <p className="text-sm text-green-600">CPF/CNPJ: {selectedClient.cpf_cnpj}</p>
                    {selectedClient.email && (
                      <p className="text-sm text-green-600">Email: {selectedClient.email}</p>
                    )}
                    {selectedClient.telefone && (
                      <p className="text-sm text-green-600">Telefone: {selectedClient.telefone}</p>
                    )}
                  </div>
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-1" />
                    <span className="text-sm font-medium">Selecionado</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Grid de Tipos de Multa */}
          {selectedClient && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Tipo de Multa</Label>

              </div>
              {loadingMultaTypes ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Carregando tipos de multa...</p>
                </div>
              ) : multaTypes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum tipo de multa configurado.</p>
                  <p className="text-sm text-gray-400 mt-2">Verifique se há tipos de multa ativos no sistema.</p>
                  <Button 
                    onClick={loadMultaTypes}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    🔄 Recarregar Tipos
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {multaTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedMultaType === type.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                    onClick={() => handleSelectMultaType(type)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-gray-900">{type.name}</h4>
                      <Badge
                        variant="secondary"
                        className={`${
                          (type.severity || 'default') === 'leve'
                            ? 'bg-green-100 text-green-800'
                            : (type.severity || 'default') === 'media'
                            ? 'bg-yellow-100 text-yellow-800'
                            : (type.severity || 'default') === 'grave'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {(type.severity || 'N/A').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Valor Sugerido:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(type.suggested_price || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                         <span className="text-gray-600">Custo Mínimo:</span>
                         <span className="font-medium text-red-600">
                           {formatCurrency(type.total_price || 0)}
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-600">Margem:</span>
                         <span className="font-medium text-blue-600">
                           {calculateMargin(type.suggested_price || 0, type.total_price || 0).toFixed(1)}%
                         </span>
                       </div>
                    </div>

                    {selectedMultaType === type.type && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <Label className="text-sm font-medium">💰 Valor da Cobrança</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                             type="number"
                             min={custoMinimo || 0}
                             step="0.01"
                             value={customAmount || 0}
                             onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
                             className={`flex-1 ${
                               customAmount < custoMinimo ? 'border-red-500' : ''
                             }`}
                             placeholder={`Mínimo: R$ ${custoMinimo.toFixed(2)}`}
                           />
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseSuggested(type);
                            }}
                          >Usar Sugerido</Button>
                        </div>

                        {/* Preview de Splits em Tempo Real - apenas para superadmins */}
                        {serviceSplitConfig && customAmount > 0 && user?.role === 'Superadmin' && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">📊 Preview de Splits:</span>
                              <span className={`text-sm font-bold ${
                                margemDespachante > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                Sua margem: R$ {margemDespachante.toFixed(2)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>ACSM:</span>
                                <span>R$ {serviceSplitConfig.acsm_value.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>ICETRAN:</span>
                                <span>R$ {serviceSplitConfig.icetran_value.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Taxa:</span>
                                <span>R$ {serviceSplitConfig.taxa_cobranca.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Despachante:</span>
                                <span className={margemDespachante > 0 ? 'text-green-600' : 'text-red-600'}>
                                  R$ {margemDespachante.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Validação de Valor Mínimo */}
                        {customAmount < custoMinimo && (
                           <div className="text-red-600 text-sm mt-2 flex items-center">
                             <AlertCircle className="h-4 w-4 mr-1" />
                             ⚠️ Valor deve ser no mínimo R$ {custoMinimo.toFixed(2)}
                           </div>
                         )}

                        {/* Informações de Custo removidas */}
                      </div>
                    )}
                  </div>
                ))}
                </div>
              )}
            </div>
          )}

          {/* Botão de Criar Cobrança */}
          {selectedMultaType && (
            <div className="flex justify-end">
              <Button
                onClick={createServiceOrder}
                disabled={!selectedClient || !selectedMultaType || creatingPayment || (!import.meta.env.DEV && (customAmount < custoMinimo))}
                className="min-w-[220px] bg-violet-600 hover:bg-violet-700 text-white shadow-lg focus:outline-none focus:ring-4 focus:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                {creatingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Criando...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Criar Cobrança - {formatCurrency(customAmount || getSelectedType()?.suggested_price || 0)}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
        
        <TabsContent value="listar">
          <CobrancasList />
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes da Cobrança usando CobrancaDetalhes */}
      {paymentResult && (
        <CobrancaDetalhes
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          cobranca={convertToCobranca(paymentResult)}
          onResend={async (cobranca) => {
            // Implementar reenvio se necessário
            toast.success('Cobrança reenviada!');
          }}
          onCancel={async (cobranca) => {
            // Implementar cancelamento se necessário
            toast.success('Cobrança cancelada!');
          }}
          onUpdate={() => {
            // Atualizar lista de cobranças
            loadCobrancas();
          }}
        />
      )}



      {/* Seção de Configuração de Preços removida - não deve ser exibida para despachantes */}
      
      {/* Modal de Novo Cliente */}
      {showNovoClienteModal && (
        <ClienteModal
          isOpen={showNovoClienteModal}
          onClose={() => setShowNovoClienteModal(false)}
          onSave={handleSalvarNovoCliente}
        />
      )}
    </div>
  );
};

export default MeusServicos;