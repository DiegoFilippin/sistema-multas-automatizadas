import React, { useState, useEffect } from 'react';
import {
  Building2,
  TrendingUp,
  FileText,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Interfaces
interface IcetranStats {
  totalRecursos: number;
  recursosAndamento: number;
  recursosFinalizados: number;
  recebimentoMes: number;
  recebimentoTotal: number;
  mediaRecebimento: number;
}

interface RecursoIcetran {
  id: string;
  numero_processo: string;
  cliente_nome: string;
  multa_tipo: string;
  valor_total: number;
  valor_icetran: number;
  status: string;
  data_criacao: string;
  data_finalizacao?: string;
  despachante_nome: string;
}

interface RecebimentoIcetran {
  id: string;
  recurso_id: string;
  numero_processo: string;
  valor: number;
  data_recebimento: string;
  status: 'pendente' | 'recebido' | 'cancelado';
  cliente_nome: string;
  despachante_nome: string;
}

// Componente de Card de Estatística
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue',
  subtitle 
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'orange' | 'purple';
  subtitle?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-lg border",
          colorClasses[color]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Componente de Tabela de Recursos
function RecursosTable({ recursos }: { recursos: RecursoIcetran[] }) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'finalizado':
      case 'aprovado':
        return 'bg-green-100 text-green-800';
      case 'em_andamento':
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
      case 'rejeitado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMultaTypeColor = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'leve':
        return 'bg-green-100 text-green-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'grave':
        return 'bg-orange-100 text-orange-800';
      case 'gravissima':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recursos Recentes</h3>
        <p className="text-sm text-gray-600">Recursos onde sua empresa recebe split</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Processo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo Multa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor ICETRAN
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Despachante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recursos.map((recurso) => (
              <tr key={recurso.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {recurso.numero_processo}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(recurso.data_criacao).toLocaleDateString('pt-BR')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{recurso.cliente_nome}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn(
                    "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                    getMultaTypeColor(recurso.multa_tipo)
                  )}>
                    {recurso.multa_tipo}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    R$ {recurso.valor_total.toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-green-600">
                    R$ {recurso.valor_icetran.toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={cn(
                    "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                    getStatusColor(recurso.status)
                  )}>
                    {recurso.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{recurso.despachante_nome}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    title="Visualizar detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {recursos.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum recurso encontrado</p>
        </div>
      )}
    </div>
  );
}

// Componente Principal
export default function DashboardIcetran() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<IcetranStats>({
    totalRecursos: 0,
    recursosAndamento: 0,
    recursosFinalizados: 0,
    recebimentoMes: 0,
    recebimentoTotal: 0,
    mediaRecebimento: 0
  });
  const [recursos, setRecursos] = useState<RecursoIcetran[]>([]);
  const [recebimentos, setRecebimentos] = useState<RecebimentoIcetran[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroMes, setFiltroMes] = useState<string>('');

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.role === 'ICETRAN') {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadRecursos(),
        loadRecebimentos()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // Implementar busca de estatísticas
    // Por enquanto, dados mockados
    setStats({
      totalRecursos: 156,
      recursosAndamento: 23,
      recursosFinalizados: 133,
      recebimentoMes: 12450.00,
      recebimentoTotal: 89320.50,
      mediaRecebimento: 573.21
    });
  };

  const loadRecursos = async () => {
    // Implementar busca de recursos
    // Por enquanto, dados mockados
    const mockRecursos: RecursoIcetran[] = [
      {
        id: '1',
        numero_processo: '2024001234',
        cliente_nome: 'João Silva',
        multa_tipo: 'Grave',
        valor_total: 850.00,
        valor_icetran: 85.00,
        status: 'Em Andamento',
        data_criacao: '2024-12-10',
        despachante_nome: 'Maria Santos'
      },
      {
        id: '2',
        numero_processo: '2024001235',
        cliente_nome: 'Ana Costa',
        multa_tipo: 'Leve',
        valor_total: 320.00,
        valor_icetran: 32.00,
        status: 'Finalizado',
        data_criacao: '2024-12-09',
        data_finalizacao: '2024-12-11',
        despachante_nome: 'Carlos Lima'
      }
    ];
    setRecursos(mockRecursos);
  };

  const loadRecebimentos = async () => {
    // Implementar busca de recebimentos
    setRecebimentos([]);
  };

  const exportarRelatorio = () => {
    toast.success('Relatório exportado com sucesso!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Building2 className="w-8 h-8 text-blue-600 mr-3" />
                Dashboard ICETRAN
              </h1>
              <p className="text-gray-600 mt-1">
                Acompanhe seus recebimentos e recursos em andamento
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={exportarRelatorio}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Relatório
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <StatCard
            title="Total de Recursos"
            value={stats.totalRecursos}
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="Em Andamento"
            value={stats.recursosAndamento}
            icon={Clock}
            color="orange"
          />
          <StatCard
            title="Finalizados"
            value={stats.recursosFinalizados}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Recebimento Mês"
            value={`R$ ${stats.recebimentoMes.toFixed(2)}`}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="Recebimento Total"
            value={`R$ ${stats.recebimentoTotal.toFixed(2)}`}
            icon={TrendingUp}
            color="purple"
          />
          <StatCard
            title="Média por Recurso"
            value={`R$ ${stats.mediaRecebimento.toFixed(2)}`}
            icon={BarChart3}
            color="blue"
          />
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-700">Filtros:</span>
            </div>
            
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos os Status</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="finalizado">Finalizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            
            <input
              type="month"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <button
              onClick={loadDashboardData}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>

        {/* Tabela de Recursos */}
        <RecursosTable recursos={recursos} />
      </div>
    </div>
  );
}