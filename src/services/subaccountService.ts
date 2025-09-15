import { supabase } from '@/lib/supabase';

export interface AsaasSubaccount {
  id?: string;
  company_id: string;
  asaas_account_id: string;
  wallet_id: string;
  account_type: 'subadquirente' | 'despachante';
  status: 'active' | 'inactive' | 'suspended';
  api_key?: string;
  webhook_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubaccountCreateData {
  name: string;
  email: string;
  cpfCnpj: string;
  birthDate: string;
  mobilePhone?: string;
  address?: {
    postalCode: string;
    address: string;
    addressNumber: string;
    province: string;
    city: string;
    state: string;
  };
  companyType?: string;
  phone?: string;
  site?: string;
}

export interface AsaasSubaccountResponse {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  walletId: string;
  apiKey?: string;
  status: string;
}

export interface SubaccountDetails {
  subaccount: AsaasSubaccount;
  accountInfo: any;
  balance: number;
  recentPayments: any[];
  recentSplits: any[];
}

export interface SubaccountStats {
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  totalReceived: number;
  totalPending: number;
  conversionRate: number;
}

export interface SubaccountTransaction {
  id: string;
  type: 'split_received' | 'payment_received' | 'transfer_sent';
  description: string;
  amount: number;
  status: string;
  date: string;
  reference?: string;
}

export interface ApiKeyTestResult {
  isValid: boolean;
  status: 'success' | 'error' | 'unauthorized' | 'network_error';
  message: string;
  testedAt: string;
  responseTime?: number;
}

interface AsaasConfig {
  id?: string;
  environment: 'sandbox' | 'production';
  api_key_sandbox?: string;
  api_key_production?: string;
  webhook_url?: string;
  created_at?: string;
  updated_at?: string;
}

class SubaccountService {
  private config: AsaasConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('asaas_config')
        .select('*')
        .single();

      if (error) {
        console.warn('⚠️  Configuração do Asaas não encontrada no banco:', error.message);
        return;
      }

