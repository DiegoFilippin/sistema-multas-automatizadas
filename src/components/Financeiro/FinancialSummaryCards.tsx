import { DollarSign, TrendingUp, FileText, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DespachanteFinancialData } from '@/types/despachanteFinanceiro';

interface FinancialCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  className?: string;
  iconClassName?: string;
  isCount?: boolean;
}

function FinancialCard({ title, value, icon: Icon, loading, className, iconClassName, isCount }: FinancialCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {isCount ? value : formatCurrency(value)}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-lg", iconClassName)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

interface FinancialSummaryCardsProps {
  data?: DespachanteFinancialData | null;
  loading?: boolean;
}

export function FinancialSummaryCards({ data, loading = false }: FinancialSummaryCardsProps) {
  // Valores padrão quando não há dados
  const defaultData: DespachanteFinancialData = {
    totalAReceber: 0,
    totalRecebidoMes: 0,
    totalServicosCriados: 0,
    totalServicosPagos: 0,
    comissaoMesAtual: 0,
    previsaoRecebimento: 0
  };

  const displayData = data || defaultData;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <FinancialCard
        title="Total a Receber"
        value={displayData.totalAReceber}
        icon={DollarSign}
        loading={loading}
        className="border-blue-200 bg-blue-50"
        iconClassName="text-blue-600"
        isCount={false}
      />
      <FinancialCard
        title="Recebido no Mês"
        value={displayData.totalRecebidoMes}
        icon={TrendingUp}
        loading={loading}
        className="border-green-200 bg-green-50"
        iconClassName="text-green-600"
        isCount={false}
      />
      <FinancialCard
        title="Serviços Criados (valor do despachante)"
        value={displayData.totalServicosCriados}
        icon={FileText}
        loading={loading}
        className="border-purple-200 bg-purple-50"
        iconClassName="text-purple-600"
        isCount={false}
      />
      <FinancialCard
        title="Serviços Pagos (valor do despachante)"
        value={displayData.totalServicosPagos}
        icon={CheckCircle}
        loading={loading}
        className="border-orange-200 bg-orange-50"
        iconClassName="text-orange-600"
        isCount={false}
      />
    </div>
  );
}