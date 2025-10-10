import axios, { AxiosInstance } from 'axios';

// Interfaces para Asaas API
export interface AsaasCustomer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  country?: string;
  observations?: string;
}

export interface AsaasPayment {
  id?: string;
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  discount?: {
    value: number;
    dueDateLimitDays: number;
  };
  interest?: {
    value: number;
  };
  fine?: {
    value: number;
  };
  postalService?: boolean;
  split?: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
  }>;
}

export interface AsaasPaymentResponse {
  id: string;
  dateCreated: string;
  customer: string;
  paymentLink?: string;
  value: number;
  netValue: number;
  originalValue?: number;
  interestValue?: number;
  description?: string;
  billingType: string;
  pixTransaction?: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'RECEIVED_IN_CASH' | 'REFUND_REQUESTED' | 'REFUND_IN_PROGRESS' | 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'AWAITING_CHARGEBACK_REVERSAL' | 'DUNNING_REQUESTED' | 'DUNNING_RECEIVED' | 'AWAITING_RISK_ANALYSIS';
  dueDate: string;
  originalDueDate: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  installmentNumber?: number;
  invoiceUrl?: string;
  invoiceNumber?: string;
  externalReference?: string;
  pixQrCodeId?: string;
  pixCopyAndPaste?: string;
  deleted: boolean;
}

export interface AsaasWebhookEvent {
  id: string;
  dateCreated: string;
  payment: AsaasPaymentResponse;
  installment?: number;
  event: 'PAYMENT_CREATED' | 'PAYMENT_AWAITING_RISK_ANALYSIS' | 'PAYMENT_APPROVED_BY_RISK_ANALYSIS' | 'PAYMENT_REPROVED_BY_RISK_ANALYSIS' | 'PAYMENT_UPDATED' | 'PAYMENT_CONFIRMED' | 'PAYMENT_RECEIVED' | 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED' | 'PAYMENT_AWAITING_CHARGEBACK' | 'PAYMENT_REFUND_IN_PROGRESS' | 'PAYMENT_RECEIVED_IN_CASH_UNDONE' | 'PAYMENT_CHARGEBACK_REQUESTED' | 'PAYMENT_CHARGEBACK_DISPUTE' | 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL' | 'PAYMENT_DUNNING_RECEIVED' | 'PAYMENT_DUNNING_REQUESTED' | 'PAYMENT_BANK_SLIP_VIEWED' | 'PAYMENT_CHECKOUT_VIEWED' | 'PAYMENT_DELETED';
}

