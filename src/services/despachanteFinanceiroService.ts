import { supabase } from '@/lib/supabase';
import type {
  DespachanteFinancialData,
  DespachantePaymentSplit,
  DespachanteFinancialFilter,
  DespachanteFinancialSummary
} from '@/types/despachanteFinanceiro';

class DespachanteFinanceiroService {
  /**
   * Buscar dados financeiros resumidos do despachante
   */
  async getFinancialSummary(companyId: string): Promise<DespachanteFinancialData> {
    try {
      // Total a receber (pendente em qualquer período)
      const { data: pendingAll, error: pendingAllError } = await supabase
        .from('payment_splits')
        .select('split_amount')
        .eq('recipient_company_id', companyId)
        .eq('recipient_type', 'despachante')
        .eq('status', 'pending');

      if (pendingAllError) throw pendingAllError;

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // Serviços criados no mês (valor do despachante: splits pendentes criados no mês)
      const { data: pendingMonth, error: pendingMonthError } = await supabase
        .from('payment_splits')
        .select('split_amount')
        .eq('recipient_company_id', companyId)
        .eq('recipient_type', 'despachante')
        .eq('status', 'pending')
        .gte('created_at', startOfMonth);

      if (pendingMonthError) throw pendingMonthError;

      // Serviços pagos no mês (valor do despachante: splits processados no mês)
      const { data: processedMonth, error: processedMonthError } = await supabase
        .from('payment_splits')
        .select('split_amount')
        .eq('recipient_company_id', companyId)
        .eq('recipient_type', 'despachante')
        .eq('status', 'processed')
        .gte('created_at', startOfMonth);

      if (processedMonthError) throw processedMonthError;

      // Calcular totais
      const totalAReceber = pendingAll?.reduce((sum, s) => sum + (s.split_amount || 0), 0) || 0;
      const totalServicosCriados = pendingMonth?.reduce((sum, s) => sum + (s.split_amount || 0), 0) || 0;
      const totalServicosPagos = processedMonth?.reduce((sum, s) => sum + (s.split_amount || 0), 0) || 0;
      const totalRecebidoMes = totalServicosPagos;

      return {
        totalAReceber,
        totalRecebidoMes,
        totalServicosCriados,
        totalServicosPagos,
        comissaoMesAtual: totalRecebidoMes,
        previsaoRecebimento: totalAReceber * 0.8 // Estimativa simples
      };

    } catch (error) {
      console.error('Erro ao buscar resumo financeiro:', error);
      throw new Error(`Falha ao buscar dados financeiros: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Buscar detalhes dos splits de pagamento do despachante
   */
  async getPaymentSplits(companyId: string, filter?: DespachanteFinancialFilter): Promise<DespachantePaymentSplit[]> {
    try {
      let query = supabase
        .from('payment_splits')
        .select(`
          *,
          asaas_payments(
            id,
            amount,
            payment_date,
            status,
            service_type,
            client_id,
            description
          ),
          recipient_company:companies(
            id,
            name
          )
        `)
        .eq('recipient_company_id', companyId)
        .eq('recipient_type', 'despachante')
        .order('created_at', { ascending: false });

      // Aplicar filtros de data
      if (filter?.startDate) {
        query = query.gte('created_at', filter.startDate);
      }
      if (filter?.endDate) {
        query = query.lte('created_at', filter.endDate);
      }
      if (filter?.status && filter.status !== 'all') {
        query = query.eq('status', filter.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Mapear dados para o formato esperado
      const mapped = (data || []).map(split => ({
        id: split.id,
        payment_id: split.payment_id,
        recipient_type: split.recipient_type,
        recipient_company_id: split.recipient_company_id,
        recipient_company_name: split.recipient_company?.name,
        split_amount: split.split_amount,
        split_percentage: split.split_percentage,
        status: split.status,
        created_at: split.created_at,
        payment_date: split.asaas_payments?.payment_date,
        service_type: split.asaas_payments?.service_type,
        client_id: split.asaas_payments?.client_id,
        client_name: undefined,
        payment_amount: split.asaas_payments?.amount || 0
      }));

      // Preencher nomes dos clientes usando client_id
      const clientMap = await this.getClientNamesForSplits(mapped);
      return mapped.map(s => ({
        ...s,
        client_name: s.client_id ? clientMap[s.client_id] || s.client_name : s.client_name
      }));

    } catch (error) {
      console.error('Erro ao buscar splits de pagamento:', error);
      throw new Error(`Falha ao buscar splits: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Buscar resumo financeiro por período
   */
  async getFinancialSummaryByPeriod(companyId: string, startDate: string, endDate: string): Promise<DespachanteFinancialSummary> {
    try {
      const { data, error } = await supabase
        .from('payment_splits')
        .select(`
          *,
          asaas_payments(
            amount,
            payment_date,
            status
          )
        `)
        .eq('recipient_company_id', companyId)
        .eq('recipient_type', 'despachante')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (error) throw error;

      // Agrupar por status
      const byStatus = {
        pending: { count: 0, total: 0 },
        processed: { count: 0, total: 0 },
        failed: { count: 0, total: 0 }
      };

      let totalSplits = 0;

      (data || []).forEach(split => {
        const amount = split.split_amount || 0;
        totalSplits += amount;
        
        if (split.status in byStatus) {
          byStatus[split.status as keyof typeof byStatus].count++;
          byStatus[split.status as keyof typeof byStatus].total += amount;
        }
      });

      return {
        period: { startDate, endDate },
        totals: {
          totalSplits,
          totalPending: byStatus.pending.total,
          totalProcessed: byStatus.processed.total,
          totalFailed: byStatus.failed.total
        },
        byStatus
      };

    } catch (error) {
      console.error('Erro ao buscar resumo por período:', error);
      throw new Error(`Falha ao buscar resumo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Buscar clientes associados aos pagamentos
   */
  async getClientNamesForSplits(splits: DespachantePaymentSplit[]): Promise<Record<string, string>> {
    try {
      const clientIds = Array.from(new Set(
        splits
          .map(split => split.client_id)
          .filter((id): id is string => Boolean(id))
      ));

      if (clientIds.length === 0) return {};

      const { data, error } = await supabase
        .from('clients')
        .select('id, nome')
        .in('id', clientIds);

      if (error) throw error;

      const clientMap: Record<string, string> = {};
      (data || []).forEach(client => {
        clientMap[client.id] = client.nome;
      });

      return clientMap;

    } catch (error) {
      console.error('Erro ao buscar nomes dos clientes:', error);
      return {};
    }
  }
}

export const despachanteFinanceiroService = new DespachanteFinanceiroService();
export default despachanteFinanceiroService;