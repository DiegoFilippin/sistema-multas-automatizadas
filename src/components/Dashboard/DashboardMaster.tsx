import { useEffect, useState } from 'react';
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  FileText,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useEmpresasStore } from '@/stores/empresasStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}

function StatCard({ title, value, change, changeType, icon: Icon, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200 p-6', className)}>
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

export default function DashboardMaster() {
  const { empresas, getEstatisticasGerais, isLoading } = useEmpresasStore();
  const [timeRange, setTimeRange] = useState('30d');

  const stats = getEstatisticasGerais();

  // Mock data para gráficos
  const receitaMensal = [
    { mes: 'Jan', receita: 45000, empresas: 12 },
    { mes: 'Fev', receita: 52000, empresas: 15 },
    { mes: 'Mar', receita: 48000, empresas: 14 },
    { mes: 'Abr', receita: 61000, empresas: 18 },
    { mes: 'Mai', receita: 55000, empresas: 16 },
    { mes: 'Jun', receita: 67000, empresas: 20 }
  ];

  const distribuicaoPlanos = [
    { name: 'Básico', value: 8, color: '#3B82F6' },
    { name: 'Profissional', value: 12, color: '#10B981' },
    { name: 'Enterprise', value: 5, color: '#F59E0B' }
  ];

  const empresasRecentes = empresas.slice(0, 5);

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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrativo</h1>
          <p className="text-gray-600 mt-1">Visão geral da plataforma MultasTrae</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="1y">Último ano</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Empresas"
          value={stats.totalEmpresas}
          change="+12% vs mês anterior"
          changeType="positive"
          icon={Building2}
        />
        <StatCard
          title="Empresas Ativas"
          value={stats.empresasAtivas}
          change="+8% vs mês anterior"
          changeType="positive"
          icon={CheckCircle}
        />
        <StatCard
          title="Receita Mensal"
          value={`R$ ${stats.receitaMensal.toLocaleString('pt-BR')}`}
          change="+15% vs mês anterior"
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="Recursos Processados"
          value={stats.recursosProcessados}
          change="+23% vs mês anterior"
          changeType="positive"
          icon={FileText}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita Mensal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Receita Mensal</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span>Receita</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={receitaMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Receita']}
                labelStyle={{ color: '#374151' }}
              />
              <Bar dataKey="receita" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição de Planos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribuição de Planos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={distribuicaoPlanos}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {distribuicaoPlanos.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Empresas']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-6 mt-4">
            {distribuicaoPlanos.map((item, index) => (
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

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Empresas Recentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Empresas Recentes</h3>
          <div className="space-y-4">
            {empresasRecentes.map((empresa) => (
              <div key={empresa.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{empresa.nome}</p>
                    <p className="text-sm text-gray-600">{empresa.cnpj}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    empresa.status === 'ativa' 
                      ? 'bg-green-100 text-green-800'
                      : empresa.status === 'suspensa'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  )}>
                    {empresa.status === 'ativa' ? 'Ativa' : 
                     empresa.status === 'suspensa' ? 'Suspensa' : 'Cancelada'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas e Notificações */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Alertas Recentes</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Limite de recursos atingido</p>
                <p className="text-sm text-yellow-700">Empresa Silva & Associados atingiu 90% do limite mensal</p>
                <p className="text-xs text-yellow-600 mt-1">Há 2 horas</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Renovação próxima</p>
                <p className="text-sm text-blue-700">3 empresas com vencimento em 7 dias</p>
                <p className="text-xs text-blue-600 mt-1">Hoje</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Nova empresa cadastrada</p>
                <p className="text-sm text-green-700">Auto Serviços Santos se cadastrou no plano Profissional</p>
                <p className="text-xs text-green-600 mt-1">Ontem</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}