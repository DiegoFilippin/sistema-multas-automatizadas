// Types e Interfaces para o Wizard de Novo Recurso

export type WizardStep = 1 | 2 | 3 | 4;

export type PaymentMethod = 'prepago' | 'pix' | 'boleto';

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  cpf_cnpj?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  tipo_recurso: string;
  prazo_dias?: number;
  taxa_sucesso?: number;
  ativo: boolean;
  // Campos de custo
  acsm_value?: number;
  icetran_value?: number;
  taxa_cobranca?: number;
  base_cost?: number;
}

export interface Pagamento {
  metodo: 'prepaid' | 'charge';
  status: 'pending' | 'paid' | 'failed';
  valor: number;
  service_order_id: string;
  asaas_payment_id: string | null;
  asaas_invoice_url?: string | null;
  paid_at: string | null;
}

export interface PaymentInfo {
  metodo: PaymentMethod;
  cobrancaId?: string;
  status: PaymentStatus;
  qrCode?: string;
  qrCodeText?: string;
  boletoUrl?: string;
  valor: number;
  dueDate?: string;
}

export interface RecursoFormData {
  numero_auto_infracao?: string;
  placa_veiculo?: string;
  data_infracao?: string;
  local_infracao?: string;
  valor_multa?: number;
  observacoes?: string;
  documentos?: File[];
  documentos_urls?: string[];
}

export interface WizardState {
  currentStep: WizardStep;
  cliente: Cliente | null;
  servico: Servico | null;
  pagamento: Pagamento | null;
  recurso: RecursoFormData;
  canProceed: boolean;
  isLoading: boolean;
  error: string | null;
  draftId?: string;
}

export interface StepValidation {
  isValid: boolean;
  errors: string[];
}

export interface WizardContextType {
  state: WizardState;
  setCliente: (cliente: Cliente | null) => void;
  setServico: (servico: Servico | null) => void;
  setPagamento: (pagamento: PaymentInfo | null) => void;
  setRecurso: (recurso: RecursoFormData) => void;
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  validateCurrentStep: () => StepValidation;
  resetWizard: () => void;
  saveDraft: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<void>;
}
