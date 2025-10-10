export interface DespachanteFinancialData {
  totalAReceber: number;
  totalRecebidoMes: number;
  totalServicosCriados: number;
  totalServicosPagos: number;
  comissaoMesAtual: number;
  previsaoRecebimento: number;
}

export interface DespachantePaymentSplit {
  id: string;
  payment_id: string;
  recipient_type: 'acsm' | 'icetran' | 'despachante';
  recipient_company_id?: string;
  recipient_company_name?: string;
  split_amount: number;
  split_percentage: number;
  status: 'pending' | 'processed' | 'failed';
  created_at: string;
  payment_date?: string;
  service_type?: string;
  client_id?: string;
  client_name?: string;
  payment_amount: number;
}

export interface DespachanteFinancialFilter {
  startDate: string;
  endDate: string;
  status?: 'all' | 'pending' | 'processed' | 'failed';
}

export interface DespachanteFinancialSummary {
  period: {
    startDate: string;
    endDate: string;
  };
  totals: {
    totalSplits: number;
    totalPending: number;
    totalProcessed: number;
    totalFailed: number;
  };
  byStatus: {
    pending: { count: number; total: number };
    processed: { count: number; total: number };
    failed: { count: number; total: number };
  };
}