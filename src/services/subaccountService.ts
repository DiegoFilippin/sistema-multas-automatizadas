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
  // Credenciais manuais e auditoria
  is_manual_config?: boolean;
  manual_wallet_id?: string;
  manual_api_key?: string | null;
  credentials_source?: 'manual' | 'auto';
  credentials_updated_at?: string;
  credentials_updated_by?: string;
  // Origem da conta
  account_origin: 'system' | 'external';
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
    complement?: string;
    province: string;
    city: string;
    state: string;
  };
  companyType?: 'LIMITED' | 'INDIVIDUAL' | 'ASSOCIATION' | 'MEI';
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

// New interfaces for manual credential management
export interface ManualConfigData {
  wallet_id?: string;
  api_key?: string;
  manual_wallet_id?: string;
  manual_api_key?: string;
  is_manual?: boolean;
  is_manual_config?: boolean;
}

export interface ConfigTestResult {
  success: boolean;
  message: string;
  tested_at: string;
  response_time?: number;
  wallet_id?: string;
  environment?: 'sandbox' | 'production';
}

export interface CredentialsAudit {
  id: string;
  subaccount_id: string;
  action: 'create' | 'update' | 'delete';
  field_name: string;
  old_value?: string;
  new_value?: string;
  changed_by?: string;
  changed_at: string;
  ip_address?: string;
  user_agent?: string;
  user_email?: string;
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
    // Handle both frontend (import.meta.env) and backend (process.env) environments
    const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
    const baseUrl = isProduction ? '' : 'http://localhost:3001';
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
        api_key: asaasResponse.apiKey,
        account_origin: 'system' as const
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
        wallet_id: data.manual_wallet_id || undefined
      },
      icetran: {
        id: data.parent?.id,
        name: data.parent?.nome,
        wallet_id: data.parent?.manual_wallet_id || undefined
      },
      acsm: {
        wallet_id: this.getAcsmWalletId()
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
   * Atualizar configuração manual de credenciais
   */
  async updateManualConfig(subaccountId: string, config: ManualConfigData, userId: string): Promise<AsaasSubaccount> {
    try {
      const isManual = Boolean(config.is_manual ?? config.is_manual_config);
      const walletId = config.wallet_id ?? config.manual_wallet_id ?? null;
      const apiKeyRaw = config.api_key ?? config.manual_api_key ?? null;

      console.log('🔧 [service] updateManualConfig called:', { subaccountId, isManual, walletId_preview: walletId?.slice(0, 10) });

      // 1. Validar credenciais (formato básico)
      if (isManual) {
        const validation = this.validateCredentials(walletId || '', apiKeyRaw || '');
        // Relaxar: aceitar apenas wallet_id válido; ignorar API key
        const filteredErrors = validation.errors.filter(e => !e.includes('API Key'));
        if (!walletId || walletId.trim().length < 10) {
          filteredErrors.push('Wallet ID deve ter no mínimo 10 caracteres');
        }
        if (filteredErrors.length > 0) {
          console.warn('⚠️ [service] Validation (relaxed) failed:', filteredErrors);
          throw new Error(`Validação falhou: ${filteredErrors.join(', ')}`);
        }
      }

      // 2. Criptografar API key antes de salvar
      const encryptedApiKey = apiKeyRaw ? this.encryptApiKey(apiKeyRaw) : null;

      // 3. Atualizar registro no banco
      const updatedBy = (userId && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId)) ? userId : null;
      const updateData = {
        manual_wallet_id: isManual ? walletId : null,
        manual_api_key: isManual ? encryptedApiKey : null,
        credentials_source: isManual ? 'manual' as const : 'auto' as const,
        is_manual_config: isManual,
        credentials_updated_at: new Date().toISOString(),
        credentials_updated_by: updatedBy,
        account_origin: isManual ? 'external' as const : 'system' as const
      };

      // Não espelhar wallet_id no campo base para evitar conflito de unique constraint
      const finalUpdateData = updateData;

      console.log('📝 [service] Final update data:', finalUpdateData);

      // Tentar atualização completa; se falhar por colunas inexistentes, aplicar fallback mínimo
      let updatedRow: AsaasSubaccount | null = null;

      const { data, error } = await supabase
        .from('asaas_subaccounts')
        .update(finalUpdateData)
        .eq('id', subaccountId)
        .select()
        .single();

      if (!error && data) {
        updatedRow = data as AsaasSubaccount;
      } else {
        const errMsg = String(error?.message || '');
        const columns = ['manual_wallet_id','manual_api_key','credentials_source','is_manual_config','credentials_updated_by','credentials_updated_at'];
        const likelyMissingColumns = errMsg.match(/column .* does not exist|unknown column/i) || columns.some(col => errMsg.includes(col));

        if (likelyMissingColumns) {
          console.warn('⚠️ [service] Manual columns missing in remote schema. Applying minimal update. Original error:', errMsg);
          const minimalUpdate: Record<string, unknown> = {
            account_origin: isManual ? 'external' : 'system',
            updated_at: new Date().toISOString()
          };
          // Não tocar em wallet_id no fallback para evitar duplicate key
          // if (walletId) minimalUpdate.wallet_id = walletId;

          const { data: data2, error: error2 } = await supabase
            .from('asaas_subaccounts')
            .update(minimalUpdate)
            .eq('id', subaccountId)
            .select()
            .single();

          if (error2 || !data2) {
            console.error('❌ [service] Fallback update error:', error2);
            throw new Error(`Erro ao atualizar configuração (fallback): ${error2?.message || 'Sem dados retornados'}`);
          }
          updatedRow = data2 as AsaasSubaccount;
        } else {
          console.error('❌ [service] Update error:', error);
          throw new Error(`Erro ao atualizar configuração: ${error?.message || 'Sem dados retornados'}`);
        }
      }

      console.log('✅ [service] Updated subaccount:', {
        id: updatedRow!.id,
        wallet_id: updatedRow!.wallet_id,
        manual_wallet_id: (updatedRow as any).manual_wallet_id,
        is_manual_config: (updatedRow as any).is_manual_config,
      });

      // Invalida caches relacionados
      this.invalidateCache(subaccountId);

      return updatedRow as AsaasSubaccount;
    } catch (error) {
      console.error('Erro ao atualizar configuração manual:', error);
      throw new Error(`Falha ao atualizar configuração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Testar conexão com credenciais manualmente (por subaccount ID)
   */
  async testManualConnection(subaccountId: string): Promise<ConfigTestResult> {
    try {
      // Buscar subconta no banco
      const { data: subaccount, error } = await supabase
        .from('asaas_subaccounts')
        .select('*')
        .eq('id', subaccountId)
        .single();

      if (error || !subaccount) {
        return {
          success: false,
          message: 'Subconta não encontrada',
          tested_at: new Date().toISOString(),
          response_time: 0
        };
      }

      // Determinar quais credenciais usar
      const walletId = subaccount.is_manual_config ? subaccount.manual_wallet_id : subaccount.wallet_id;
      const apiKey = subaccount.is_manual_config
        ? (subaccount.manual_api_key ? this.decryptApiKey(subaccount.manual_api_key) : null)
        : subaccount.api_key;

      if (!walletId || !apiKey) {
        return {
          success: false,
          message: 'Credenciais não configuradas para esta subconta',
          tested_at: new Date().toISOString(),
          response_time: 0
        };
      }

      // Testar conexão usando as credenciais encontradas
      return await this.testManualConnectionWithCredentials(walletId, apiKey);
    } catch (error) {
      return {
        success: false,
        message: `Erro ao buscar subconta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        tested_at: new Date().toISOString(),
        response_time: 0
      };
    }
  }

  /**
   * Testar conexão com credenciais manualmente (com credenciais diretas)
   */
  async testManualConnectionWithCredentials(walletId: string, apiKey: string): Promise<ConfigTestResult> {
    const startTime = Date.now();
    
    try {
      // Validar formato das credenciais
      const validation = this.validateCredentials(walletId, apiKey);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Validação falhou: ${validation.errors.join(', ')}`,
          tested_at: new Date().toISOString(),
          response_time: Date.now() - startTime
        };
      }

      // Testar conexão com a API Asaas
      const headers = {
        'Content-Type': 'application/json',
        'access_token': apiKey
      };

      const response = await fetch(`${this.getAsaasBaseUrl()}/myAccount`, {
        headers
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const accountData = await response.json();
        return {
          success: true,
          message: `Conexão bem-sucedida - Conta: ${accountData.name || accountData.email}`,
          tested_at: new Date().toISOString(),
          response_time: responseTime,
          wallet_id: walletId,
          environment: this.config?.environment || 'sandbox'
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: 'Credenciais inválidas ou sem permissão',
          tested_at: new Date().toISOString(),
          response_time: responseTime,
          wallet_id: walletId
        };
      } else {
        return {
          success: false,
          message: `Erro HTTP ${response.status}: ${response.statusText}`,
          tested_at: new Date().toISOString(),
          response_time: responseTime,
          wallet_id: walletId
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Erro de rede: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        tested_at: new Date().toISOString(),
        response_time: Date.now() - startTime,
        wallet_id: walletId
      };
    }
  }

  /**
   * Obter histórico de alterações de credenciais
   */
  async getCredentialsHistory(subaccountId: string): Promise<CredentialsAudit[]> {
    try {
      const { data, error } = await supabase
        .from('asaas_credentials_audit')
        .select('*')
        .eq('subaccount_id', subaccountId)
        .order('changed_at', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }

      return (data || []) as CredentialsAudit[];
    } catch (error) {
      console.error('Erro ao buscar histórico de credenciais:', error);
      throw new Error(`Falha ao buscar histórico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Validar formato das credenciais
   */
  private validateCredentials(walletId: string, apiKey: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validações de Wallet ID
    if (!walletId || walletId.length < 10) {
      errors.push('Wallet ID deve ter no mínimo 10 caracteres');
    }

    if (walletId && walletId.length > 50) {
      errors.push('Wallet ID deve ter no máximo 50 caracteres');
    }

    // Validações de API Key (opcional: validar apenas se fornecida)
    if (apiKey && apiKey.trim().length > 0) {
      if (apiKey.trim().length < 20) {
        errors.push('API Key deve ter no mínimo 20 caracteres');
      }

      if (!apiKey.startsWith('$aact_')) {
        errors.push('API Key deve começar com "$aact_"');
      }
    }

    // Validação de caracteres para Wallet ID (permitir underscore também)
    const validWalletPattern = /^[a-zA-Z0-9-_]+$/;
    if (walletId && !validWalletPattern.test(walletId)) {
      errors.push('Wallet ID contém caracteres inválidos (apenas letras, números, hífens e underscores são permitidos)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Obter Wallet ID da ACSM do ambiente
   */
  private getAcsmWalletId(): string {
    try {
      // Tentar process.env primeiro (backend)
      if (typeof process !== 'undefined' && process.env?.ACSM_WALLET_ID) {
        return process.env.ACSM_WALLET_ID;
      }
      
      // Para frontend, usar variáveis globais ou padrão
      const globalObj = (typeof globalThis !== 'undefined') ? globalThis : 
                       (typeof window !== 'undefined') ? window : {} as any;
      
      if (globalObj.VITE_ACSM_WALLET_ID) {
        return globalObj.VITE_ACSM_WALLET_ID;
      }
      
      // Fallback para valor padrão
      return 'wallet_acsm_default';
    } catch (error) {
      console.warn('Erro ao obter ACSM Wallet ID, usando padrão:', error);
      return 'wallet_acsm_default';
    }
  }

  /**
   * Obter chave de criptografia do ambiente
   */
  private getEncryptionKey(): string {
    try {
      // Tentar process.env primeiro (backend)
      if (typeof process !== 'undefined' && process.env?.API_ENCRYPTION_KEY) {
        return process.env.API_ENCRYPTION_KEY;
      }
      
      // Para frontend, usar variáveis globais ou padrão
      // Vite injeta variáveis como propriedades do objeto window ou global
      const globalObj = (typeof globalThis !== 'undefined') ? globalThis : 
                       (typeof window !== 'undefined') ? window : {} as any;
      
      if (globalObj.VITE_API_ENCRYPTION_KEY) {
        return globalObj.VITE_API_ENCRYPTION_KEY;
      }
      
      // Fallback para valor padrão
      return 'default-key-change-in-production';
    } catch (error) {
      console.warn('Erro ao obter chave de criptografia, usando padrão:', error);
      return 'default-key-change-in-production';
    }
  }

  /**
   * Criptografar API key
   */
  private encryptApiKey(apiKey: string): string {
    const cryptoKey = this.getEncryptionKey();
    
    try {
      // Simples XOR criptografia (substituir por AES-256 em produção)
      let encrypted = '';
      for (let i = 0; i < apiKey.length; i++) {
        encrypted += String.fromCharCode(apiKey.charCodeAt(i) ^ cryptoKey.charCodeAt(i % cryptoKey.length));
      }
      return btoa(encrypted); // Base64 encode
    } catch (error) {
      console.error('Erro ao criptografar API key:', error);
      throw new Error('Falha ao criptografar API key');
    }
  }

  /**
   * Descriptografar API key
   */
  private decryptApiKey(encryptedApiKey: string): string {
    const cryptoKey = this.getEncryptionKey();
    
    try {
      const decoded = atob(encryptedApiKey); // Base64 decode
      let decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ cryptoKey.charCodeAt(i % cryptoKey.length));
      }
      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar API key:', error);
      throw new Error('Falha ao descriptografar API key');
    }
  }

  /**
   * Obter cliente Supabase para uso em rotas API
   */
  getSupabaseClient() {
    return supabase;
  }

  /**
   * Invalidar cache da subconta
   */
  private invalidateCache(subaccountId: string): void {
    // Implementar invalidação de cache quando houver sistema de cache
    console.log(`Cache invalidado para subconta: ${subaccountId}`);
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

  /**
   * Obter todas as subcontas (para admin)
   */
  async getAllSubaccounts(): Promise<AsaasSubaccount[]> {
    try {
      const { data, error } = await supabase
        .from('asaas_subaccounts')
        .select(`
          *,
          company:companies!company_id(name, cnpj)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar subcontas: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar todas as subcontas:', error);
      throw new Error(`Falha ao buscar subcontas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Obter subconta por ID
   */
  async getSubaccountById(id: string): Promise<AsaasSubaccount | null> {
    try {
      const { data, error } = await supabase
        .from('asaas_subaccounts')
        .select(`
          *,
          company:companies!company_id(name, cnpj)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Não encontrado
        }
        throw new Error(`Erro ao buscar subconta: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar subconta por ID:', error);
      throw new Error(`Falha ao buscar subconta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }



  /**
   * Registrar alteração de credenciais na auditoria
   */
  async logCredentialChange(
    subaccountId: string,
    action: 'create' | 'update' | 'delete',
    fieldName: string,
    changedBy: string,
    changedByEmail: string,
    metadata?: {
      ip?: string;
      userAgent?: string;
      oldValue?: string;
      newValue?: string;
    }
  ): Promise<void> {
    try {
      const auditData = {
        subaccount_id: subaccountId,
        action,
        field_name: fieldName,
        old_value: metadata?.oldValue ? this.maskApiKey(metadata.oldValue) : null,
        new_value: metadata?.newValue ? this.maskApiKey(metadata.newValue) : null,
        changed_by: changedBy,
        changed_at: new Date().toISOString(),
        ip_address: metadata?.ip || null,
        user_agent: metadata?.userAgent || null
      };

      const { error } = await supabase
        .from('asaas_credentials_audit')
        .insert(auditData);

      if (error) {
        console.error('Erro ao registrar auditoria:', error);
        // Não lançar erro para não quebrar a operação principal
      } else {
        console.log(`✅ Auditoria registrada: ${action} em ${fieldName} por ${changedByEmail}`);
      }
    } catch (error) {
      console.error('Erro ao registrar auditoria de credenciais:', error);
      // Não lançar erro para não quebrar a operação principal
    }
  }
}

export const subaccountService = new SubaccountService();
export default subaccountService;