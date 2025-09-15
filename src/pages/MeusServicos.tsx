import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, DollarSign, Calculator, Save, CheckCircle, Plus, FileText, QrCode, Copy, Eye, ExternalLink, RefreshCw, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { CobrancaDetalhes } from '@/components/CobrancaDetalhes';

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
  email?: string;
  telefone?: string;
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
    };
  };
  processed_data?: {
    customer_name?: string;
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
  console.log('🚀 === COMPONENTE MEUSSERVICOS RENDERIZADO ===');
  
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceWithPricing[]>([]);
  const [loading, setLoading] = useState(true);
  
  console.log('👤 User no MeusServicos:', user);
  console.log('🏢 Company ID:', user?.company_id);
  
  // Estados para criação de cobranças
  const [clients, setClients] = useState<Client[]>([]);
  const [multaTypes, setMultaTypes] = useState<MultaType[]>([]);
  const [loadingMultaTypes, setLoadingMultaTypes] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
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

  useEffect(() => {
    console.log('🔄 === USEEFFECT PRINCIPAL EXECUTADO ===');
    console.log('  - User existe:', !!user);
    console.log('  - User company_id:', user?.company_id);
    
    if (user) {
      console.log('✅ Usuário encontrado, carregando dados...');
      loadServices();
      loadClients();
      loadMultaTypes();
      loadCobrancas();
      loadServiceSplitConfig();
      testBackendConnection();
    } else {
      console.log('❌ Usuário não encontrado, não carregando dados');
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
        .select('id, nome, cpf_cnpj, email, telefone')
        .eq('company_id', user?.company_id)
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
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
        console.warn('⚠️ Configuração de splits não encontrada, usando valores padrão');
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
      
      console.log('💰 Configuração de splits aplicada:', {
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
      console.error('❌ Erro ao carregar configuração de splits:', error);
      toast.error('Erro ao carregar configuração de preços');
    }
  };

  // Calcular margem em tempo real
  useEffect(() => {
    if (custoMinimo > 0 && customAmount > 0) {
      const margem = Math.max(0, customAmount - custoMinimo);
      setMargemDespachante(margem);
      console.log('💰 Cálculo de margem:', {
        valorCobranca: customAmount,
        custoMinimo,
        margemDespachante: margem
      });
    }
  }, [customAmount, custoMinimo]);

  const loadCobrancas = async (forceRefresh = false) => {
    console.log('\n🔄 === INICIANDO LOADCOBRANCAS ===');
    console.log('  - forceRefresh:', forceRefresh);
    console.log('  - loadingCobrancas atual:', loadingCobrancas);
    console.log('  - user?.company_id:', user?.company_id);
    
    if (loadingCobrancas && !forceRefresh) {
      console.log('⏸️ Já está carregando, pulando...');
      return;
    }
    
    if (!user?.company_id) {
      console.warn('⚠️ Company ID não disponível, não pode carregar cobranças');
      return;
    }
    
    setLoadingCobrancas(true);
    try {
      console.log('🔄 Carregando cobranças da empresa:', user?.company_id);
      
      const url = `/api/payments/company/${user?.company_id}`;
      const token = localStorage.getItem('token');
      
      console.log('📡 Fazendo requisição:');
      console.log('  - URL:', url);
      console.log('  - Token disponível:', !!token);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Resposta recebida:');
      console.log('  - Status:', response.status);
      console.log('  - OK:', response.ok);
      console.log('  - StatusText:', response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📋 Cobranças recebidas (JSON parseado):');
        console.log('  - Success:', result.success);
        console.log('  - Total:', result.total);
        console.log('  - Payments array:', result.payments);
        console.log('  - Payments length:', result.payments?.length);
        
        if (result.success && Array.isArray(result.payments)) {
          console.log('✅ Definindo cobranças no estado:', result.payments);
          setCobrancas(result.payments);
          console.log(`✅ ${result.payments.length} cobranças carregadas com sucesso`);
        } else {
          console.warn('⚠️ Resposta inválida:', result);
          setCobrancas([]);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Erro HTTP:', response.status, response.statusText);
        console.error('❌ Erro body:', errorText);
        toast.error(`Erro ao carregar cobranças: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar cobranças:', error);
      console.error('❌ Stack trace:', error.stack);
      toast.error('Erro de conexão ao carregar cobranças');
    } finally {
      setLoadingCobrancas(false);
      console.log('🏁 LoadCobrancas finalizado');
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
      console.log('🔄 === INICIANDO SINCRONIZAÇÃO COM ASAAS ===');
      console.log('Company ID:', user.company_id);
      
      const response = await fetch(`/api/payments/sync/${user.company_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Sincronização concluída:', result);
        
        if (result.synced > 0) {
          toast.success(`${result.synced} cobranças sincronizadas com sucesso!`);
        } else {
          toast.info('Nenhuma cobrança nova encontrada no Asaas');
        }
        
        // Recarregar lista de cobranças após sincronização
        await loadCobrancas(true);
      } else {
        console.error('❌ Erro na sincronização:', result);
        toast.error(result.error || 'Erro ao sincronizar com Asaas');
      }
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
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
      console.log('🔄 === SINCRONIZAÇÃO FORÇADA ===');
      console.log('Payment ID:', paymentId);
      console.log('Company ID:', user.company_id);
      
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
        console.log('✅ Sincronização forçada concluída:', result);
        toast.success('Cobrança sincronizada com sucesso!');
        
        // Recarregar lista de cobranças
        await loadCobrancas(true);
      } else {
        console.error('❌ Erro na sincronização forçada:', result);
        toast.error(result.error || 'Erro ao sincronizar cobrança');
      }
    } catch (error) {
      console.error('❌ Erro na sincronização forçada:', error);
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
      console.log('🧪 === TESTE DE CONEXÃO ASAAS ===');
      
      const response = await fetch(`/api/force-sync/test/${user.company_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Teste de conexão bem-sucedido:', result);
        toast.success(`Conexão OK! ${result.asaas_data.total_payments} cobranças no Asaas`);
      } else {
        console.error('❌ Erro no teste:', result);
        toast.error(result.error || 'Erro ao testar conexão');
      }
    } catch (error) {
      console.error('❌ Erro no teste:', error);
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
        console.error('❌ Erro ao carregar serviços:', error);
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
        suggested_price: service.base_price || 0,
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
        toast.success(`${multaTypesFromServices.length} tipos de multa carregados`);
      }
    } catch (error) {
      console.error('💥 Erro ao carregar serviços de multa:', error);
      setMultaTypes([]);
      toast.error(`Erro ao carregar serviços: ${error.message}`);
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

      // Construir payload para nova API simplificada
      const requestBody = {
        customer_id: selectedClient.id,
        service_id: selectedType.id, // ID do serviço específico selecionado
        company_id: user?.company_id,
        valor_cobranca: customAmount // Valor total que o despachante quer cobrar
      };
      
      console.log('📋 Dados do serviço:', {
        service_id: selectedType.id,
        service_name: selectedType.name,
        tipo_multa: selectedType.type,
        valor_cobranca: customAmount,
        custo_minimo: selectedType.total_price
      });
      
      console.log('\n📦 PAYLOAD COMPLETO:');
      console.log('=====================================');
      console.log(JSON.stringify(requestBody, null, 2));
      console.log('=====================================');
      
      console.log('\n📊 ANÁLISE DO PAYLOAD:');
      console.log('  - Tamanho do JSON:', JSON.stringify(requestBody).length, 'bytes');
      console.log('  - Propriedades:', Object.keys(requestBody).length);
      console.log('  - Tipos de dados:');
      Object.entries(requestBody).forEach(([key, value]) => {
        console.log(`    ${key}: ${typeof value} = ${value}`);
      });

      console.log('\n📦 PAYLOAD COMPLETO:');
      console.log('=====================================');
      console.log(JSON.stringify(requestBody, null, 2));
      console.log('=====================================');
      
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(requestBody)
      };
      
      console.log('\n🌐 CONFIGURAÇÃO DA REQUISIÇÃO:');
      console.log('  - URL:', '/api/payments/create-service-order');
      console.log('  - Method:', requestOptions.method);
      console.log('  - Headers:', requestOptions.headers);
      console.log('  - Body size:', requestOptions.body.length, 'bytes');
      
      console.log('\n🚀 ENVIANDO REQUISIÇÃO...');
      const startTime = Date.now();
      
      const response = await fetch('/api/payments/create-service-order', requestOptions);
      
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
      
      // Verificar content-type
      const contentType = response.headers.get('content-type');
      console.log('\n🔍 ANÁLISE DO CONTENT-TYPE:');
      console.log('  - Content-Type:', contentType);
      console.log('  - É JSON?', contentType && contentType.includes('application/json'));
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ ERRO: Resposta não é JSON válido');
        console.log('  - Content-Type esperado: application/json');
        console.log('  - Content-Type recebido:', contentType);
        
        // Tentar ler como texto para ver o que foi retornado
        const responseText = await response.text();
        console.log('\n📄 CONTEÚDO DA RESPOSTA (como texto):');
        console.log('=====================================');
        console.log(responseText);
        console.log('=====================================');
        
        throw new Error('Servidor retornou resposta inválida (não JSON)');
      }
      
      // Ler como texto primeiro
      const responseText = await response.text();
      console.log('\n📄 RESPOSTA BRUTA:');
      console.log('  - Tamanho:', responseText.length, 'bytes');
      console.log('  - Vazio?', responseText.trim() === '');
      console.log('  - Conteúdo:');
      console.log('=====================================');
      console.log(responseText);
      console.log('=====================================');
      
      if (!responseText || responseText.trim() === '') {
        console.error('❌ ERRO: Resposta vazia da API');
        throw new Error('Servidor retornou resposta vazia');
      }
      
      // Tentar parsear JSON
      let result: PaymentResponse;
      try {
        result = JSON.parse(responseText);
        console.log('\n✅ JSON PARSEADO COM SUCESSO:');
        console.log('=====================================');
        console.log(JSON.stringify(result, null, 2));
        console.log('=====================================');
      } catch (parseError) {
        console.error('❌ ERRO AO PARSEAR JSON:', parseError);
        console.log('  - Erro:', parseError.message);
        console.log('  - Posição:', parseError.stack);
        console.log('  - Texto que causou erro:');
        console.log('=====================================');
        console.log(responseText);
        console.log('=====================================');
        throw new Error('Resposta do servidor não é um JSON válido');
      }
      
      if (!response.ok) {
        console.error('❌ ERRO HTTP:', response.status, response.statusText);
        console.log('  - Erro retornado:', result.error);
        throw new Error(result.error || `Erro HTTP ${response.status}`);
      }

      if (result.success) {
        console.log('\n🎉 COBRANÇA CRIADA COM SUCESSO!');
        console.log('  - Payment ID:', result.payment?.id);
        console.log('  - Webhook ID:', result.payment?.webhook_id);
        console.log('  - Amount:', result.payment?.amount);
        console.log('  - QR Code disponível:', !!result.payment?.qr_code);
        console.log('  - PIX Code disponível:', !!result.payment?.pix_code);
        console.log('  - Webhook response:', result.payment?.webhook_response);
        
        // Criar objeto da nova cobrança com dados corretos da API
        const novaCobranca: PaymentResponse = {
          service_order_id: result.payment?.id,
          payment_id: result.payment?.webhook_id || result.payment?.id,
          asaas_payment_id: result.payment?.webhook_id,
          client_name: selectedClient.nome,
          customer_name: selectedClient.nome,
          amount: result.payment?.amount || customAmount,
          status: 'pending', // Status correto para cobrança recém-criada
          created_at: new Date().toISOString(),
          description: result.payment?.description || `${selectedType.name} - ${selectedClient.nome}`,
          payment_method: 'PIX',
          customer_id: selectedClient.id,
          qr_code: result.payment?.qr_code, // QR code do webhook
          pix_copy_paste: result.payment?.pix_code, // PIX copia e cola do webhook
          payment_url: result.payment?.webhook_response?.payment_url, // URL de pagamento se disponível
          multa_type: selectedType.name,
          due_date: result.payment?.due_date,
          success: true
        };
        
        // Adicionar à lista de cobranças (no início da lista)
        setCobrancas(prev => [novaCobranca, ...prev]);
        console.log('✅ Cobrança adicionada à lista local');
        
        // Verificar se temos dados completos, senão buscar do banco
        let cobrancaCompleta = novaCobranca;
        if (!novaCobranca.qr_code || !novaCobranca.pix_copy_paste) {
          console.log('⚠️ Dados incompletos, buscando dados atualizados...');
          try {
            // Aguardar um pouco para o webhook processar
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Buscar dados atualizados da cobrança
            const refreshResponse = await fetch(`/api/payments/company/${user?.company_id}`);
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              const cobrancaAtualizada = refreshData.data?.find(
                (p: any) => p.payment_id === novaCobranca.payment_id || p.id === novaCobranca.service_order_id
              );
              
              if (cobrancaAtualizada) {
                console.log('✅ Dados atualizados encontrados:', cobrancaAtualizada);
                cobrancaCompleta = {
                  ...novaCobranca,
                  qr_code: cobrancaAtualizada.qr_code || novaCobranca.qr_code,
                  pix_copy_paste: cobrancaAtualizada.pix_copy_paste || novaCobranca.pix_copy_paste,
                  payment_url: cobrancaAtualizada.payment_url || novaCobranca.payment_url,
                  status: cobrancaAtualizada.status || novaCobranca.status
                };
              }
            }
          } catch (error) {
            console.warn('⚠️ Erro ao buscar dados atualizados:', error);
            // Continuar com os dados originais
          }
        }
        
        setPaymentResult(cobrancaCompleta);
        setShowPaymentModal(true);
        setSelectedClient(null);
        setSelectedMultaType('');
        setCustomAmount(0);
        toast.success('Cobrança criada com sucesso!');
      } else {
        console.error('❌ ERRO: Success = false');
        console.log('  - Resultado:', result);
        throw new Error(result.error || 'Erro desconhecido ao criar cobrança');
      }
    } catch (error) {
      console.error('\n💥 ERRO GERAL:', error);
      console.log('  - Tipo:', error.constructor.name);
      console.log('  - Mensagem:', error.message);
      console.log('  - Stack:', error.stack);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao criar cobrança: ${errorMessage}`);
    } finally {
      setCreatingPayment(false);
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
      
      const response = await fetch('https://webhookn8n.synsoft.com.br/webhook/d37fac6e-9379-4bca-b015-9c56b104cae1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      console.log('\n🔗 TESTANDO CONEXÃO COM BACKEND...');
      const response = await fetch('/api/health');
      console.log('  - Status:', response.status);
      console.log('  - Backend conectado:', response.ok);
      
      if (response.ok) {
        const data = await response.text();
        console.log('  - Resposta:', data);
        toast.success('Backend conectado!');
      } else {
        console.error('❌ Backend não está respondendo corretamente');
        toast.error('Backend não está funcionando');
      }
    } catch (error) {
      console.error('❌ BACKEND NÃO ESTÁ RODANDO:', error);
      console.log('  - Verifique se o proxy-server.js está ativo na porta 3001');
      toast.error('Backend não está rodando');
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
      // Navegar para página de criação de recurso com dados do pagamento
      const recursoData = {
        payment_id: cobranca.payment_id,
        multa_type: cobranca.multa_type,
        amount_paid: cobranca.amount,
        client_name: cobranca.client_name
      };
      
      console.log('💾 Salvando dados do recurso no localStorage:', recursoData);
      
      // Salvar dados no localStorage para usar na página de recurso
      localStorage.setItem('recurso_payment_data', JSON.stringify(recursoData));
      
      console.log('🔄 Navegando para /recursos/novo');
      
      // Navegar para página de novo recurso (rota correta)
      navigate('/recursos/novo');
      
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
    
    // Calcular custo mínimo baseado nos valores reais do serviço
    const custoMinimoReal = splitConfigFromService.acsm_value + splitConfigFromService.icetran_value + splitConfigFromService.taxa_cobranca;
    setCustoMinimo(custoMinimoReal);
    
    // Definir valor inicial baseado no custo mínimo real
    const valorInicial = Math.max(custoMinimoReal, type.suggested_price || 0);
    setCustomAmount(valorInicial);
    setIsEditingAmount(false);
    
    console.log('💰 Configuração atualizada para tipo selecionado:', {
      tipoMulta: type.name,
      acsm_value: splitConfigFromService.acsm_value,
      icetran_value: splitConfigFromService.icetran_value,
      taxa_cobranca: splitConfigFromService.taxa_cobranca,
      custoMinimoReal,
      valorSugerido: type.suggested_price,
      valorInicial
    });
  };
  
  const handleUseSuggested = (type: MultaType) => {
    console.log('Usando valor sugerido para:', type.name, 'Valor:', type.suggested_price);
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
    console.log('🔄 === CARREGANDO SERVIÇOS ===');
    console.log('  - forceRefresh:', forceRefresh);
    console.log('  - user?.id:', user?.id);
    
    try {
      setLoading(true);

      // Buscar serviços com suas configurações de split (com cache busting se necessário)
      const query = supabase
        .from('services')
        .select(`
          *,
          split_configurations(*)
        `)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });
      
      // Se forceRefresh, adicionar timestamp para evitar cache
      if (forceRefresh) {
        console.log('🔄 Forçando refresh com timestamp:', Date.now());
      }
      
      const { data: servicesData, error: servicesError } = await query;

      if (servicesError) {
        console.error('❌ Erro ao buscar serviços:', servicesError);
        throw servicesError;
      }
      
      console.log('📋 Serviços encontrados:', servicesData?.length || 0);
      servicesData?.forEach((service, i) => {
        console.log(`  ${i+1}. ${service.name} - ACSM: R$${service.acsm_value} - Sugerido: R$${service.suggested_price}`);
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
        toast.success(`${servicesWithPricing.length} serviços atualizados!`);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar serviços:', error);
      toast.error('Erro ao carregar serviços');
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
    
    const filteredCobranças = cobrancas.filter(cobranca => {
      if (filter === 'pending') return ['PENDING', 'AWAITING_PAYMENT', 'pending'].includes(cobranca.status || '');
      if (filter === 'paid') return ['RECEIVED', 'CONFIRMED', 'confirmed', 'paid'].includes(cobranca.status || '');
      return true;
    });
    
    console.log('  - Cobranças filtradas:', filteredCobranças.length);
    console.log('  - Cobranças filtradas array:', filteredCobranças);
    
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
                Pendentes ({cobrancas.filter(c => ['PENDING', 'AWAITING_PAYMENT', 'pending'].includes(c.status || '')).length})
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
        
        <CardContent>
          {loadingCobrancas ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Carregando cobranças...</p>
            </div>
          ) : filteredCobranças.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma cobrança encontrada</p>
              {filter !== 'all' && (
                <Button
                  variant="link"
                  onClick={() => setFilter('all')}
                  className="mt-2"
                >
                  Ver todas as cobranças
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCobranças.map((cobranca, index) => {
                const isPaid = ['RECEIVED', 'CONFIRMED', 'confirmed', 'paid'].includes(cobranca.status?.toUpperCase() || '');
                
                return (
                  <div
                    key={cobranca.payment_id || index}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {getClientDisplay(cobranca)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Multa {cobranca.multa_type} • ID: {cobranca.payment_id}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Criado: {new Date(cobranca.created_at).toLocaleString('pt-BR')}
                          {isPaid && cobranca.paid_at && (
                            <> • Pago: {new Date(cobranca.paid_at).toLocaleString('pt-BR')}</>
                          )}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-green-600 text-lg">
                          {formatCurrency(cobranca.amount)}
                        </p>
                        <Badge 
                          variant={getStatusVariant(cobranca.status)}
                          className="text-xs mt-1"
                        >
                          {getStatusLabel(cobranca.status)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3 flex-wrap">
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
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      
                      {/* Botão Criar Recurso - apenas para cobranças pagas */}
                      {isPaid && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleCreateRecurso(cobranca)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Criar Recurso
                        </Button>
                      )}
                      
                      {/* Link de pagamento - apenas para cobranças pendentes */}
                      {!isPaid && cobranca.payment_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(cobranca.payment_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
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
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar PIX
                        </Button>
                      )}
                      
                      {/* Indicador de status para cobranças pendentes */}
                      {!isPaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          title="Aguardando confirmação do pagamento"
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Aguardando Pagamento
                        </Button>
                      )}
                      
                      {/* Indicador de pagamento realizado */}
                      {isPaid && (
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="font-medium">Pagamento Confirmado</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Meus Serviços</h1>
          <Button
            onClick={refreshServices}
            variant="outline"
            size="sm"
            disabled={loading}
            className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Carregando...' : 'Atualizar Serviços'}
          </Button>
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
            <Select 
              value={selectedClient?.id || ''} 
              onValueChange={(clientId) => {
                const client = clients.find(c => c.id === clientId);
                console.log('Cliente selecionado:', client);
                setSelectedClient(client || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nome} - {client.cpf_cnpj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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
                <Button 
                   onClick={() => {
                     console.log('=== DEBUG TIPOS DE MULTA ===');
                     console.log('User:', user);
                     console.log('Company ID:', user?.company_id);
                     console.log('User ID:', user?.id);
                     console.log('Tipos carregados:', multaTypes);
                     console.log('Loading state:', loadingMultaTypes);
                     console.log('Token:', localStorage.getItem('token'));
                     console.log('Recarregando tipos de multa...');
                     loadMultaTypes();
                   }}
                   variant="outline"
                   size="sm"
                 >
                   🔍 Debug Tipos ({multaTypes.length})
                 </Button>
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
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseSuggested(type);
                            }}
                          >
                            Usar Sugerido
                          </Button>
                        </div>

                        {/* Preview de Splits em Tempo Real */}
                        {serviceSplitConfig && customAmount > 0 && (
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

                        {/* Informações de Custo */}
                        {custoMinimo > 0 && (
                          <div className="text-xs text-gray-500 mt-2">
                            💡 Custo mínimo: R$ {custoMinimo.toFixed(2)} | 
                            Qualquer valor acima será sua margem de lucro
                          </div>
                        )}
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
                disabled={!selectedClient || !selectedMultaType || creatingPayment || (customAmount < custoMinimo)}
                className="min-w-[200px]"
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
    </div>
  );
};

export default MeusServicos;