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

interface FinancialData {
  receita: number;
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

export default function RelatoriosFinanceiros() {
  const { user } = useAuthStore();
  const [timeRange, setTimeRange] = useState('12m');
  const [showCustomReportModal, setShowCustomReportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [financialData, setFinancialData] = useState<FinancialData>({
    receita: 0,
    despesas: 0,
    lucro: 0,
    recursosProcessados: 0,
    clientesAtivos: 0,
    ticketMedio: 0,
    crescimentoMensal: 0,
    taxaConversao: 0
  });

  // Mock data
  const receitaMensal: ReceitaMensal[] = [
    { mes: 'Jan', receita: 15000, despesas: 8000, lucro: 7000, clientes: 45 },
    { mes: 'Fev', receita: 18000, despesas: 9000, lucro: 9000, clientes: 52 },
    { mes: 'Mar', receita: 22000, despesas: 10000, lucro: 12000, clientes: 58 },
    { mes: 'Abr', receita: 25000, despesas: 11000, lucro: 14000, clientes: 65 },
    { mes: 'Mai', receita: 28000, despesas: 12000, lucro: 16000, clientes: 72 },
    { mes: 'Jun', receita: 32000, despesas: 13000, lucro: 19000, clientes: 78 },
    { mes: 'Jul', receita: 35000, despesas: 14000, lucro: 21000, clientes: 85 },
    { mes: 'Ago', receita: 38000, despesas: 15000, lucro: 23000, clientes: 92 },
    { mes: 'Set', receita: 42000, despesas: 16000, lucro: 26000, clientes: 98 },
    { mes: 'Out', receita: 45000, despesas: 17000, lucro: 28000, clientes: 105 },
    { mes: 'Nov', receita: 48000, despesas: 18000, lucro: 30000, clientes: 112 },
    { mes: 'Dez', receita: 52000, despesas: 19000, lucro: 33000, clientes: 120 }
  ];

  const receitaPorCliente: ReceitaPorCliente[] = [
    { cliente: 'João Silva Santos', receita: 2500, recursos: 8, percentual: 15.2 },
    { cliente: 'Maria Oliveira Costa', receita: 1800, recursos: 6, percentual: 10.9 },
    { cliente: 'Carlos Eduardo Lima', receita: 1500, recursos: 5, percentual: 9.1 },
    { cliente: 'Ana Paula Ferreira', receita: 1200, recursos: 4, percentual: 7.3 },
    { cliente: 'Roberto Santos Silva', receita: 1000, recursos: 3, percentual: 6.1 }
  ];

  const receitaPorServico: ReceitaPorServico[] = [
    { servico: 'Recursos de Velocidade', valor: 18500, quantidade: 45, percentual: 35.6, cor: '#3B82F6' },
    { servico: 'Recursos de Estacionamento', valor: 12300, quantidade: 32, percentual: 23.7, cor: '#10B981' },
    { servico: 'Recursos de Semáforo', valor: 8900, quantidade: 21, percentual: 17.1, cor: '#F59E0B' },
    { servico: 'Recursos Administrativos', valor: 6200, quantidade: 15, percentual: 11.9, cor: '#EF4444' },
    { servico: 'Outros Serviços', valor: 6100, quantidade: 18, percentual: 11.7, cor: '#8B5CF6' }
  ];

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setFinancialData({
        receita: 52000,
        despesas: 19000,
        lucro: 33000,
        recursosProcessados: 131,
        clientesAtivos: 120,
        ticketMedio: 433.33,
        crescimentoMensal: 8.3,
        taxaConversao: 78.5
      });
      setIsLoading(false);
    }, 1000);
  }, [timeRange]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios Financeiros</h1>
          <p className="text-gray-600 mt-1">Análise detalhada da performance financeira</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="3m">Últimos 3 meses</option>
            <option value="6m">Últimos 6 meses</option>
            <option value="12m">Últimos 12 meses</option>
            <option value="custom">Período personalizado</option>
          </select>
          <button
            onClick={() => handleExportReport('excel')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExportReport('pdf')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Receita Total"
          value={financialData.receita.toLocaleString('pt-BR')}
          change="+8.3% vs mês anterior"
          changeType="positive"
          icon={DollarSign}
          prefix="R$ "
        />
        <StatCard
          title="Lucro Líquido"
          value={financialData.lucro.toLocaleString('pt-BR')}
          change="+12.5% vs mês anterior"
          changeType="positive"
          icon={TrendingUp}
          prefix="R$ "
        />
        <StatCard
          title="Ticket Médio"
          value={(financialData.ticketMedio || 0).toFixed(2)}
          change="+5.2% vs mês anterior"
          changeType="positive"
          icon={Target}
          prefix="R$ "
        />
        <StatCard
          title="Taxa de Conversão"
          value={(financialData.taxaConversao || 0).toFixed(1)}
          change="+2.1% vs mês anterior"
          changeType="positive"
          icon={CheckCircle}
          suffix="%"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita vs Despesas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Receita vs Despesas</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="text-gray-600">Receita</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span className="text-gray-600">Despesas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                <span className="text-gray-600">Lucro</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={receitaMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Area type="monotone" dataKey="receita" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="despesas" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
              <Area type="monotone" dataKey="lucro" stackId="3" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Receita por Serviço */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Receita por Tipo de Serviço</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={receitaPorServico}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="valor"
              >
                {receitaPorServico.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {receitaPorServico.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.cor }}></div>
                  <span className="text-gray-600">{item.servico}</span>
                </div>
                <span className="font-medium text-gray-900">{item.percentual}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crescimento de Clientes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Crescimento de Clientes</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={receitaMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                formatter={(value: number) => [value, 'Clientes']}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="clientes" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clientes por Receita */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Clientes por Receita</h3>
          </div>
          <div className="space-y-4">
            {receitaPorCliente.map((cliente, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{cliente.cliente}</p>
                    <p className="text-sm text-gray-600">{cliente.recursos} recursos processados</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">R$ {cliente.receita.toLocaleString('pt-BR')}</p>
                  <p className="text-sm text-gray-600">{cliente.percentual}% do total</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumo Mensal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Resumo Mensal Detalhado</h3>
            <button
              onClick={handleGenerateCustomReport}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Personalizar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Mês</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Receita</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Despesas</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Lucro</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-600">Margem</th>
                </tr>
              </thead>
              <tbody>
                {receitaMensal.slice(-6).map((item, index) => {
                  const margem = (((item.lucro || 0) / (item.receita || 1)) * 100).toFixed(1);
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium text-gray-900">{item.mes}</td>
                      <td className="py-3 px-2 text-right text-gray-900">R$ {item.receita.toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-2 text-right text-gray-900">R$ {item.despesas.toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-2 text-right font-medium text-green-600">R$ {item.lucro.toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-2 text-right text-gray-600">{margem}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Análise de Serviços */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Análise por Tipo de Serviço</h3>
          </div>
          <div className="space-y-4">
            {receitaPorServico.map((servico, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{servico.servico}</h4>
                  <span className="text-sm font-medium text-gray-600">{servico.percentual}%</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Receita</p>
                    <p className="font-semibold text-gray-900">R$ {servico.valor.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Quantidade</p>
                    <p className="font-semibold text-gray-900">{servico.quantidade}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Ticket Médio</p>
                    <p className="font-semibold text-gray-900">R$ {((servico.valor || 0) / (servico.quantidade || 1)).toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full" 
                      style={{ 
                        width: `${servico.percentual}%`, 
                        backgroundColor: servico.cor 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="w-8 h-8" />
            <h3 className="text-lg font-semibold">Relatório Personalizado</h3>
          </div>
          <p className="text-blue-100 mb-4">Crie relatórios customizados com os dados que você precisa</p>
          <button 
            onClick={handleGenerateCustomReport}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Criar Relatório
          </button>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="w-8 h-8" />
            <h3 className="text-lg font-semibold">Projeção de Receita</h3>
          </div>
          <p className="text-green-100 mb-4">Baseado no crescimento atual, sua receita projetada para o próximo mês é:</p>
          <p className="text-2xl font-bold">R$ 56.160</p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="w-8 h-8" />
            <h3 className="text-lg font-semibold">Meta do Mês</h3>
          </div>
          <p className="text-purple-100 mb-4">Progresso da meta de receita mensal</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">R$ 52.000 / R$ 55.000</span>
            <span className="text-sm">94.5%</span>
          </div>
          <div className="w-full bg-purple-400 rounded-full h-2 mt-2">
            <div className="bg-white h-2 rounded-full" style={{ width: '94.5%' }}></div>
          </div>
        </div>
      </div>
      
      {/* Modal de Relatório Personalizado */}
      {showCustomReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Criar Relatório Personalizado
              </h2>
            </div>
            
            <CustomReportForm
              onSave={handleSaveCustomReport}
              onCancel={() => setShowCustomReportModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}