class AsaasService {
  private api: AxiosInstance;
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY || '';
    this.baseURL = process.env.ASAAS_ENVIRONMENT === 'production' 
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/v3';

    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'access_token': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Interceptor para logs
    this.api.interceptors.request.use(
      (config) => {
        console.log(`Asaas API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Asaas API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => {
        console.log(`Asaas API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('Asaas API Response Error:', {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  // Criar customer no Asaas
  async createCustomer(customerData: AsaasCustomer): Promise<AsaasCustomer | null> {
    try {
      const response = await this.api.post('/customers', customerData);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao criar customer no Asaas:', error.response?.data || error.message);
      throw new Error(`Erro ao criar customer: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Buscar customer por ID
  async getCustomerById(customerId: string): Promise<AsaasCustomer | null> {
    try {
      const response = await this.api.get(`/customers/${customerId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar customer no Asaas:', error.response?.data || error.message);
      return null;
    }
  }

  // Atualizar customer
  async updateCustomer(customerId: string, customerData: Partial<AsaasCustomer>): Promise<AsaasCustomer | null> {
    try {
      const response = await this.api.post(`/customers/${customerId}`, customerData);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao atualizar customer no Asaas:', error.response?.data || error.message);
      return null;
    }
  }

  // Criar pagamento PIX
  async createPixPayment(paymentData: AsaasPayment): Promise<AsaasPaymentResponse | null> {
    try {
      // Garantir que é PIX
      const pixPaymentData = {
        ...paymentData,
        billingType: 'PIX' as const
      };

      const response = await this.api.post('/payments', pixPaymentData);
      const payment = response.data;

      // Se for PIX, buscar QR Code
      if (payment.id && payment.billingType === 'PIX') {
        const pixData = await this.getPixQrCode(payment.id);
        if (pixData) {
          payment.pixQrCodeId = pixData.encodedImage;
          payment.pixCopyAndPaste = pixData.payload;
        }
      }

      return payment;
    } catch (error: any) {
      console.error('Erro ao criar pagamento PIX no Asaas:', error.response?.data || error.message);
      throw new Error(`Erro ao criar pagamento PIX: ${error.response?.data?.errors?.[0]?.description || error.message}`);
    }
  }

  // Buscar QR Code do PIX
  async getPixQrCode(paymentId: string): Promise<{ encodedImage: string; payload: string } | null> {
    try {
      const response = await this.api.get(`/payments/${paymentId}/pixQrCode`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar QR Code PIX:', error.response?.data || error.message);
      return null;
    }
  }

  // Buscar pagamento por ID
  async getPaymentById(paymentId: string): Promise<AsaasPaymentResponse | null> {
    try {
      const response = await this.api.get(`/payments/${paymentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar pagamento no Asaas:', error.response?.data || error.message);
      return null;
    }
  }

  // Listar pagamentos
  async getPayments(params: {
    customer?: string;
    status?: string;
    billingType?: string;
    dateCreated?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: AsaasPaymentResponse[]; totalCount: number } | null> {
    try {
      const response = await this.api.get('/payments', { params });
      return {
        data: response.data.data || [],
        totalCount: response.data.totalCount || 0
      };
    } catch (error: any) {
      console.error('Erro ao listar pagamentos no Asaas:', error.response?.data || error.message);
      return null;
    }
  }

  // Cancelar pagamento
  async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      await this.api.delete(`/payments/${paymentId}`);
      return true;
    } catch (error: any) {
      console.error('Erro ao cancelar pagamento no Asaas:', error.response?.data || error.message);
      return false;
    }
  }

  // Estornar pagamento
  async refundPayment(paymentId: string, value?: number, description?: string): Promise<boolean> {
    try {
      const refundData: any = {};
      if (value) refundData.value = value;
      if (description) refundData.description = description;

      await this.api.post(`/payments/${paymentId}/refund`, refundData);
      return true;
    } catch (error: any) {
      console.error('Erro ao estornar pagamento no Asaas:', error.response?.data || error.message);
      return false;
    }
  }

  // Validar webhook
  validateWebhook(payload: string, signature: string): boolean {
    try {
      // Implementar validação de assinatura do webhook se necessário
      // Por enquanto, retorna true (validação básica)
      return true;
    } catch (error) {
      console.error('Erro ao validar webhook:', error);
      return false;
    }
  }

  // Processar evento do webhook
  async processWebhookEvent(event: AsaasWebhookEvent): Promise<void> {
    try {
      console.log(`Processando evento Asaas: ${event.event} para pagamento ${event.payment.id}`);

      switch (event.event) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED':
          console.log(`Pagamento confirmado: ${event.payment.id}`);
          break;

        case 'PAYMENT_UPDATED':
          console.log(`Pagamento atualizado: ${event.payment.id}`);
          break;

        case 'PAYMENT_DELETED':
          console.log(`Pagamento cancelado: ${event.payment.id}`);
          break;

        default:
          console.log(`Evento não tratado: ${event.event}`);
      }
    } catch (error) {
      console.error('Erro ao processar evento do webhook:', error);
      throw error;
    }
  }

  // Buscar saldo da conta
  async getAccountBalance(): Promise<{ balance: number } | null> {
    try {
      const response = await this.api.get('/finance/balance');
      return response.data;
    } catch (error: any) {
      console.error('Erro ao buscar saldo da conta Asaas:', error.response?.data || error.message);
      return null;
    }
  }

  // Criar split de pagamento
  async createPaymentSplit(paymentId: string, splits: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
  }>): Promise<boolean> {
    try {
      await this.api.post(`/payments/${paymentId}/split`, { splits });
      return true;
    } catch (error: any) {
      console.error('Erro ao criar split de pagamento:', error.response?.data || error.message);
      return false;
    }
  }

  // Verificar status da API
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/customers?limit=1');
      return response.status === 200;
    } catch (error) {
      console.error('Erro no health check da API Asaas:', error);
      return false;
    }
  }
}

export const asaasService = new AsaasService();