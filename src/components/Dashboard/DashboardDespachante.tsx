import { useEffect, useState } from 'react';
import { 
  FileText, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  Zap,
  PiggyBank,
  CreditCard,
  Wallet
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { dashboardDespachanteService, type DashboardStats, type RecursoRecente, type AtividadeRecente } from '@/services/dashboardDespachanteService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePrepaidWallet } from '@/hooks/usePrepaidWallet';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor?: string;
  iconColor?: string;
  onClick?: () => void;
  subtitle?: string;
}

function StatCard({ title, value, change, icon: Icon, iconBgColor = 'bg-blue-50', iconColor = 'text-blue-600', onClick, subtitle }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <div 
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-blue-300'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className={cn(
              'flex items-center mt-2 text-sm font-medium',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 mr-1" />
              )}
              <span>{Math.abs(change).toFixed(1)}% vs mês anterior</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', iconBgColor)}>
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>
      </div>
    </div>
  );
}

interface RecursoStatusBadgeProps {
  status: string;
}

function RecursoStatusBadge({ status }: RecursoStatusBadgeProps) {
  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    em_analise: { label: 'Em Análise', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    protocolado: { label: 'Protocolado', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    deferido: { label: 'Deferido', color: 'text-green-700', bgColor: 'bg-green-100' },
    indeferido: { label: 'Indeferido', color: 'text-red-700', bgColor: 'bg-red-100' },
    gerado: { label: 'Gerado', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  };

  const config = statusConfig[status] || { label: status, color: 'text-gray-700', bgColor: 'bg-gray-100' };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.color, config.bgColor)}>
      {config.label}
    </span>
  );
}