      this.config = data;
      console.log('✅ Configuração do Asaas carregada:', { environment: data.environment });
    } catch (error) {
      console.error('❌ Erro ao carregar configuração do Asaas:', error);
    }
  }

  private getAsaasBaseUrl(): string {
    // Usar proxy local para resolver problemas de CORS (igual ao asaasService)
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    return `${baseUrl}/api/asaas-proxy`;
  }

  private async getAsaasHeaders(): Promise<Record<string, string>> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config) {
      throw new Error('Configuração do Asaas não encontrada');
    }

    console.log('🔧 Configuração carregada:', {
      environment: this.config.environment,
      has_sandbox_key: !!this.config.api_key_sandbox,
      has_production_key: !!this.config.api_key_production
    });

    const apiKey = this.config.environment === 'production'
      ? this.config.api_key_production
      : this.config.api_key_sandbox;

    console.log('🔑 Chave API selecionada:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NENHUMA');

    if (!apiKey) {
      throw new Error(`Chave API do Asaas não configurada para o ambiente ${this.config.environment}`);
    }

    return {
      'Content-Type': 'application/json',
      'access_token': apiKey
    };
  }

  /**
   * Criar subconta no Asaas quando empresa é criada
   */
  async createSubaccount(companyId: string, subaccountData: SubaccountCreateData): Promise<AsaasSubaccount> {
    try {
      // 1. Criar subconta via API Asaas
      const asaasResponse = await this.createAsaasSubaccount(subaccountData);
      console.log('📋 Dados recebidos do Asaas:', {
        id: asaasResponse.id,
        walletId: asaasResponse.walletId,
        apiKey: asaasResponse.apiKey ? `${asaasResponse.apiKey.substring(0, 10)}...` : 'AUSENTE'
      });
      
      // 2. Determinar tipo de conta baseado na hierarquia
      const accountType = await this.determineAccountType(companyId);
      
      // 3. Preparar dados para salvar no banco
      const dataToSave = {
        company_id: companyId,
        asaas_account_id: asaasResponse.id,
        wallet_id: asaasResponse.walletId,
        account_type: accountType,
        status: 'active' as const,
        api_key: asaasResponse.apiKey
      };
      
      console.log('💾 Salvando no banco:', {
        ...dataToSave,
        api_key: dataToSave.api_key ? `${dataToSave.api_key.substring(0, 10)}...` : 'AUSENTE'
      });
      
      // 4. Salvar dados da subconta no banco
       const subaccount = await this.saveSubaccountToDatabase(dataToSave);
       
       console.log('✅ Subconta salva no banco:', {
         id: subaccount.id,
         asaas_account_id: subaccount.asaas_account_id,
         wallet_id: subaccount.wallet_id,
         api_key_saved: subaccount.api_key ? 'SIM' : 'NÃO'
       });
       
       // 5. Atualizar empresa com referência da subconta
       await this.linkCompanyToSubaccount(companyId, subaccount.id!);
       
       return subaccount;
    } catch (error) {
      console.error('Erro ao criar subconta:', error);
      throw new Error(`Falha ao criar subconta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Criar subconta via API Asaas
   */
  private async createAsaasSubaccount(data: SubaccountCreateData): Promise<AsaasSubaccountResponse> {
    // Payload mínimo obrigatório conforme documentação Asaas
    const payload = {
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj,
      birthDate: data.birthDate, // Campo obrigatório
      // Campos obrigatórios adicionais
      companyType: data.companyType || 'MEI',
      incomeValue: 5000, // Valor obrigatório desde 30/05/24
      // Campos opcionais
      ...(data.mobilePhone && { mobilePhone: data.mobilePhone }),
      ...(data.phone && { phone: data.phone }),
      ...(data.address && { address: data.address }),
      ...(data.site && { site: data.site })
    };

    console.log('🔄 Criando subconta no Asaas:', { 
      name: payload.name, 
      email: payload.email, 
      cpfCnpj: payload.cpfCnpj,
      birthDate: payload.birthDate 
    });

    // Usar o mesmo padrão do asaasService com proxy
    const headers = await this.getAsaasHeaders();
    const response = await fetch(`${this.getAsaasBaseUrl()}/accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erro na API Asaas:', { status: response.status, statusText: response.statusText, errorData });
      
      // Extrair mensagem de erro específica da API Asaas
      let errorMessage = response.statusText;
      if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        const firstError = errorData.errors[0];
        if (firstError.description) {
          errorMessage = firstError.description;
        }
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ Subconta criada no Asaas - Response completo:', result);
    console.log('🔑 API Key retornada:', result.apiKey ? 'SIM' : 'NÃO');
    
    // Verificar se a API key foi retornada
    if (!result.apiKey) {
      console.warn('⚠️  API Key não foi retornada na resposta do Asaas!');
    }
    
    return result;
  }

  /**
   * Determinar tipo de conta baseado na hierarquia
   */
  private async determineAccountType(companyId: string): Promise<'subadquirente' | 'despachante'> {
    const { data: company, error } = await supabase
      .from('companies')
      .select('company_level')
      .eq('id', companyId)
      .single();

    if (error) {
      console.warn('Erro ao buscar nível da empresa, assumindo despachante:', error);
      return 'despachante';
    }

    return company?.company_level === 'subadquirente' ? 'subadquirente' : 'despachante';
  }

  /**
   * Salvar subconta no banco de dados
   */
  private async saveSubaccountToDatabase(subaccountData: Omit<AsaasSubaccount, 'id'>): Promise<AsaasSubaccount> {
    const { data, error } = await supabase
      .from('asaas_subaccounts')
      .insert(subaccountData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao salvar subconta no banco: ${error.message}`);
    }

    return data;
  }

  /**
   * Vincular empresa à subconta (não é mais necessário - relacionamento via company_id na subconta)
   */
  private async linkCompanyToSubaccount(companyId: string, subaccountId: string): Promise<void> {
    // Relacionamento já estabelecido via company_id na tabela asaas_subaccounts
    // Não precisamos mais atualizar a tabela companies
    console.log(`✅ Empresa ${companyId} vinculada à subconta ${subaccountId} via company_id`);
  }

  /**
   * Buscar subconta por empresa
   */
  async getSubaccountByCompany(companyId: string): Promise<AsaasSubaccount | null> {
    const { data, error } = await supabase
      .from('asaas_subaccounts')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Não encontrado
      }
      throw new Error(`Erro ao buscar subconta: ${error.message}`);
    }

    return data;
  }

  /**
   * Listar todas as subcontas
   */
  async listSubaccounts(filters?: {
    account_type?: 'subadquirente' | 'despachante';
    status?: 'active' | 'inactive' | 'suspended';
  }): Promise<AsaasSubaccount[]> {
    try {
      let query = supabase
        .from('asaas_subaccounts')
        .select('*');

      if (filters?.account_type) {
        query = query.eq('account_type', filters.account_type);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        // Se a tabela não existir, retornar array vazio em vez de erro
        if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
          console.warn('⚠️  Tabela asaas_subaccounts não existe. Retornando lista vazia.');
          return [];
        }
        throw new Error(`Erro ao listar subcontas: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao listar subcontas:', error);
      return [];
    }
  }

  /**
   * Atualizar status da subconta
   */
  async updateSubaccountStatus(
    subaccountId: string, 
    status: 'active' | 'inactive' | 'suspended'
  ): Promise<void> {
    const { error } = await supabase
      .from('asaas_subaccounts')
      .update({ status })
      .eq('id', subaccountId);

    if (error) {
      throw new Error(`Erro ao atualizar status da subconta: ${error.message}`);
    }
  }

  /**
   * Buscar hierarquia da empresa (para splits)
   */
  async getCompanyHierarchy(companyId: string) {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        asaas_subaccounts(*),
        parent:companies!parent_company_id(
          *,
          asaas_subaccounts(*)
        )
      `)
      .eq('id', companyId)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar hierarquia da empresa: ${error.message}`);
    }

    return {
      despachante: {
        id: data.id,
        name: data.nome,
        wallet_id: data.asaas_subaccounts?.[0]?.wallet_id
      },
      icetran: {
        id: data.parent?.id,
        name: data.parent?.nome,
        wallet_id: data.parent?.asaas_subaccounts?.[0]?.wallet_id
      },
      acsm: {
        wallet_id: import.meta.env.VITE_ACSM_WALLET_ID // Configurado nas variáveis de ambiente
      }
    };
  }

  /**
   * Sincronizar subconta com Asaas (verificar status, dados, etc.)
   */
  async syncSubaccount(subaccountId: string): Promise<void> {
    try {
      const { data: subaccount, error } = await supabase
        .from('asaas_subaccounts')
        .select('*')
        .eq('id', subaccountId)
        .single();

      if (error) {
        throw new Error(`Subconta não encontrada: ${error.message}`);
      }

      // Buscar dados atualizados no Asaas usando proxy
      const headers = await this.getAsaasHeaders();
      const response = await fetch(`${this.getAsaasBaseUrl()}/accounts/${subaccount.asaas_account_id}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar dados da subconta no Asaas: ${response.statusText}`);
      }

      const asaasData = await response.json();

      // Atualizar dados locais se necessário
      const { error: updateError } = await supabase
        .from('asaas_subaccounts')
        .update({
          status: asaasData.status === 'ACTIVE' ? 'active' : 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', subaccountId);

      if (updateError) {
        throw new Error(`Erro ao atualizar subconta: ${updateError.message}`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar subconta:', error);
      throw error;
    }
  }

  /**
   * Buscar informações detalhadas da subconta usando sua própria API key
   */
  async getSubaccountDetails(companyId: string): Promise<SubaccountDetails | null> {
    try {
      // 1. Buscar subconta no banco
      const subaccount = await this.getSubaccountByCompany(companyId);
      if (!subaccount || !subaccount.api_key) {
        return null;
      }

      // 2. Usar a API key da subconta para buscar seus dados
      const headers = {
        'Content-Type': 'application/json',
        'access_token': subaccount.api_key
      };

      // 3. Buscar informações da conta
      const accountResponse = await fetch(`${this.getAsaasBaseUrl()}/myAccount`, {
        headers
      });

      if (!accountResponse.ok) {
        throw new Error(`Erro ao buscar dados da conta: ${accountResponse.statusText}`);
      }

      const accountData = await accountResponse.json();

      // 4. Buscar saldo da conta
      const balanceResponse = await fetch(`${this.getAsaasBaseUrl()}/finance/balance`, {
        headers
      });

      const balanceData = balanceResponse.ok ? await balanceResponse.json() : { balance: 0 };

      // 5. Buscar cobranças recentes
      const paymentsResponse = await fetch(`${this.getAsaasBaseUrl()}/payments?limit=10&offset=0`, {
        headers
      });

      const paymentsData = paymentsResponse.ok ? await paymentsResponse.json() : { data: [] };

      // 6. Buscar splits recebidos
      const splitsResponse = await fetch(`${this.getAsaasBaseUrl()}/transfers?limit=10&offset=0`, {
        headers
      });

      const splitsData = splitsResponse.ok ? await splitsResponse.json() : { data: [] };

      return {
        subaccount,
        accountInfo: accountData,
        balance: balanceData.balance || 0,
        recentPayments: paymentsData.data || [],
        recentSplits: splitsData.data || []
      };
    } catch (error) {
      console.error('Erro ao buscar detalhes da subconta:', error);
      throw error;
    }
  }

  /**
   * Buscar estatísticas da subconta
   */
  async getSubaccountStats(companyId: string): Promise<SubaccountStats | null> {
    try {
      const subaccount = await this.getSubaccountByCompany(companyId);
      if (!subaccount || !subaccount.api_key) {
        return null;
      }

      const headers = {
        'Content-Type': 'application/json',
        'access_token': subaccount.api_key
      };

      // Buscar estatísticas do mês atual
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const startDate = `${currentMonth}-01`;
      const endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

      // Cobranças do mês
      const paymentsResponse = await fetch(
        `${this.getAsaasBaseUrl()}/payments?dateCreated[ge]=${startDate}&dateCreated[le]=${endDate}&limit=100`,
        { headers }
      );

      const paymentsData = paymentsResponse.ok ? await paymentsResponse.json() : { data: [] };
      const payments = paymentsData.data || [];

      // Calcular estatísticas
      const totalPayments = payments.length;
      const paidPayments = payments.filter((p: any) => p.status === 'RECEIVED');
      const pendingPayments = payments.filter((p: any) => ['PENDING', 'CONFIRMED'].includes(p.status));
      const totalReceived = paidPayments.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
      const totalPending = pendingPayments.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

      return {
        totalPayments,
        paidPayments: paidPayments.length,
        pendingPayments: pendingPayments.length,
        totalReceived,
        totalPending,
        conversionRate: totalPayments > 0 ? (paidPayments.length / totalPayments) * 100 : 0
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas da subconta:', error);
      return null;
    }
  }

  /**
   * Buscar histórico de transações
   */
  async getSubaccountTransactions(companyId: string, limit = 20, offset = 0): Promise<SubaccountTransaction[]> {
    try {
      const subaccount = await this.getSubaccountByCompany(companyId);
      if (!subaccount || !subaccount.api_key) {
        return [];
      }

      const headers = {
        'Content-Type': 'application/json',
        'access_token': subaccount.api_key
      };

      // Buscar transferências (splits recebidos)
      const transfersResponse = await fetch(
        `${this.getAsaasBaseUrl()}/transfers?limit=${limit}&offset=${offset}`,
        { headers }
      );

      const transfersData = transfersResponse.ok ? await transfersResponse.json() : { data: [] };
      
      return (transfersData.data || []).map((transfer: any) => ({
        id: transfer.id,
        type: 'split_received',
        description: `Split recebido - ${transfer.description || 'Sem descrição'}`,
        amount: transfer.value,
        status: transfer.status,
        date: transfer.dateCreated,
        reference: transfer.externalReference
      }));
    } catch (error) {
      console.error('Erro ao buscar transações da subconta:', error);
      return [];
    }
  }

  /**
   * Testar se a API key da subconta está funcionando
   */
  async testSubaccountApiKey(companyId: string): Promise<ApiKeyTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧪 Testando API key da subconta:', { companyId });
      
      // 1. Buscar subconta no banco
      const subaccount = await this.getSubaccountByCompany(companyId);
      if (!subaccount || !subaccount.api_key) {
        console.log('❌ Subconta ou API key não encontrada:', {
          subaccount_found: !!subaccount,
          api_key_found: !!(subaccount?.api_key)
        });
        return {
          isValid: false,
          status: 'error',
          message: 'API key não encontrada para esta subconta',
          testedAt: new Date().toISOString()
        };
      }

      console.log('✅ Subconta encontrada:', {
        id: subaccount.id,
        asaas_account_id: subaccount.asaas_account_id,
        wallet_id: subaccount.wallet_id,
        api_key_preview: subaccount.api_key.substring(0, 15) + '...',
        account_type: subaccount.account_type,
        status: subaccount.status
      });

      // 2. Testar a API key fazendo uma chamada simples
      const headers = {
        'Content-Type': 'application/json',
        'access_token': subaccount.api_key
      };

      console.log('🔑 Fazendo chamada de teste com headers:', {
        url: `${this.getAsaasBaseUrl()}/myAccount`,
        api_key_preview: subaccount.api_key.substring(0, 15) + '...'
      });

      const response = await fetch(`${this.getAsaasBaseUrl()}/myAccount`, {
        headers
      });

      const responseTime = Date.now() - startTime;

      console.log('📡 Resposta da API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        responseTime: responseTime + 'ms'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Dados da conta retornados:', {
          id: data.id,
          name: data.name,
          email: data.email,
          cpfCnpj: data.cpfCnpj,
          accountType: data.accountType
        });
        
        return {
          isValid: true,
          status: 'success',
          message: `API key válida - Conta: ${data.name || 'N/A'}`,
          testedAt: new Date().toISOString(),
          responseTime
        };
      } else if (response.status === 401 || response.status === 403) {
        const errorData = await response.text();
        console.log('❌ Erro de autorização:', { status: response.status, error: errorData });
        
        return {
          isValid: false,
          status: 'unauthorized',
          message: 'API key inválida ou sem permissão',
          testedAt: new Date().toISOString(),
          responseTime
        };
      } else {
        const errorData = await response.text();
        console.log('❌ Erro HTTP:', { status: response.status, error: errorData });
        
        return {
          isValid: false,
          status: 'error',
          message: `Erro HTTP ${response.status}: ${response.statusText}`,
          testedAt: new Date().toISOString(),
          responseTime
        };
      }
    } catch (error) {
      return {
        isValid: false,
        status: 'network_error',
        message: `Erro de rede: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        testedAt: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Mascarar API key para exibição segura
   */
  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 10) {
      return '****';
    }
    
    // Mostrar primeiros 10 caracteres + asteriscos
    return `${apiKey.substring(0, 10)}${'*'.repeat(Math.min(apiKey.length - 10, 20))}`;
  }
}

export const subaccountService = new SubaccountService();
export default subaccountService;