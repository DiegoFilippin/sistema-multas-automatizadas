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
  apiKey: string
  environment: 'sandbox' | 'production'
  webhookUrl?: string
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
        .eq('active', true)
        .single()

      if (error) {
        console.warn('Configuração do Asaas não encontrada:', error.message)
        return
      }

      this.config = {
        apiKey: data.api_key,
        environment: data.environment,
        webhookUrl: data.webhook_url
      }
    } catch (error) {
      console.error('Erro ao carregar configuração do Asaas:', error)
    }
  }

  private getBaseUrl(): string {
    if (!this.config) {
      throw new Error('Configuração do Asaas não carregada')
    }
    return this.config.environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3'
  }

  private getHeaders(): Record<string, string> {
    if (!this.config) {
      throw new Error('Configuração do Asaas não carregada')
    }
    return {
      'Content-Type': 'application/json',
      'access_token': this.config.apiKey
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

  /**
   * Get Asaas configuration from database
   */
  async getConfig(): Promise<AsaasConfig | null> {
    try {
      const { data, error } = await supabase
        .from('asaas_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

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

      if (existingConfig) {
        // Update existing config
        const { data, error } = await supabase
          .from('asaas_config')
          .update({
            ...config,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      } else {
        // Create new config
        const { data, error } = await supabase
          .from('asaas_config')
          .insert(config)
          .select()
          .single();

        if (error) throw new Error(error.message);
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
    return this.config !== null && !!this.config.apiKey
  }

  // Método para obter configuração atual
  getCurrentConfig(): AsaasConfig | null {
    return this.config
  }
}

export const asaasService = new AsaasService()
export default asaasService