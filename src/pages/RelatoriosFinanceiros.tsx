import { useState, useEffect } from 'react';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  FileText,
  CreditCard,
  Users,
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { relatoriosFinanceirosService } from '../services/relatoriosFinanceirosService';

interface FinancialData {
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

interface ReceitaMensal {
  mes: string;
  receita: number;
  despesas: number;
  lucro: number;
  clientes: number;
}

interface ReceitaPorCliente {
  cliente: string;
  receita: number;
  recursos: number;
  percentual: number;
}

interface ReceitaPorServico {
  servico: string;
  valor: number;
  quantidade: number;
  percentual: number;
  cor: string;
}

function StatCard({ title, value, change, changeType, icon: Icon, prefix = '', suffix = '' }: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {prefix}{value}{suffix}
          </p>
          {change && (
            <p className={cn(
              'text-sm mt-2 flex items-center',
              changeType === 'positive' ? 'text-green-600' : 
              changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
            )}>
              {changeType === 'positive' ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : changeType === 'negative' ? (
                <TrendingDown className="w-4 h-4 mr-1" />
              ) : null}
              {change}
            </p>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>

    </div>
  );
}

// Componente de formulário para relatório personalizado
const CustomReportForm = ({ onSave, onCancel }: {
  onSave: (data: any) => void;
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dateRange: '30',
    metrics: {
      receita: true,
      despesas: true,
      lucro: true,
      clientes: false,
      recursos: false
    },
    groupBy: 'mes',
    format: 'pdf'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Relatório
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Relatório Mensal de Receitas"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <select
              value={formData.dateRange}
              onChange={(e) => setFormData(prev => ({ ...prev, dateRange: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 3 meses</option>
              <option value="365">Último ano</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Descreva o objetivo deste relatório..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Métricas a Incluir
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'receita', label: 'Receita Total' },
              { key: 'despesas', label: 'Despesas' },
              { key: 'lucro', label: 'Lucro Líquido' },
              { key: 'clientes', label: 'Número de Clientes' },
              { key: 'recursos', label: 'Recursos Processados' }
            ].map(metric => (
              <label key={metric.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.metrics[metric.key as keyof typeof formData.metrics]}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    metrics: {
                      ...prev.metrics,
                      [metric.key]: e.target.checked
                    }
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{metric.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agrupar Por
            </label>
            <select
              value={formData.groupBy}
              onChange={(e) => setFormData(prev => ({ ...prev, groupBy: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="dia">Dia</option>
              <option value="semana">Semana</option>
              <option value="mes">Mês</option>
              <option value="trimestre">Trimestre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Formato de Exportação
            </label>
            <select
              value={formData.format}
              onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Gerar Relatório
        </button>
      </div>
    </form>
  );
};

interface Pagamento {
  data: string;
  cliente: string;
  tipo_servico: string;
  valor_total: number;
  comissao: number;
  percentual: number;
  status: string;
}

export default function RelatoriosFinanceiros() {
  const { user } = useAuthStore();
  const [timeRange, setTimeRange] = useState('12m');
  const [showCustomReportModal, setShowCustomReportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  
  const [financialData, setFinancialData] = useState<FinancialData>({
    receita: 0,
    recebido: 0,
    splitPendente: 0,
    splitRecebido: 0,
    despesas: 0,
    lucro: 0,
    recursosProcessados: 0,
    clientesAtivos: 0,
    ticketMedio: 0,
    crescimentoMensal: 0,
    taxaConversao: 0
  });

  // Estados para dados reais
  const [receitaMensal, setReceitaMensal] = useState<ReceitaMensal[]>([]);
  const [receitaPorCliente, setReceitaPorCliente] = useState<ReceitaPorCliente[]>([]);
  const [receitaPorServico, setReceitaPorServico] = useState<ReceitaPorServico[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);

  // Função para carregar dados financeiros
  const loadFinancialData = async () => {
    if (!user?.company_id) {
      console.log('Company ID não disponível');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Carregando dados financeiros para company:', user.company_id);

      // Determinar número de meses baseado no timeRange
      const meses = timeRange === '1m' ? 1 : timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;

      // Carregar todos os dados em paralelo
      const [dados, mensal, clientes, servicos, pagamentosData] = await Promise.all([
        relatoriosFinanceirosService.getDadosFinanceiros(user.company_id, meses),
        relatoriosFinanceirosService.getReceitaMensal(user.company_id, meses),
        relatoriosFinanceirosService.getReceitaPorCliente(user.company_id),
        relatoriosFinanceirosService.getReceitaPorServico(user.company_id),
        relatoriosFinanceirosService.getPagamentos(user.company_id, dataInicio, dataFim, statusFiltro)
      ]);

      console.log('✅ Dados carregados:', { dados, mensal, clientes, servicos, pagamentosData });

      setFinancialData(dados);
      setReceitaMensal(mensal);
      setReceitaPorCliente(clientes);
      setReceitaPorServico(servicos);
      setPagamentos(pagamentosData);

      toast.success('Dados financeiros carregados com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao carregar dados financeiros:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [user?.company_id, timeRange]);

  const handleExportReport = (type: 'pdf' | 'excel') => {
    toast.success(`Relatório ${type.toUpperCase()} exportado com sucesso!`);
  };

  const handleGenerateCustomReport = () => {
    setShowCustomReportModal(true);
  };

  const handleSaveCustomReport = (reportData: any) => {
    // Simular geração do relatório personalizado
    toast.success(`Relatório "${reportData.name}" gerado com sucesso!`);
    setShowCustomReportModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando relatórios financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios Financeiros</h1>
        <p className="text-gray-600 mt-1">Visão geral dos pagamentos e serviços</p>
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total a Receber = cobranças pendentes */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 font-medium">Total a Receber</p>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">R$ {financialData.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        {/* Recebido = cobranças recebidas (paid) */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 font-medium">Recebido</p>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">R$ {financialData.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        {/* Serviços Criados = split pendente do despachante */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-purple-700 font-medium">Serviços Criados (valor do despachante)</p>
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900">R$ {financialData.splitPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        {/* Serviços Pagos = split recebido do despachante */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-orange-700 font-medium">Serviços Pagos (valor do despachante)</p>
            <CheckCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-900">R$ {financialData.splitRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Tabela de Detalhes dos Pagamentos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Detalhes dos Pagamentos</h2>
            
            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="dd/mm/aaaa"
                />
                <span className="text-gray-500">até</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="dd/mm/aaaa"
                />
              </div>
              
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos os Status</option>
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
                <option value="cancelled">Cancelado</option>
              </select>
              
              <button
                onClick={loadFinancialData}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filtrar
              </button>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          {pagamentos.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum pagamento encontrado</p>
              <p className="text-sm text-gray-400 mt-1">Tente ajustar os filtros ou verifique mais tarde.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">Data</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">Cliente</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">Tipo de Serviço</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">Valor Total</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">Sua Comissão</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">%</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagamentos.map((pagamento: any, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {format(new Date(pagamento.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{pagamento.cliente}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{pagamento.tipo_servico}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                      R$ {pagamento.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-green-600">
                      R$ {pagamento.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-gray-600">{pagamento.percentual}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        pagamento.status === 'paid' ? 'bg-green-100 text-green-800' :
                        pagamento.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      )}>
                        {pagamento.status === 'paid' ? 'Pago' :
                         pagamento.status === 'pending' ? 'Pendente' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
