import { useEffect, useState } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Car,
  Calendar,
  DollarSign,
  Download,
  Eye
} from 'lucide-react';
import { useMultasStore } from '@/stores/multasStore';
import { useAuthStore } from '@/stores/authStore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  className?: string;
}

function StatCard({ title, value, icon: Icon, color, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200 p-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={cn('p-3 rounded-lg', color)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardCliente() {
  const { user } = useAuthStore();
  const { multas, recursos, getEstatisticas, isLoading } = useMultasStore();
  const [timeRange, setTimeRange] = useState('all');

  // Filtrar multas do cliente logado
  const minhasMultas = multas.filter(m => m.client_id === user?.id);
  const meusRecursos = recursos.filter(r => {
    const multa = multas.find(m => m.id === r.multa_id);
    return multa?.client_id === user?.id;
  });

  const stats = {
    total: minhasMultas.length,
    pendentes: minhasMultas.filter(m => m.status === 'pendente').length,
    emRecurso: minhasMultas.filter(m => m.status === 'em_recurso').length,
    deferidas: minhasMultas.filter(m => m.status === 'recurso_deferido').length,
    valorTotal: minhasMultas.reduce((sum, m) => sum + m.valor_final, 0),
    valorEconomizado: minhasMultas.filter(m => m.status === 'recurso_deferido').reduce((sum, m) => sum + m.valor_final, 0)
  };

  // Dados para gráficos
  const statusDistribution = [
    { name: 'Pendentes', value: stats.pendentes, color: '#F59E0B' },
    { name: 'Em Recurso', value: stats.emRecurso, color: '#3B82F6' },
    { name: 'Deferidas', value: stats.deferidas, color: '#10B981' },
    { name: 'Indeferidas', value: minhasMultas.filter(m => m.status === 'recurso_indeferido').length, color: '#EF4444' }
  ].filter(item => item.value > 0);

  const multasPorMes = [
    { mes: 'Jan', multas: 2, valor: 380 },
    { mes: 'Fev', multas: 1, valor: 195 },
    { mes: 'Mar', multas: 0, valor: 0 },
    { mes: 'Abr', multas: 3, valor: 580 },
    { mes: 'Mai', multas: 1, valor: 293 },
    { mes: 'Jun', multas: 0, valor: 0 }
  ];

  const multasRecentes = minhasMultas.slice(0, 5);
  const recursosRecentes = meusRecursos.slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando suas informações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Portal</h1>
          <p className="text-gray-600 mt-1">Bem-vindo, {user?.email}</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas as multas</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="1y">Último ano</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Multas"
          value={stats.total}
          icon={FileText}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Pendentes"
          value={stats.pendentes}
          icon={Clock}
          color="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          title="Em Recurso"
          value={stats.emRecurso}
          icon={AlertTriangle}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Valor Economizado"
          value={`R$ ${(stats.valorEconomizado || 0).toFixed(2)}`}
          icon={DollarSign}
          color="bg-green-50 text-green-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status das Multas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Status das Multas</h3>
          {statusDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Multas']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-4 mt-4">
                {statusDistribution.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma multa encontrada</p>
            </div>
          )}
        </div>

        {/* Multas por Mês */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Multas por Mês</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={multasPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'multas' ? `${value} multas` : `R$ ${(Number(value) || 0).toFixed(2)}`,
                  name === 'multas' ? 'Quantidade' : 'Valor'
                ]}
              />
              <Bar dataKey="multas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multas Recentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Minhas Multas</h3>
            <span className="text-sm text-gray-600">{multasRecentes.length} de {stats.total}</span>
          </div>
          <div className="space-y-4">
            {multasRecentes.length > 0 ? multasRecentes.map((multa) => (
              <div key={multa.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    multa.status === 'pendente' ? 'bg-yellow-100' :
                    multa.status === 'em_recurso' ? 'bg-blue-100' :
                    multa.status === 'recurso_deferido' ? 'bg-green-100' :
                    'bg-red-100'
                  )}>
                    <Car className={cn(
                      'w-5 h-5',
                      multa.status === 'pendente' ? 'text-yellow-600' :
                      multa.status === 'em_recurso' ? 'text-blue-600' :
                      multa.status === 'recurso_deferido' ? 'text-green-600' :
                      'text-red-600'
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{multa.placa_veiculo}</p>
                    <p className="text-sm text-gray-600">{multa.descricao_infracao}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(multa.data_infracao), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">R$ {(multa.valor_final || 0).toFixed(2)}</p>
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    multa.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                    multa.status === 'em_recurso' ? 'bg-blue-100 text-blue-800' :
                    multa.status === 'recurso_deferido' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  )}>
                    {multa.status === 'pendente' ? 'Pendente' :
                     multa.status === 'em_recurso' ? 'Em Recurso' :
                     multa.status === 'recurso_deferido' ? 'Deferida' : 'Indeferida'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma multa encontrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Recursos em Andamento */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Meus Recursos</h3>
            <span className="text-sm text-gray-600">{recursosRecentes.length} recursos</span>
          </div>
          <div className="space-y-4">
            {recursosRecentes.length > 0 ? recursosRecentes.map((recurso) => {
              const multa = multas.find(m => m.id === recurso.multa_id);
              return (
                <div key={recurso.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        recurso.status === 'deferido' ? 'bg-green-100' :
                        recurso.status === 'indeferido' ? 'bg-red-100' :
                        recurso.status === 'em_analise' ? 'bg-blue-100' :
                        'bg-gray-100'
                      )}>
                        {recurso.status === 'deferido' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : recurso.status === 'indeferido' ? (
                          <XCircle className="w-4 h-4 text-red-600" />
                        ) : recurso.status === 'em_analise' ? (
                          <Clock className="w-4 h-4 text-blue-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{recurso.numero_processo}</p>
                        <p className="text-sm text-gray-600">{multa?.placa_veiculo} • {multa?.codigo_infracao}</p>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      recurso.status === 'deferido' ? 'bg-green-100 text-green-800' :
                      recurso.status === 'indeferido' ? 'bg-red-100 text-red-800' :
                      recurso.status === 'em_analise' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    )}>
                      {recurso.status === 'deferido' ? 'Deferido' :
                       recurso.status === 'indeferido' ? 'Indeferido' :
                       recurso.status === 'em_analise' ? 'Em Análise' : 'Rascunho'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Probabilidade: {recurso.probabilidadeSucesso}%</span>
                      <span>Enviado: {format(new Date(recurso.data_protocolo), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum recurso em andamento</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Resumo Financeiro</h3>
            <p className="text-blue-700 mt-1">Economia gerada pelos recursos deferidos</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-900">R$ {(stats.valorEconomizado || 0).toFixed(2)}</p>
          <p className="text-sm text-blue-700">economizados de R$ {(stats.valorTotal || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}