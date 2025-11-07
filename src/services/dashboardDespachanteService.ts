import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth, subMonths, subDays, format } from 'date-fns';

export interface DashboardStats {
  // Recursos
  recursosAtivos: number;
  recursosEmAnalise: number;
  recursosDeferidos: number;
  recursosIndeferidos: number;
  taxaSucesso: number;
  
  // Financeiro
  receitaMensal: number;
  receitaPendente: number;
  margemDespachante: number;
  ticketMedio: number;
  
  // Clientes
  clientesAtivos: number;
  novosClientesMes: number;
  
  // Service Orders
  serviceOrdersPendentes: number;
  serviceOrdersPagas: number;
  
  // Tendências
  crescimentoRecursos: number;
  crescimentoReceita: number;
}

export interface RecursoRecente {
  id: string;
  cliente_nome: string;
  status: string;
  data_protocolo: string;
  tipo_recurso: string;
}

export interface AtividadeRecente {
  id: string;
  tipo: 'recurso_criado' | 'recurso_atualizado' | 'pagamento_recebido' | 'cliente_novo';
  descricao: string;
  data: string;
  icone: string;
  cor: string;
}

class DashboardDespachanteService {
  /**
   * Buscar estatísticas gerais do dashboard
   */
  async getDashboardStats(companyId: string): Promise<DashboardStats> {
    try {
      const mesAtual = startOfMonth(new Date());
      const mesAnterior = startOfMonth(subMonths(new Date(), 1));
      
      // Buscar recursos
      const { data: recursos, error: recursosError } = await supabase
        .from('recursos')
        .select('id, status, created_at')
        .eq('company_id', companyId);

      if (recursosError) throw recursosError;

      // Contar recursos por status
      const recursosAtivos = recursos?.filter(r => 
        ['em_analise', 'protocolado'].includes(r.status)
      ).length || 0;
      
      const recursosEmAnalise = recursos?.filter(r => r.status === 'em_analise').length || 0;
      const recursosDeferidos = recursos?.filter(r => r.status === 'deferido').length || 0;
      const recursosIndeferidos = recursos?.filter(r => r.status === 'indeferido').length || 0;
      
      const totalFinalizados = recursosDeferidos + recursosIndeferidos;
      const taxaSucesso = totalFinalizados > 0 ? (recursosDeferidos / totalFinalizados) * 100 : 0;

      // Buscar service_orders
      const { data: serviceOrders, error: ordersError } = await supabase
        .from('service_orders')
        .select('amount, status, created_at, splits_config, client_id')
        .eq('company_id', companyId);

      if (ordersError) throw ordersError;

      // Receita mensal (paid no mês atual)
      const receitaMensal = serviceOrders?.filter(o => 
        o.status === 'paid' && new Date(o.created_at) >= mesAtual
      ).reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0) || 0;

      // Receita pendente
      const receitaPendente = serviceOrders?.filter(o => 
        o.status === 'pending' || o.status === 'pending_payment'
      ).reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0) || 0;

      // Margem despachante (15% ou do splits_config)
      const margemDespachante = serviceOrders?.filter(o => o.status === 'paid')
        .reduce((sum, o) => {
          const amount = parseFloat(o.amount) || 0;
          const splitsConfig = o.splits_config as any;
          const margem = splitsConfig?.margem_despachante || (amount * 0.15);
          return sum + margem;
        }, 0) || 0;

      // Ticket médio
      const ordersPagas = serviceOrders?.filter(o => o.status === 'paid') || [];
      const ticketMedio = ordersPagas.length > 0 
        ? ordersPagas.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0) / ordersPagas.length 
        : 0;

      // Clientes únicos
      const clientesUnicos = new Set(serviceOrders?.map(o => o.client_id).filter(Boolean));
      const clientesAtivos = clientesUnicos.size;

      // Novos clientes no mês
      const { data: novosClientes, error: clientesError } = await supabase
        .from('clients')
        .select('id')
        .eq('company_id', companyId)
        .gte('created_at', mesAtual.toISOString());

      if (clientesError) throw clientesError;
      const novosClientesMes = novosClientes?.length || 0;

      // Service orders pendentes e pagas
      const serviceOrdersPendentes = serviceOrders?.filter(o => 
        o.status === 'pending' || o.status === 'pending_payment'
      ).length || 0;
      
      const serviceOrdersPagas = serviceOrders?.filter(o => o.status === 'paid').length || 0;

      // Crescimento de recursos (comparar mês atual com anterior)
      const recursosMesAtual = recursos?.filter(r => 
        new Date(r.created_at) >= mesAtual
      ).length || 0;
      
      const recursosMesAnterior = recursos?.filter(r => 
        new Date(r.created_at) >= mesAnterior && new Date(r.created_at) < mesAtual
      ).length || 0;
      
      const crescimentoRecursos = recursosMesAnterior > 0 
        ? ((recursosMesAtual - recursosMesAnterior) / recursosMesAnterior) * 100 
        : 0;

      // Crescimento de receita
      const receitaMesAnterior = serviceOrders?.filter(o => 
        o.status === 'paid' && 
        new Date(o.created_at) >= mesAnterior && 
        new Date(o.created_at) < mesAtual
      ).reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0) || 0;
      
      const crescimentoReceita = receitaMesAnterior > 0 
        ? ((receitaMensal - receitaMesAnterior) / receitaMesAnterior) * 100 
        : 0;

      return {
        recursosAtivos,
        recursosEmAnalise,
        recursosDeferidos,
        recursosIndeferidos,
        taxaSucesso,
        receitaMensal,
        receitaPendente,
        margemDespachante,
        ticketMedio,
        clientesAtivos,
        novosClientesMes,
        serviceOrdersPendentes,
        serviceOrdersPagas,
        crescimentoRecursos,
        crescimentoReceita
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
      throw error;
    }
  }

  /**
   * Buscar recursos recentes
   */
  async getRecursosRecentes(companyId: string, limit: number = 5): Promise<RecursoRecente[]> {
    try {
      const { data, error } = await supabase
        .from('recursos')
        .select(`
          id,
          status,
          data_protocolo,
          tipo_recurso,
          clients (
            nome
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map((r: any) => ({
        id: r.id,
        cliente_nome: r.clients?.nome || 'Cliente não identificado',
        status: r.status,
        data_protocolo: r.data_protocolo,
        tipo_recurso: r.tipo_recurso || 'Não especificado'
      })) || [];
    } catch (error) {
      console.error('Erro ao buscar recursos recentes:', error);
      throw error;
    }
  }

  /**
   * Buscar atividades recentes
   */
  async getAtividadesRecentes(companyId: string, limit: number = 10): Promise<AtividadeRecente[]> {
    try {
      const ultimos7Dias = subDays(new Date(), 7);
      const atividades: AtividadeRecente[] = [];

      // Buscar recursos criados recentemente
      const { data: recursosNovos } = await supabase
        .from('recursos')
        .select('id, created_at, clients(nome)')
        .eq('company_id', companyId)
        .gte('created_at', ultimos7Dias.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      recursosNovos?.forEach((r: any) => {
        atividades.push({
          id: `recurso-${r.id}`,
          tipo: 'recurso_criado',
          descricao: `Novo recurso criado para ${r.clients?.nome || 'cliente'}`,
          data: r.created_at,
          icone: 'FileText',
          cor: 'blue'
        });
      });

      // Buscar pagamentos recebidos
      const { data: pagamentos } = await supabase
        .from('service_orders')
        .select('id, paid_at, amount, clients(nome)')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .gte('paid_at', ultimos7Dias.toISOString())
        .order('paid_at', { ascending: false })
        .limit(5);

      pagamentos?.forEach((p: any) => {
        atividades.push({
          id: `pagamento-${p.id}`,
          tipo: 'pagamento_recebido',
          descricao: `Pagamento de R$ ${parseFloat(p.amount).toFixed(2)} recebido de ${p.clients?.nome || 'cliente'}`,
          data: p.paid_at,
          icone: 'DollarSign',
          cor: 'green'
        });
      });

      // Ordenar por data e limitar
      return atividades
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Erro ao buscar atividades recentes:', error);
      throw error;
    }
  }
}

export const dashboardDespachanteService = new DashboardDespachanteService();
