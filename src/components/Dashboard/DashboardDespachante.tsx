import { useEffect, useState } from 'react';
import { 
  Users, 
  FileText, 
  TrendingUp, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Plus
} from 'lucide-react';
import { useMultasStore } from '@/stores/multasStore';
import { useAuthStore } from '@/stores/authStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  onClick?: () => void;
}

function StatCard({ title, value, change, changeType, icon: Icon, className, onClick }: StatCardProps) {
  return (
    <div 
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-blue-300',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <p className={cn(
              'text-sm mt-2 flex items-center',
              changeType === 'positive' ? 'text-green-600' : 
              changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
            )}>
              <TrendingUp className={cn(
                'w-4 h-4 mr-1',
                changeType === 'negative' && 'rotate-180'
              )} />
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

export default function DashboardDespachante() {
  const { user } = useAuthStore();
  const { multas, recursos, getEstatisticas, criarRecurso, isLoading } = useMultasStore();
  const [timeRange, setTimeRange] = useState('30d');
  const [isCreatingResource, setIsCreatingResource] = useState(false);

  const stats = getEstatisticas();

  // Mock data para gráficos
  const recursosUltimos30Dias = [
    { dia: '1', criados: 2, deferidos: 1, indeferidos: 0 },
    { dia: '5', criados: 3, deferidos: 2, indeferidos: 1 },
    { dia: '10', criados: 1, deferidos: 1, indeferidos: 0 },
    { dia: '15', criados: 4, deferidos: 3, indeferidos: 1 },
    { dia: '20', criados: 2, deferidos: 1, indeferidos: 1 },
    { dia: '25', criados: 3, deferidos: 2, indeferidos: 0 },
    { dia: '30', criados: 2, deferidos: 2, indeferidos: 0 }
  ];

  const tiposInfracao = [
    { name: 'Velocidade', value: 45, color: '#3B82F6' },
    { name: 'Estacionamento', value: 30, color: '#10B981' },
    { name: 'Semáforo', value: 15, color: '#F59E0B' },
    { name: 'Outras', value: 10, color: '#EF4444' }
  ];

  const multasPendentes = multas.filter(m => m.status === 'pendente').slice(0, 5);
  const recursosRecentes = recursos.slice(0, 5);

  const handleCriarRecurso = async (multaId: string) => {
    setIsCreatingResource(true);
    try {
      await criarRecurso(multaId);
      toast.success('Recurso criado com sucesso pela IA!');
    } catch (error) {
      toast.error('Erro ao criar recurso');
    } finally {
      setIsCreatingResource(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard do Despachante</h1>
          <p className="text-gray-600 mt-1">Bem-vindo, {user?.email}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Multas"
          value={stats.totalMultas}
          change="+5 esta semana"
          changeType="positive"
          icon={FileText}
        />
        <StatCard
          title="Multas Pendentes"
          value={stats.multasPendentes}
          change="-2 vs semana anterior"
          changeType="positive"
          icon={Clock}
        />
        <StatCard
          title="Taxa de Sucesso"
          value={`${stats.taxaSucesso}%`}
          change="+3% vs mês anterior"
          changeType="positive"
          icon={CheckCircle}
        />
        <StatCard
          title="Recursos em Andamento"
          value={stats.recursosAtivos}
          change="+2 esta semana"
          changeType="positive"
          icon={Zap}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance de Recursos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Performance de Recursos</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="text-gray-600">Criados</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                <span className="text-gray-600">Deferidos</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span className="text-gray-600">Indeferidos</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={recursosUltimos30Dias}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dia" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Line type="monotone" dataKey="criados" stroke="#3B82F6" strokeWidth={2} />
              <Line type="monotone" dataKey="deferidos" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="indeferidos" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tipos de Infração */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Tipos de Infração</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tiposInfracao}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {tiposInfracao.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Percentual']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-6 mt-4">
            {tiposInfracao.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multas Pendentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Multas Pendentes</h3>
            <span className="text-sm text-gray-600">{multasPendentes.length} de {stats.multasPendentes}</span>
          </div>
          <div className="space-y-4">
            {multasPendentes.map((multa) => (
              <div key={multa.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{multa.client_id}</p>
                        <p className="text-sm text-gray-600">{multa.placa_veiculo} • {multa.codigo_infracao}</p>
                        <p className="text-sm text-gray-500">R$ {(multa.valor_final || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    Analisar
                  </span>
                  <button
                    onClick={() => handleCriarRecurso(multa.id)}
                    disabled={isCreatingResource}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
                  >
                    <Zap className="w-3 h-3" />
                    <span>IA</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recursos Recentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recursos Recentes</h3>
            <span className="text-sm text-gray-600">{recursosRecentes.length} recursos</span>
          </div>
          <div className="space-y-4">
            {recursosRecentes.map((recurso) => {
              const multa = multas.find(m => m.id === recurso.multa_id);
              return (
                <div key={recurso.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      recurso.status === 'deferido' ? 'bg-green-100' :
                      recurso.status === 'indeferido' ? 'bg-red-100' :
                      recurso.status === 'em_analise' ? 'bg-blue-100' :
                      'bg-gray-100'
                    )}>
                      {recurso.status === 'deferido' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : recurso.status === 'indeferido' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : recurso.status === 'em_analise' ? (
                        <Clock className="w-5 h-5 text-blue-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{multa?.client_id}</p>
                      <p className="text-sm text-gray-600">{recurso.numero_processo}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded-full',
                          recurso.status === 'deferido' ? 'bg-green-100 text-green-800' :
                          recurso.status === 'indeferido' ? 'bg-red-100 text-red-800' :
                          recurso.status === 'em_analise' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        )}>
                          {recurso.status === 'deferido' ? 'Deferido' :
                           recurso.status === 'indeferido' ? 'Indeferido' :
                           recurso.status === 'em_analise' ? 'Em Análise' : 'Rascunho'}
                        </span>
                        {recurso.geradoPorIA && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                            IA
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">R$ {multa?.valor_final?.toFixed(2) || '0,00'}</p>
                    <p className="text-xs text-gray-500">valor</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}