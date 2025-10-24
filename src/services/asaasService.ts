import { supabase } from '@/lib/supabase'
import { splitService } from './splitService'
import { logger } from '@/utils/logger'
import { n8nWebhookService } from './n8nWebhookService'

const log = logger.scope('services/asaas')

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
        log.warn('Configuração do Asaas não encontrada:', error.message)
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
    // Usar Vercel Functions em produção, proxy local em desenvolvimento
    const baseUrl = import.meta.env.PROD ? '' : 'http://localhost:3001'
    return `${baseUrl}/api/asaas-proxy`
  }

  private getHeaders(): Record<string, string> {
    if (!this.config) {
      throw new Error('Configuração do Asaas não carregada')
    }

    // Respeitar ambiente configurado (sandbox ou production)
    const env = this.config.environment === 'sandbox' ? 'sandbox' : 'production'
    const apiKey = env === 'production' ? (this.config.api_key_production || '') : (this.config.api_key_sandbox || '')

    if (!apiKey) {
      throw new Error(`API Key do Asaas não configurada para o ambiente ${env}`)
    }

    return {
      'Content-Type': 'application/json',
      // Compatível com ambos padrões de autenticação do Asaas
      'access_token': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      // Informar ambiente ao proxy
      'x-asaas-env': env
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: unknown
  ): Promise<T> {
    const proxyUrl = `${this.getBaseUrl()}${endpoint}`
    const headers = this.getHeaders()

    const options: RequestInit = {
      method,
      headers
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data)
    }

    const maxRetries = 3
    const timeoutMs = 12000
    const isRetryableStatus = (status: number) => [429, 500, 502, 503, 504].includes(status)

    // Preparar headers para chamada direta (remover header específico do proxy)
    const directHeaders: Record<string, string> = { ...headers }
    delete directHeaders['x-asaas-env']

    const directBase = this.config?.environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3'
    const directUrl = `${directBase}${endpoint}`

    const toMessage = (e: unknown) => e instanceof Error ? e.message : String(e)
    const extractApiMsg = (obj: unknown): string | undefined => {
      const o = (obj || {}) as Record<string, unknown>
      const msg = typeof o.message === 'string' ? o.message : undefined
      const err = typeof o.error === 'string' ? o.error : undefined
      const errs = Array.isArray(o.errors) ? o.errors : undefined
      const first = (errs && errs.length > 0 ? errs[0] : undefined) as Record<string, unknown> | undefined
      const desc = typeof (first?.description) === 'string' ? first?.description : undefined
      return msg || desc || err
    }

    // Helper para executar fetch com timeout e parsing
    const doFetch = async (url: string, useDirect = false): Promise<{ ok: boolean; status: number; result?: unknown; rawText?: string; contentType?: string; statusText?: string }> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetch(url, { ...(useDirect ? { headers: directHeaders } : options), method: options.method, body: options.body, signal: controller.signal })
        clearTimeout(timeoutId)

        const contentType = response.headers.get('content-type') || ''
        let result: unknown = null
        let rawText: string | null = null

        if (contentType.includes('application/json')) {
          try {
            result = await response.json()
          } catch {
            rawText = await response.text()
          }
        } else {
          rawText = await response.text()
        }

        return { ok: response.ok, status: response.status, result, rawText: rawText || undefined, contentType, statusText: response.statusText }
      } catch (err: unknown) {
        clearTimeout(timeoutId)
        throw err
      }
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const proxyResp = await doFetch(proxyUrl)

        if (!proxyResp.ok) {
          const apiMsg = extractApiMsg(proxyResp.result)
          const msgBase = `${proxyResp.status} ${proxyResp.statusText}${apiMsg ? ` - ${apiMsg}` : ''}`
          const extra = proxyResp.rawText ? ` | corpo: ${proxyResp.rawText.slice(0, 200)}` : ''
          const isProxyNonJson = (proxyResp.result as Record<string, unknown> | undefined)?.error === 'non_json_response' || (proxyResp.rawText && proxyResp.rawText.includes('Erro no proxy Asaas'))

          if (attempt < maxRetries && (isRetryableStatus(proxyResp.status) || isProxyNonJson)) {
            await new Promise(r => setTimeout(r, attempt * 600))
            continue
          }

          // Fallback direto ao Asaas quando proxy falhar ou responder inválido
          try {
            const directResp = await doFetch(directUrl, true)
            if (!directResp.ok) {
              const dApiMsg = extractApiMsg(directResp.result)
              const dMsgBase = `${directResp.status} ${directResp.statusText}${dApiMsg ? ` - ${dApiMsg}` : ''}`
              const dExtra = directResp.rawText ? ` | corpo: ${directResp.rawText.slice(0, 200)}` : ''
              throw new Error(`Erro na API do Asaas (direto): ${dMsgBase}${dExtra}`)
            }

            if (!directResp.result && directResp.rawText) {
              return { ok: true, raw: directResp.rawText } as unknown as T
            }

            return directResp.result as T
          } catch (fallbackErr: unknown) {
            throw new Error(`Erro na API do Asaas: ${msgBase}${extra}. Fallback direto falhou: ${toMessage(fallbackErr)}`)
          }
        }

        if (!proxyResp.result && proxyResp.rawText) {
          return { ok: true, raw: proxyResp.rawText } as unknown as T
        }

        return proxyResp.result as T
      } catch (error: unknown) {
        const msg = toMessage(error)
        const isAbort = (error as { name?: string })?.name === 'AbortError'
        const isNetwork = msg.includes('Failed to fetch') || msg.includes('NetworkError') || isAbort

        if (attempt < maxRetries && isNetwork) {
          await new Promise(r => setTimeout(r, attempt * 600))
          continue
        }

        // Fallback direto ao Asaas em caso de erro de rede do proxy
        try {
          const directResp = await doFetch(directUrl, true)
          if (!directResp.ok) {
            const dApiMsg = extractApiMsg(directResp.result)
            const dMsgBase = `${directResp.status} ${directResp.statusText}${dApiMsg ? ` - ${dApiMsg}` : ''}`
            const dExtra = directResp.rawText ? ` | corpo: ${directResp.rawText.slice(0, 200)}` : ''
            throw new Error(`Erro na API do Asaas (direto): ${dMsgBase}${dExtra}`)
          }

          if (!directResp.result && directResp.rawText) {
            return { ok: true, raw: directResp.rawText } as unknown as T
          }

          return directResp.result as T
        } catch (fallbackErr: unknown) {
          if (!import.meta.env.PROD) {
            throw new Error(`Falha ao chamar o proxy local do Asaas e fallback direto também falhou. Verifique se o servidor backend está rodando em http://localhost:3001 (use \`npm run dev:full\`). Detalhe: ${msg}. Fallback: ${toMessage(fallbackErr)}`)
          }
          throw error
        }
      }
    }

    throw new Error('Falha ao comunicar com a API do Asaas após múltiplas tentativas')
  }

  // Métodos para Clientes
  async createCustomer(customer: AsaasCustomer): Promise<AsaasCustomer> {
    const cpf = (customer.cpfCnpj || '').replace(/\D/g, '')
    const nome = (customer.name || '').trim()
    const email = (customer.email || '').trim()

    const canUseWebhook = !!cpf && !!nome && !!email

    // 1) Tenta via webhook n8n para evitar CORS e mover lógica ao n8n
    if (canUseWebhook) {
      try {
        if (typeof window !== 'undefined') {
          // Ambiente browser: chama backend para evitar CORS
          const resp = await fetch('/api/webhook/n8n/create-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf, nome, email })
          })
          const text = await resp.text()
          if (!resp.ok) {
            let apiMsg = ''
            try { const json = JSON.parse(text) as Record<string, unknown>; apiMsg = typeof json.error === 'string' ? json.error : JSON.stringify(json) } catch { apiMsg = text.slice(0, 200) }
            throw new Error(`Webhook n8n falhou: HTTP ${resp.status} ${resp.statusText}${apiMsg ? ` - ${apiMsg}` : ''}`)
          }
          let parsed: unknown
          try { parsed = JSON.parse(text) } catch { parsed = { raw: text } }
          const obj = parsed as Record<string, unknown>
          const cid = obj['customerId']
          const customerId = typeof cid === 'string' ? cid : undefined
          if (customerId) {
            return { ...customer, id: customerId }
          }
        } else {
          // Ambiente servidor: chama serviço diretamente
          const result = await n8nWebhookService.createCustomer({ cpf, nome, email })
          if (result.success && result.customerId) {
            return { ...customer, id: result.customerId }
          }
          if (!result.success) {
            throw new Error(result.message || 'Falha no webhook n8n')
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        log.warn(`Webhook n8n falhou, usando Asaas direto: ${msg}`)
      }
    }

    // 2) Fallback: chama API Asaas via proxy/fallback já implementado
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

  /**
   * Criar pagamento com split automático
   */
  async createPaymentWithSplit(
    paymentData: AsaasPaymentCreate,
    despachanteCompanyId: string,
    serviceType: string
  ): Promise<AsaasPayment> {
    try {
      // 1. Calcular splits
      const splits = await splitService.calculateSplits(
        paymentData.value,
        serviceType,
        'leve', // tipo de multa padrão
        despachanteCompanyId
      );

      // 2. Adicionar splits ao pagamento
      const paymentWithSplit: AsaasPaymentCreate = {
        ...paymentData,
        split: splits.map(split => ({
          walletId: split.wallet_id,
          fixedValue: split.split_amount
        }))
      };

      // 3. Criar pagamento no Asaas
      const payment = await this.createPayment(paymentWithSplit);

      // 4. Processar splits no sistema
      await splitService.processSplits(payment.id, splits);

      return payment;
    } catch (error) {
      console.error('Erro ao criar pagamento com split:', error);
      throw new Error(`Falha ao criar pagamento com split: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Criar assinatura com split automático
   */
  async createSubscriptionWithSplit(
    subscriptionData: AsaasSubscription,
    despachanteCompanyId: string,
    serviceType: string
  ): Promise<AsaasSubscription> {
    try {
      // 1. Calcular splits
      const splits = await splitService.calculateSplits(
        subscriptionData.value,
        serviceType,
        'leve', // tipo de multa padrão
        despachanteCompanyId
      );

      // 2. Adicionar splits à assinatura
      const subscriptionWithSplit: AsaasSubscription = {
        ...subscriptionData,
        split: splits.map(split => ({
          walletId: split.wallet_id,
          fixedValue: split.split_amount
        }))
      };

      // 3. Criar assinatura no Asaas
      const subscription = await this.createSubscription(subscriptionWithSplit);

      return subscription;
    } catch (error) {
      console.error('Erro ao criar assinatura com split:', error);
      throw new Error(`Falha ao criar assinatura com split: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
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
      log.info('Cliente criado:', customer)
    } catch (error) {
      errors.push(`Erro ao criar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }

    if (customer?.id) {
      try {
        // 2. Criar cobrança
        payment = await this.createTestPayment(customer.id)
        log.info('Cobrança criada:', payment)
      } catch (error) {
        errors.push(`Erro ao criar cobrança: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }

      try {
        // 3. Criar assinatura
        subscription = await this.createTestSubscription(customer.id)
        log.info('Assinatura criada:', subscription)
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
      log.info('Buscando configuração no banco...');
      const { data, error } = await supabase
        .from('asaas_config')
        .select('*')
        .single();

      log.info('Resultado da consulta:', { data, error });

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      log.info('Retornando dados:', data);
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