import { supabase } from '@/lib/supabase'

// Tipos baseados na documentação do Asaas
export interface AsaasCustomer {
  id?: string
  name: string
  email?: string
  phone?: string
  mobilePhone?: string
  cpfCnpj: string
  postalCode?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  city?: string
  state?: string
  country?: string
  externalReference?: string
  notificationDisabled?: boolean
  additionalEmails?: string
  municipalInscription?: string
  stateInscription?: string
  observations?: string
}

export interface AsaasPaymentCreate {
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  discount?: {
    value?: number;
    dueDateLimitDays?: number;
    type?: 'FIXED' | 'PERCENTAGE';
  };
  interest?: {
    value?: number;
    type?: 'PERCENTAGE';
  };
  fine?: {
    value?: number;
    type?: 'FIXED' | 'PERCENTAGE';
  };
  postalService?: boolean;
  split?: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
  }>;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  netValue?: number;
  originalValue?: number;
  interestValue?: number;
  description?: string;
  externalReference?: string;
  dueDate: string;
  originalDueDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  installmentNumber?: number;
  invoiceNumber?: string;
  deleted: boolean;
  anticipated?: boolean;
  anticipable?: boolean;
  creditDate?: string;
  estimatedCreditDate?: string;
  transactionReceiptUrl?: string;
  nossoNumero?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pix?: {
    qrCode?: string;
    payload?: string;
  };
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'REFUND_IN_PROGRESS' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
}

export interface AsaasSubscription {
  id?: string
  customer: string
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX'
  value: number
  nextDueDate: string
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
  description?: string
  endDate?: string
  maxPayments?: number
  externalReference?: string
  split?: Array<{
    walletId: string
    fixedValue?: number
    percentualValue?: number
  }>
}

export interface AsaasWebhook {
  id?: string
  name: string
  url: string
  email?: string
  sendType: 'SEQUENTIALLY' | 'NON_SEQUENTIALLY'
  apiVersion?: number
  enabled?: boolean
  interrupted?: boolean
  authToken?: string
  events: Array<
    | 'PAYMENT_CREATED'
    | 'PAYMENT_AWAITING_PAYMENT'
    | 'PAYMENT_RECEIVED'
    | 'PAYMENT_CONFIRMED'
    | 'PAYMENT_OVERDUE'
    | 'PAYMENT_DELETED'
    | 'PAYMENT_RESTORED'
    | 'PAYMENT_REFUNDED'
    | 'PAYMENT_RECEIVED_IN_CASH_UNDONE'
    | 'PAYMENT_CHARGEBACK_REQUESTED'
    | 'PAYMENT_CHARGEBACK_DISPUTE'
    | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
    | 'PAYMENT_DUNNING_RECEIVED'
    | 'PAYMENT_DUNNING_REQUESTED'
    | 'PAYMENT_BANK_SLIP_VIEWED'
    | 'PAYMENT_CHECKOUT_VIEWED'
  >
}

export interface AsaasConfig {
  id?: string
  api_key_sandbox?: string
  api_key_production?: string
  environment: 'sandbox' | 'production'
  webhook_url?: string
  webhook_token?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

class AsaasService {
  private config: AsaasConfig | null = null

  constructor() {
    this.loadConfig()
  }

  private async loadConfig(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('asaas_config')
        .select('*')
        .eq('is_active', true)
        .single()

      if (error) {
        console.warn('Configuração do Asaas não encontrada:', error.message)
        return
      }

      this.config = {
        id: data.id,
        api_key_sandbox: data.api_key_sandbox,
        api_key_production: data.api_key_production,
        environment: data.environment,
        webhook_url: data.webhook_url,
        webhook_token: data.webhook_token,
        is_active: data.is_active
      }
    } catch (error) {
      console.error('Erro ao carregar configuração do Asaas:', error)
    }
  }

