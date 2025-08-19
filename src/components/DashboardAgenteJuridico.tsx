import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  FileText, 
  TrendingUp, 
  Users, 
  Star, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface MetricasGerais {
  total_documentos: number;
  total_recursos_gerados: number;
  total_feedbacks: number;
  media_rating: number;
  recursos_hoje: number;
  recursos_semana: number;
  documentos_por_categoria: { categoria: string; count: number }[];
  feedback_por_aspecto: {
    relevancia_juridica: number;
    clareza_texto: number;
    fundamentacao: number;
    aplicabilidade: number;
  };
  recursos_por_tipo: { tipo: string; count: number }[];
  performance_tempo_resposta: number;
}

interface RecursoRecente {
  id: string;
  tipo_recurso: string;
  score_confianca: number;
  created_at: string;
  feedback_rating?: number;
}

const DashboardAgenteJuridico: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasGerais | null>(null);
  const [recursosRecentes, setRecursosRecentes] = useState<RecursoRecente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    carregarDados();
  }, [periodo]);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      await Promise.all([
        carregarMetricasGerais(),
        carregarRecursosRecentes()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar métricas');
    } finally {
      setCarregando(false);
    }
  };

  const carregarMetricasGerais = async () => {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - parseInt(periodo.replace('d', '')));

    // Buscar métricas básicas
    const [documentosResult, recursosResult, feedbacksResult] = await Promise.all([
      supabase.from('knowledge_documents').select('id, categoria'),
      supabase.from('generated_resources').select('id, tipo_recurso, score_confianca, created_at').gte('created_at', dataLimite.toISOString()),
      supabase.from('feedback').select('rating, aspectos_avaliacao')
    ]);

    if (documentosResult.error || recursosResult.error || feedbacksResult.error) {
      throw new Error('Erro ao buscar dados básicos');
    }

    // Calcular métricas
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const semanaAtras = new Date();
    semanaAtras.setDate(semanaAtras.getDate() - 7);

    const recursosHoje = recursosResult.data?.filter(r => 
      new Date(r.created_at) >= hoje
    ).length || 0;

    const recursosSemana = recursosResult.data?.filter(r => 
      new Date(r.created_at) >= semanaAtras
    ).length || 0;

    // Agrupar documentos por categoria
    const documentosPorCategoria = documentosResult.data?.reduce((acc, doc) => {
      const categoria = doc.categoria || 'Outros';
      acc[categoria] = (acc[categoria] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Agrupar recursos por tipo
    const recursosPorTipo = recursosResult.data?.reduce((acc, recurso) => {
      const tipo = recurso.tipo_recurso || 'Outros';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Calcular média de rating
    const ratings = feedbacksResult.data?.map(f => f.rating).filter(Boolean) || [];
    const mediaRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0;

    // Calcular média dos aspectos de feedback
    const aspectosTotais = feedbacksResult.data?.reduce((acc, feedback) => {
      if (feedback.aspectos_avaliacao) {
        Object.entries(feedback.aspectos_avaliacao).forEach(([key, value]) => {
          acc[key] = (acc[key] || []).concat(value as number);
        });
      }
      return acc;
    }, {} as Record<string, number[]>) || {};

    const feedbackPorAspecto = Object.entries(aspectosTotais).reduce((acc, [key, values]) => {
      const valuesArray = Array.isArray(values) ? values : [];
      acc[key] = valuesArray.length > 0 ? valuesArray.reduce((sum, val) => sum + val, 0) / valuesArray.length : 0;
      return acc;
    }, {} as Record<string, number>);

    const metricasCalculadas: MetricasGerais = {
      total_documentos: documentosResult.data?.length || 0,
      total_recursos_gerados: recursosResult.data?.length || 0,
      total_feedbacks: feedbacksResult.data?.length || 0,
      media_rating: mediaRating,
      recursos_hoje: recursosHoje,
      recursos_semana: recursosSemana,
      documentos_por_categoria: Object.entries(documentosPorCategoria).map(([categoria, count]) => ({ categoria, count: Number(count) })),
      feedback_por_aspecto: {
        relevancia_juridica: feedbackPorAspecto.relevancia_juridica || 0,
        clareza_texto: feedbackPorAspecto.clareza_texto || 0,
        fundamentacao: feedbackPorAspecto.fundamentacao || 0,
        aplicabilidade: feedbackPorAspecto.aplicabilidade || 0
      },
      recursos_por_tipo: Object.entries(recursosPorTipo).map(([tipo, count]) => ({ tipo, count: Number(count) })),
      performance_tempo_resposta: 2.3 // Mock - seria calculado com base em logs reais
    };

    setMetricas(metricasCalculadas);
  };

  const carregarRecursosRecentes = async () => {
    const { data, error } = await supabase
      .from('generated_resources')
      .select(`
        id,
        tipo_recurso,
        score_confianca,
        created_at,
        feedback!left(rating)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    const recursosFormatados = data?.map(recurso => ({
      id: recurso.id,
      tipo_recurso: recurso.tipo_recurso,
      score_confianca: recurso.score_confianca,
      created_at: recurso.created_at,
      feedback_rating: recurso.feedback?.[0]?.rating
    })) || [];

    setRecursosRecentes(recursosFormatados);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Carregando métricas...</span>
        </div>
      </div>
    );
  }

  if (!metricas) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
        <p className="text-gray-600">Erro ao carregar métricas do agente jurídico</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Agente Jurídico</h2>
            <p className="text-gray-600">Métricas de performance e uso da IA jurídica</p>
          </div>
        </div>
        
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as '7d' | '30d' | '90d')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
        </select>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Documentos na Base</p>
              <p className="text-2xl font-bold text-gray-900">{metricas.total_documentos}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recursos Gerados</p>
              <p className="text-2xl font-bold text-gray-900">{metricas.total_recursos_gerados}</p>
              <p className="text-xs text-green-600">+{metricas.recursos_hoje} hoje</p>
            </div>
            <Brain className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avaliação Média</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900">{metricas.media_rating.toFixed(1)}</p>
                {renderStars(Math.round(metricas.media_rating))}
              </div>
              <p className="text-xs text-gray-500">{metricas.total_feedbacks} avaliações</p>
            </div>
            <Star className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tempo Resposta</p>
              <p className="text-2xl font-bold text-gray-900">{metricas.performance_tempo_resposta}s</p>
              <p className="text-xs text-blue-600">Média de geração</p>
            </div>
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Gráficos e Análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentos por Categoria */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <PieChart className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Documentos por Categoria</h3>
          </div>
          <div className="space-y-3">
            {metricas.documentos_por_categoria.map((item, index) => (
              <div key={item.categoria} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-3 h-3 rounded-full`}
                    style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                  />
                  <span className="text-sm text-gray-700">{item.categoria}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recursos por Tipo */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recursos por Tipo</h3>
          </div>
          <div className="space-y-3">
            {metricas.recursos_por_tipo.map((item, index) => (
              <div key={item.tipo} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.tipo}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full"
                      style={{ 
                        width: `${(item.count / Math.max(...metricas.recursos_por_tipo.map(r => r.count))) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback por Aspecto */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Avaliação por Aspecto</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(metricas.feedback_por_aspecto).map(([aspecto, valor]) => {
            const labels: Record<string, string> = {
              relevancia_juridica: 'Relevância Jurídica',
              clareza_texto: 'Clareza do Texto',
              fundamentacao: 'Fundamentação',
              aplicabilidade: 'Aplicabilidade'
            };
            
            return (
              <div key={aspecto} className="text-center">
                <p className="text-sm font-medium text-gray-700 mb-2">{labels[aspecto]}</p>
                <div className="flex items-center justify-center gap-1 mb-1">
                  {renderStars(Math.round(valor))}
                </div>
                <p className="text-lg font-bold text-gray-900">{valor.toFixed(1)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recursos Recentes */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recursos Recentes</h3>
        </div>
        <div className="space-y-3">
          {recursosRecentes.map((recurso) => (
            <div key={recurso.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{recurso.tipo_recurso}</p>
                  <p className="text-xs text-gray-500">{formatarData(recurso.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Confiança</p>
                  <p className="text-sm font-medium text-gray-900">{(recurso.score_confianca * 100).toFixed(0)}%</p>
                </div>
                {recurso.feedback_rating && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Avaliação</p>
                    <div className="flex justify-end">
                      {renderStars(recurso.feedback_rating)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardAgenteJuridico;