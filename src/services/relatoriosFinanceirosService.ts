import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface DadosFinanceiros {
  receita: number; // Total a receber (pending)
  recebido: number; // Total recebido (paid)
  splitPendente: number; // Split despachante (pending)
  splitRecebido: number; // Split despachante (paid)
  despesas: number;
  lucro: number;
  recursosProcessados: number;
  clientesAtivos: number;
  ticketMedio: number;
  crescimentoMensal: number;
  taxaConversao: number;
}

export interface ReceitaMensal {
  mes: string;
  receita: number;
  despesas: number;
  lucro: number;
  clientes: number;
}

export interface ReceitaPorCliente {
  cliente: string;
  receita: number;
  recursos: number;
  percentual: number;
}

export interface ReceitaPorServico {
  servico: string;
  valor: number;
  quantidade: number;
  percentual: number;
  cor: string;
}

class RelatoriosFinanceirosService {
  /**
   * Buscar dados financeiros gerais
   */
  async getDadosFinanceiros(companyId: string, meses: number = 12): Promise<DadosFinanceiros> {
    try {
      const dataInicio = subMonths(new Date(), meses);
      
      // Buscar todas as service_orders (pending e paid)
      const { data: serviceOrders, error } = await supabase
        .from('service_orders')
        .select('amount, created_at, client_id, status, splits_config')
        .eq('company_id', companyId)
        .gte('created_at', dataInicio.toISOString());

      if (error) throw error;

      // Total a Receber = cobranças pendentes
      const receita = serviceOrders?.filter(o => o.status === 'pending' || o.status === 'pending_payment')
        .reduce((sum, order) => sum + (parseFloat(order.amount) || 0), 0) || 0;
      
      // Recebido = cobranças pagas
      const recebido = serviceOrders?.filter(o => o.status === 'paid')
        .reduce((sum, order) => sum + (parseFloat(order.amount) || 0), 0) || 0;

      // Calcular recursos processados (service_orders com multa_id)
      const recursosProcessados = serviceOrders?.filter(order => order.multa_id).length || 0;

      // Calcular clientes únicos ativos
      const clientesUnicos = new Set(serviceOrders?.map(order => order.client_id).filter(Boolean));
      const clientesAtivos = clientesUnicos.size;

      // Calcular split do despachante (valor que o despachante recebe)
      // Extrair margem_despachante do splits_config ou usar 15% do amount como fallback
      const splitPendente = serviceOrders?.filter(o => o.status === 'pending' || o.status === 'pending_payment')
        .reduce((sum, order) => {
          const amount = parseFloat(order.amount) || 0;
          const splitsConfig = order.splits_config as any;
          const margemDespachante = splitsConfig?.margem_despachante || (amount * 0.15);
          return sum + margemDespachante;
        }, 0) || 0;
      
      // Split recebido = margem_despachante das orders paid
      const splitRecebido = serviceOrders?.filter(o => o.status === 'paid')
        .reduce((sum, order) => {
          const amount = parseFloat(order.amount) || 0;
          const splitsConfig = order.splits_config as any;
          const margemDespachante = splitsConfig?.margem_despachante || (amount * 0.15);
          return sum + margemDespachante;
        }, 0) || 0;

      // Calcular ticket médio
      const ticketMedio = clientesAtivos > 0 ? receita / clientesAtivos : 0;

      // Calcular crescimento mensal (comparar último mês com penúltimo)
      const mesAtual = startOfMonth(new Date());
      const mesAnterior = startOfMonth(subMonths(new Date(), 1));
      
      const receitaMesAtual = serviceOrders?.filter(order => 
        new Date(order.created_at) >= mesAtual && order.status === 'pending'
      ).reduce((sum, order) => sum + (parseFloat(order.value) || 0), 0) || 0;

      const receitaMesAnterior = serviceOrders?.filter(order => 
        new Date(order.created_at) >= mesAnterior && new Date(order.created_at) < mesAtual && order.status === 'pending'
      ).reduce((sum, order) => sum + (parseFloat(order.value) || 0), 0) || 0;

      const crescimentoMensal = receitaMesAnterior > 0 
        ? ((receitaMesAtual - receitaMesAnterior) / receitaMesAnterior) * 100 
        : 0;

      // Despesas estimadas (30% da receita como exemplo)
      const despesas = receita * 0.3;
      const lucro = receita - despesas;

      // Taxa de conversão (assumindo que todos pagos foram convertidos)
      const taxaConversao = 100; // Simplificado

      return {
        receita,
        recebido,
        splitPendente,
        splitRecebido,
        despesas,
        lucro,
        recursosProcessados,
        clientesAtivos,
        ticketMedio,
        crescimentoMensal,
        taxaConversao
      };
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
      throw error;
    }
  }

  /**
   * Buscar receita mensal dos últimos meses
   */
  async getReceitaMensal(companyId: string, meses: number = 12): Promise<ReceitaMensal[]> {
    try {
      const dataInicio = subMonths(new Date(), meses);
      
      const { data: serviceOrders, error } = await supabase
        .from('service_orders')
        .select('amount, created_at, client_id')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .gte('created_at', dataInicio.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Agrupar por mês
      const receitaPorMes: { [key: string]: { receita: number; clientes: Set<string> } } = {};

      serviceOrders?.forEach(order => {
        const data = new Date(order.created_at);
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const mes = meses[data.getMonth()];
        
        if (!receitaPorMes[mes]) {
          receitaPorMes[mes] = { receita: 0, clientes: new Set() };
        }
        
        receitaPorMes[mes].receita += parseFloat(order.amount) || 0;
        if (order.client_id) {
          receitaPorMes[mes].clientes.add(order.client_id);
        }
      });

      // Converter para array
      return Object.entries(receitaPorMes).map(([mes, dados]) => {
        const receita = dados.receita;
        const despesas = receita * 0.3; // 30% estimado
        const lucro = receita - despesas;
        
        return {
          mes,
          receita,
          despesas,
          lucro,
          clientes: dados.clientes.size
        };
      });
    } catch (error) {
      console.error('Erro ao buscar receita mensal:', error);
      throw error;
    }
  }

  /**
   * Buscar receita por cliente (top 5)
   */
  async getReceitaPorCliente(companyId: string): Promise<ReceitaPorCliente[]> {
    try {
      const { data: serviceOrders, error } = await supabase
        .from('service_orders')
        .select(`
          amount,
          client_id,
          clients (
            nome
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Agrupar por cliente
      const receitaPorCliente: { [key: string]: { nome: string; receita: number; recursos: number } } = {};

      serviceOrders?.forEach((order: any) => {
        const clientId = order.client_id;
        const clientNome = order.clients?.nome || 'Cliente sem nome';
        
        if (!receitaPorCliente[clientId]) {
          receitaPorCliente[clientId] = { nome: clientNome, receita: 0, recursos: 0 };
        }
        
        receitaPorCliente[clientId].receita += parseFloat(order.amount) || 0;
        receitaPorCliente[clientId].recursos += 1;
      });

      // Calcular receita total para percentuais
      const receitaTotal = Object.values(receitaPorCliente).reduce((sum, c) => sum + c.receita, 0);

      // Converter para array e ordenar por receita
      const resultado = Object.entries(receitaPorCliente)
        .map(([_, dados]) => ({
          cliente: dados.nome,
          receita: dados.receita,
          recursos: dados.recursos,
          percentual: receitaTotal > 0 ? (dados.receita / receitaTotal) * 100 : 0
        }))
        .sort((a, b) => b.receita - a.receita)
        .slice(0, 5); // Top 5

      return resultado;
    } catch (error) {
      console.error('Erro ao buscar receita por cliente:', error);
      throw error;
    }
  }

  /**
   * Buscar detalhes dos pagamentos
   */
  async getPagamentos(companyId: string, dataInicio?: string, dataFim?: string, status?: string) {
    try {
      let query = supabase
        .from('service_orders')
        .select(`
          id,
          created_at,
          amount,
          status,
          multa_type,
          client_id,
          clients (
            nome
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Filtros opcionais
      if (dataInicio) {
        query = query.gte('created_at', dataInicio);
      }
      if (dataFim) {
        query = query.lte('created_at', dataFim);
      }
      if (status && status !== 'todos') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map((order: any) => ({
        id: order.id,
        data: order.created_at,
        cliente: order.clients?.nome || 'Cliente não identificado',
        tipo_servico: order.multa_type || 'Não especificado',
        valor_total: parseFloat(order.amount) || 0,
        comissao: (parseFloat(order.amount) || 0) * 0.15, // 15% de comissão
        percentual: 15,
        status: order.status
      })) || [];
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      throw error;
    }
  }

  /**
   * Buscar receita por tipo de serviço
   */
  async getReceitaPorServico(companyId: string): Promise<ReceitaPorServico[]> {
    try {
      const { data: serviceOrders, error } = await supabase
        .from('service_orders')
        .select('amount, multa_type')
        .eq('company_id', companyId)
        .eq('status', 'paid');

      if (error) throw error;

      // Agrupar por tipo de multa
      const receitaPorTipo: { [key: string]: { valor: number; quantidade: number } } = {};

      serviceOrders?.forEach(order => {
        const tipo = order.multa_type || 'Não especificado';
        
        if (!receitaPorTipo[tipo]) {
          receitaPorTipo[tipo] = { valor: 0, quantidade: 0 };
        }
        
        receitaPorTipo[tipo].valor += parseFloat(order.amount) || 0;
        receitaPorTipo[tipo].quantidade += 1;
      });

      // Calcular total para percentuais
      const valorTotal = Object.values(receitaPorTipo).reduce((sum, t) => sum + t.valor, 0);

      // Cores para os gráficos
      const cores = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

      // Converter para array
      const resultado = Object.entries(receitaPorTipo)
        .map(([servico, dados], index) => ({
          servico: servico || 'Geral',
          valor: dados.valor,
          quantidade: dados.quantidade,
          percentual: valorTotal > 0 ? (dados.valor / valorTotal) * 100 : 0,
          cor: cores[index % cores.length]
        }))
        .sort((a, b) => b.valor - a.valor);

      return resultado;
    } catch (error) {
      console.error('Erro ao buscar receita por serviço:', error);
      throw error;
    }
  }
}

export const relatoriosFinanceirosService = new RelatoriosFinanceirosService();