  private getBaseUrl(): string {
    if (!this.config) {
      throw new Error('Configuração do Asaas não carregada')
    }
    // Usar proxy local para resolver problemas de CORS
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
    return `${baseUrl}/api/asaas-proxy`
  }

  private getHeaders(): Record<string, string> {
    if (!this.config) {
      throw new Error('Configuração do Asaas não carregada')
    }
    
    const apiKey = this.config.environment === 'production' 
      ? this.config.api_key_production 
      : this.config.api_key_sandbox
    
    if (!apiKey) {
      throw new Error(`API Key não configurada para ambiente ${this.config.environment}`)
    }
    
    return {
      'Content-Type': 'application/json',
      'access_token': apiKey
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`
    const headers = this.getHeaders()

    const options: RequestInit = {
      method,
      headers
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, options)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(`Erro na API do Asaas: ${result.message || response.statusText}`)
      }

      return result
    } catch (error) {
      console.error('Erro na requisição para Asaas:', error)
      throw error
    }
  }

  // Métodos para Clientes
  async createCustomer(customer: AsaasCustomer): Promise<AsaasCustomer> {
    return this.makeRequest<AsaasCustomer>('/customers', 'POST', customer)
  }

  async getCustomer(customerId: string): Promise<AsaasCustomer> {
    return this.makeRequest<AsaasCustomer>(`/customers/${customerId}`)
  }

  /**
   * Get customers with filters
   */
  async getCustomers(filters?: {
    name?: string;
    email?: string;
    cpfCnpj?: string;
    groupName?: string;
    externalReference?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ data: AsaasCustomer[]; hasMore: boolean; totalCount: number; limit: number; offset: number }> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const url = queryString ? `/customers?${queryString}` : '/customers';
    
    return this.makeRequest(url, 'GET');
  }

  async updateCustomer(customerId: string, customer: Partial<AsaasCustomer>): Promise<AsaasCustomer> {
    return this.makeRequest<AsaasCustomer>(`/customers/${customerId}`, 'PUT', customer)
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.makeRequest(`/customers/${customerId}`, 'DELETE')
  }

  async listCustomers(params?: {
    name?: string
    email?: string
    cpfCnpj?: string
    groupName?: string
    externalReference?: string
    offset?: number
    limit?: number
  }): Promise<{ data: AsaasCustomer[]; hasMore: boolean; totalCount: number; limit: number; offset: number }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const endpoint = `/customers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return this.makeRequest(endpoint)
  }

  // Métodos para Cobranças
  async createPayment(payment: AsaasPaymentCreate): Promise<AsaasPayment> {
    return this.makeRequest<AsaasPayment>('/payments', 'POST', payment)
  }

  async getPayment(paymentId: string): Promise<AsaasPayment> {
    return this.makeRequest<AsaasPayment>(`/payments/${paymentId}`)
  }

  async updatePayment(paymentId: string, payment: Partial<AsaasPayment>): Promise<AsaasPayment> {
    return this.makeRequest<AsaasPayment>(`/payments/${paymentId}`, 'PUT', payment)
  }

  async deletePayment(paymentId: string): Promise<void> {
    await this.makeRequest(`/payments/${paymentId}`, 'DELETE')
  }

  async listPayments(params?: {
    customer?: string
    customerGroupName?: string
    billingType?: string
    status?: string
    subscription?: string
    installment?: string
    externalReference?: string
    paymentDate?: string
    estimatedCreditDate?: string
    pixQrCodeId?: string
    anticipated?: boolean
    dateCreated?: string
    offset?: number
    limit?: number
  }): Promise<{ data: AsaasPayment[]; hasMore: boolean; totalCount: number; limit: number; offset: number }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const endpoint = `/payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return this.makeRequest(endpoint)
  }

  // Métodos para Assinaturas
  async createSubscription(subscription: AsaasSubscription): Promise<AsaasSubscription> {
    return this.makeRequest<AsaasSubscription>('/subscriptions', 'POST', subscription)
  }

  async getSubscription(subscriptionId: string): Promise<AsaasSubscription> {
    return this.makeRequest<AsaasSubscription>(`/subscriptions/${subscriptionId}`)
  }

  async updateSubscription(subscriptionId: string, subscription: Partial<AsaasSubscription>): Promise<AsaasSubscription> {
    return this.makeRequest<AsaasSubscription>(`/subscriptions/${subscriptionId}`, 'PUT', subscription)
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.makeRequest(`/subscriptions/${subscriptionId}`, 'DELETE')
  }

  async listSubscriptions(params?: {
    customer?: string
    customerGroupName?: string
    billingType?: string
    status?: string
    deletedOnly?: boolean
    includeDeleted?: boolean
    externalReference?: string
    order?: 'asc' | 'desc'
    sort?: 'id' | 'customer' | 'dateCreated' | 'value' | 'nextDueDate'
    offset?: number
    limit?: number
  }): Promise<{ data: AsaasSubscription[]; hasMore: boolean; totalCount: number; limit: number; offset: number }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const endpoint = `/subscriptions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return this.makeRequest(endpoint)
  }