export default function DashboardDespachante() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recursosRecentes, setRecursosRecentes] = useState<RecursoRecente[]>([]);
  const [atividades, setAtividades] = useState<AtividadeRecente[]>([]);
  const {
    balance: prepaidBalance,
    isLoadingBalance,
    isAddingFunds,
    loadBalance
  } = usePrepaidWallet();

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.company_id) return;

    try {
      setIsLoading(true);
      console.log('🔍 Carregando dados do dashboard...');

      const [statsData, recursosData, atividadesData] = await Promise.all([
        dashboardDespachanteService.getDashboardStats(user.company_id),
        dashboardDespachanteService.getRecursosRecentes(user.company_id, 5),
        dashboardDespachanteService.getAtividadesRecentes(user.company_id, 8)
      ]);

      console.log('✅ Dados carregados:', { statsData, recursosData, atividadesData });

      setStats(statsData);
      setRecursosRecentes(recursosData);
      setAtividades(atividadesData);
      await loadBalance();
    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setIsLoading(false);
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

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Não foi possível carregar os dados do dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Visão geral do seu negócio</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-3">
            <div className="flex flex-col items-end text-right">
              <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Saldo Pré-Pago</span>
              <span className="text-lg font-bold text-slate-900">
                {isLoadingBalance ? 'Carregando...' : `R$ ${prepaidBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/meus-servicos?acao=adicionar-saldo')}
                className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center space-x-1 text-sm shadow-sm"
              >
                <PiggyBank className="w-4 h-4" />
                <span>Adicionar saldo</span>
              </button>
              <button
                onClick={() => navigate('/meus-servicos?acao=novo-prepago')}
                className="px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center space-x-1 text-sm shadow-sm"
              >
                <CreditCard className="w-4 h-4" />
                <span>Usar saldo</span>
              </button>
            </div>
          </div>
          <button
            onClick={() => navigate('/novo-recurso-wizard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Zap className="w-4 h-4" />
            <span>Novo Recurso</span>
          </button>
        </div>
      </div>

      {/* Cards Principais - Financeiro */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">💰 Financeiro</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Receita Mensal"
            value={`R$ ${stats.receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            change={stats.crescimentoReceita}
            icon={DollarSign}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
            onClick={() => navigate('/relatorios-financeiros')}
            subtitle="Pagamentos recebidos no mês"
          />
          <StatCard
            title="Receita Pendente"
            value={`R$ ${stats.receitaPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={Clock}
            iconBgColor="bg-yellow-50"
            iconColor="text-yellow-600"
            onClick={() => navigate('/relatorios-financeiros')}
            subtitle="Aguardando pagamento"
          />
          <StatCard
            title="Sua Margem"
            value={`R$ ${stats.margemDespachante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={Target}
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
            subtitle="Comissão recebida"
          />
          <StatCard
            title="Ticket Médio"
            value={`R$ ${stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            subtitle="Valor médio por serviço"
          />
        </div>
      </div>

      {/* Cards - Recursos */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Recursos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Recursos Ativos"
            value={stats.recursosAtivos}
            change={stats.crescimentoRecursos}
            icon={FileText}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            onClick={() => navigate('/recursos')}
            subtitle="Em andamento"
          />
          <StatCard
            title="Em Análise"
            value={stats.recursosEmAnalise}
            icon={Clock}
            iconBgColor="bg-yellow-50"
            iconColor="text-yellow-600"
            onClick={() => navigate('/recursos')}
          />
          <StatCard
            title="Deferidos"
            value={stats.recursosDeferidos}
            icon={CheckCircle}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
            onClick={() => navigate('/recursos')}
          />
          <StatCard
            title="Taxa de Sucesso"
            value={`${stats.taxaSucesso.toFixed(1)}%`}
            icon={Target}
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
            subtitle="Recursos deferidos"
          />
        </div>
      </div>

      {/* Cards - Clientes e Pedidos */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">👥 Clientes & Pedidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Clientes Ativos"
            value={stats.clientesAtivos}
            icon={Users}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-600"
            onClick={() => navigate('/clientes')}
          />
          <StatCard
            title="Novos Clientes"
            value={stats.novosClientesMes}
            icon={Users}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
            subtitle="Neste mês"
          />
          <StatCard
            title="Pedidos Pendentes"
            value={stats.serviceOrdersPendentes}
            icon={Clock}
            iconBgColor="bg-orange-50"
            iconColor="text-orange-600"
            onClick={() => navigate('/relatorios-financeiros')}
          />
          <StatCard
            title="Pedidos Pagos"
            value={stats.serviceOrdersPagas}
            icon={CheckCircle}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
            onClick={() => navigate('/relatorios-financeiros')}
          />
        </div>
      </div>

      {/* Seção Inferior - Recursos Recentes e Atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recursos Recentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recursos Recentes</h3>
            <button
              onClick={() => navigate('/recursos')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Ver todos
            </button>
          </div>
          
          {recursosRecentes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum recurso encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recursosRecentes.map((recurso) => (
                <div
                  key={recurso.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/recursos/${recurso.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {recurso.cliente_nome}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {recurso.tipo_recurso} • {recurso.data_protocolo ? format(new Date(recurso.data_protocolo), 'dd/MM/yyyy', { locale: ptBR }) : 'Sem data'}
                    </p>
                  </div>
                  <RecursoStatusBadge status={recurso.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Atividades Recentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Atividades Recentes</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          
          {atividades.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma atividade recente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {atividades.map((atividade) => {
                const IconComponent = atividade.icone === 'DollarSign' ? DollarSign : FileText;
                const iconColor = atividade.cor === 'green' ? 'text-green-600' : 'text-blue-600';
                const iconBg = atividade.cor === 'green' ? 'bg-green-50' : 'bg-blue-50';
                
                return (
                  <div key={atividade.id} className="flex items-start space-x-3">
                    <div className={cn('p-2 rounded-lg flex-shrink-0', iconBg)}>
                      <IconComponent className={cn('w-4 h-4', iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{atividade.descricao}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(atividade.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Insights e Dicas */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
            <Target className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">💡 Insights</h3>
            <div className="space-y-2 text-sm text-gray-700">
              {stats.taxaSucesso > 70 && (
                <p>✅ Excelente! Sua taxa de sucesso de {stats.taxaSucesso.toFixed(1)}% está acima da média.</p>
              )}
              {stats.crescimentoReceita > 0 && (
                <p>📈 Sua receita cresceu {stats.crescimentoReceita.toFixed(1)}% em relação ao mês anterior.</p>
              )}
              {stats.recursosAtivos > 0 && (
                <p>⚡ Você tem {stats.recursosAtivos} recursos em andamento que precisam de atenção.</p>
              )}
              {stats.serviceOrdersPendentes > 0 && (
                <p>💰 Há {stats.serviceOrdersPendentes} pedidos pendentes de pagamento totalizando R$ {stats.receitaPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