  // Métodos para Webhooks
  async createWebhook(webhook: AsaasWebhook): Promise<AsaasWebhook> {
    return this.makeRequest<AsaasWebhook>('/webhooks', 'POST', webhook)
  }

  async getWebhook(webhookId: string): Promise<AsaasWebhook> {
    return this.makeRequest<AsaasWebhook>(`/webhooks/${webhookId}`)
  }

  async updateWebhook(webhookId: string, webhook: Partial<AsaasWebhook>): Promise<AsaasWebhook> {
    return this.makeRequest<AsaasWebhook>(`/webhooks/${webhookId}`, 'PUT', webhook)
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.makeRequest(`/webhooks/${webhookId}`, 'DELETE')
  }

  async listWebhooks(): Promise<{ data: AsaasWebhook[] }> {
    return this.makeRequest('/webhooks')
  }

  // Métodos utilitários
  async getAccountInfo(): Promise<any> {
    return this.makeRequest('/myAccount')
  }

  async getBalance(): Promise<{ balance: number }> {
    return this.makeRequest('/finance/balance')
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Configuração não encontrada ou API key não configurada'
        }
      }

      // Tenta obter informações da conta para verificar se a conexão está funcionando
      const accountInfo = await this.getAccountInfo()
      
      if (accountInfo && accountInfo.object === 'account') {
        return { success: true }
      } else {
        return {
          success: false,
          error: 'Resposta inválida da API do Asaas'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao testar conexão'
      }
    }
  }

  // Métodos de Teste
  async createTestCustomer(): Promise<AsaasCustomer> {
    const testCustomer: AsaasCustomer = {
      name: 'Cliente Teste ICETRAN',
      email: 'cliente.teste@icetran.com.br',
      phone: '4738010919',
      mobilePhone: '47998781877',
      cpfCnpj: '11144477735', // CPF válido para testes
      postalCode: '01310100', // CEP sem hífen
      address: 'Av. Paulista',
      addressNumber: '1000',
      complement: 'Sala 100',
      province: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      externalReference: `teste-${Date.now()}`,
      observations: 'Cliente criado para teste da integração'
    }
    
    return this.createCustomer(testCustomer)
  }

  async createTestPayment(customerId: string): Promise<AsaasPayment> {
    const testPayment: AsaasPaymentCreate = {
      customer: customerId,
      billingType: 'BOLETO',
      value: 50.00,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias
      description: 'Cobrança de teste - Multa de trânsito',
      externalReference: `teste-payment-${Date.now()}`,
      discount: {
        value: 5.00,
        dueDateLimitDays: 3,
        type: 'FIXED'
      },
      fine: {
        value: 2.00,
        type: 'PERCENTAGE'
      },
      interest: {
        value: 1.00,
        type: 'PERCENTAGE'
      }
    }
    
    return this.createPayment(testPayment)
  }

  async createTestSubscription(customerId: string): Promise<AsaasSubscription> {
    const testSubscription: AsaasSubscription = {
      customer: customerId,
      billingType: 'BOLETO',
      value: 29.90,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias
      cycle: 'MONTHLY',
      description: 'Assinatura de teste - Plano Básico ICETRAN',
      externalReference: `teste-subscription-${Date.now()}`,
      maxPayments: 12 // 1 ano
    }
    
    return this.createSubscription(testSubscription)
  }

  async runFullTest(): Promise<{
    customer?: AsaasCustomer;
    payment?: AsaasPayment;
    subscription?: AsaasSubscription;
    errors: string[];
  }> {
    const errors: string[] = []
    let customer: AsaasCustomer | undefined
    let payment: AsaasPayment | undefined
    let subscription: AsaasSubscription | undefined

    try {
      // 1. Criar cliente
      customer = await this.createTestCustomer()
      console.log('Cliente criado:', customer)
    } catch (error) {
      errors.push(`Erro ao criar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }

    if (customer?.id) {
      try {
        // 2. Criar cobrança
        payment = await this.createTestPayment(customer.id)
        console.log('Cobrança criada:', payment)
      } catch (error) {
        errors.push(`Erro ao criar cobrança: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }

      try {
        // 3. Criar assinatura
        subscription = await this.createTestSubscription(customer.id)
        console.log('Assinatura criada:', subscription)
      } catch (error) {
        errors.push(`Erro ao criar assinatura: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
    }

    return { customer, payment, subscription, errors }
  }

  /**
   * Get Asaas configuration from database
   */
  async getConfig(): Promise<AsaasConfig | null> {
    try {
      console.log('AsaasService: Buscando configuração no banco...');
      const { data, error } = await supabase
        .from('asaas_config')
        .select('*')
        .single();

      console.log('AsaasService: Resultado da consulta:', { data, error });

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      console.log('AsaasService: Retornando dados:', data);
      return data;
    } catch (error) {
      console.error('Error getting Asaas config:', error);
      return null;
    }
  }

  /**
   * Save Asaas configuration to database
   */
  async saveConfig(config: Omit<AsaasConfig, 'id' | 'created_at' | 'updated_at'>): Promise<AsaasConfig> {
    try {
      const { data: existingConfig } = await supabase
        .from('asaas_config')
        .select('id')
        .single();

      const configData = {
        api_key_sandbox: config.api_key_sandbox,
        api_key_production: config.api_key_production,
        environment: config.environment,
        webhook_url: config.webhook_url,
        webhook_token: config.webhook_token,
        is_active: config.is_active ?? true
      };

      if (existingConfig) {
        // Update existing config
        const { data, error } = await supabase
          .from('asaas_config')
          .update({
            ...configData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        
        // Reload config after saving
        await this.loadConfig();
        
        return data;
      } else {
        // Create new config
        const { data, error } = await supabase
          .from('asaas_config')
          .insert(configData)
          .select()
          .single();

        if (error) throw new Error(error.message);
        
        // Reload config after saving
        await this.loadConfig();
        
        return data;
      }
    } catch (error) {
      console.error('Error saving Asaas config:', error);
      throw error;
    }
  }

  // Método para recarregar configuração
  async reloadConfig(): Promise<void> {
    await this.loadConfig()
  }

  // Método para verificar se está configurado
  isConfigured(): boolean {
    if (!this.config) return false
    
    const apiKey = this.config.environment === 'production' 
      ? this.config.api_key_production 
      : this.config.api_key_sandbox
    
    return !!apiKey
  }

  // Método para obter configuração atual
  getCurrentConfig(): AsaasConfig | null {
    return this.config
  }
}

export const asaasService = new AsaasService()
export default asaasService