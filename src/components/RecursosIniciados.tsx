/**
 * Componente para listar recursos iniciados
 * Mostra recursos com status "iniciado" para acompanhamento
 */

import React, { useState, useEffect } from 'react';
import { FileText, Clock, AlertCircle, CheckCircle, Eye, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { recursosIniciadosService, type RecursoIniciado } from '../services/recursosIniciadosService';

interface RecursosIniciadosProps {
  companyId?: string;
  onRecursoSelect?: (recurso: RecursoIniciado) => void;
  showTitle?: boolean;
}

const RecursosIniciados: React.FC<RecursosIniciadosProps> = ({
  companyId,
  onRecursoSelect,
  showTitle = true
}) => {
  const [recursos, setRecursos] = useState<RecursoIniciado[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    iniciados: 0,
    em_andamento: 0,
    concluidos: 0,
    protocolados: 0
  });

  // Carregar recursos quando o componente monta ou companyId muda
  useEffect(() => {
    if (companyId) {
      carregarRecursos();
      carregarEstatisticas();
    }
  }, [companyId, filtroStatus]);

  const carregarRecursos = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      console.log('📋 Carregando recursos iniciados para company:', companyId);
      
      const filtros = {
        companyId,
        status: filtroStatus === 'todos' ? undefined : [filtroStatus],
        limit: 20
      };
      
      const recursosCarregados = await recursosIniciadosService.listarRecursos(filtros);
      setRecursos(recursosCarregados);
      
      console.log('✅ Recursos carregados:', recursosCarregados.length);
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar recursos:', error);
      toast.error('Erro ao carregar recursos iniciados');
    } finally {
      setLoading(false);
    }
  };

  const carregarEstatisticas = async () => {
    if (!companyId) return;
    
    try {
      const stats = await recursosIniciadosService.obterEstatisticas(companyId);
      setEstatisticas(stats);
    } catch (error: any) {
      console.error('❌ Erro ao carregar estatísticas:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'iniciado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'concluido':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'protocolado':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'iniciado':
        return <Clock className="w-4 h-4" />;
      case 'em_andamento':
        return <AlertCircle className="w-4 h-4" />;
      case 'concluido':
        return <CheckCircle className="w-4 h-4" />;
      case 'protocolado':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const calcularDiasRestantes = (dataPrazo?: string) => {
    if (!dataPrazo) return null;
    
    const hoje = new Date();
    const prazo = new Date(dataPrazo);
    const diffTime = prazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const handleRecursoClick = (recurso: RecursoIniciado) => {
    console.log('📋 Recurso selecionado:', recurso.id);
    if (onRecursoSelect) {
      onRecursoSelect(recurso);
    }
  };

  if (!companyId) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Company ID não fornecido</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Recursos Iniciados
          </h2>
          
          {/* Estatísticas resumidas */}
          <div className="flex space-x-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-blue-600">{estatisticas.iniciados}</div>
              <div className="text-gray-500">Iniciados</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-yellow-600">{estatisticas.em_andamento}</div>
              <div className="text-gray-500">Em Andamento</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">{estatisticas.concluidos}</div>
              <div className="text-gray-500">Concluídos</div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex space-x-2">
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="todos">Todos os Status</option>
          <option value="iniciado">Iniciados</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluido">Concluídos</option>
          <option value="protocolado">Protocolados</option>
        </select>
        
        <button
          onClick={carregarRecursos}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {loading ? 'Carregando...' : 'Atualizar'}
        </button>
      </div>

      {/* Lista de recursos */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Carregando recursos...</p>
          </div>
        ) : recursos.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {filtroStatus === 'todos' 
                ? 'Nenhum recurso encontrado' 
                : `Nenhum recurso com status "${filtroStatus}" encontrado`
              }
            </p>
          </div>
        ) : (
          recursos.map((recurso) => {
            const diasRestantes = calcularDiasRestantes(recurso.data_prazo);
            const isPrazoVencendo = diasRestantes !== null && diasRestantes <= 3 && diasRestantes > 0;
            const isPrazoVencido = diasRestantes !== null && diasRestantes < 0;
            
            return (
              <div
                key={recurso.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleRecursoClick(recurso)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {recurso.titulo || `Recurso - Auto ${recurso.numero_auto}`}
                      </h3>
                      
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                        getStatusColor(recurso.status)
                      }`}>
                        {getStatusIcon(recurso.status)}
                        <span className="ml-1 capitalize">{recurso.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Auto:</span>
                        <div>{recurso.numero_auto || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <span className="font-medium">Placa:</span>
                        <div>{recurso.placa_veiculo || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <span className="font-medium">Requerente:</span>
                        <div className="truncate">{recurso.nome_requerente || 'N/A'}</div>
                      </div>
                      
                      <div>
                        <span className="font-medium">Valor:</span>
                        <div>
                          {recurso.valor_multa 
                            ? `R$ ${recurso.valor_multa.toFixed(2).replace('.', ',')}` 
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                    
                    {recurso.observacoes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Observações:</span>
                        <p className="mt-1 line-clamp-2">{recurso.observacoes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 text-right">
                    <div className="text-sm text-gray-500">
                      <div className="flex items-center mb-1">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatarData(recurso.created_at)}
                      </div>
                      
                      {recurso.data_prazo && (
                        <div className={`text-xs ${
                          isPrazoVencido 
                            ? 'text-red-600 font-medium' 
                            : isPrazoVencendo 
                            ? 'text-yellow-600 font-medium' 
                            : 'text-gray-500'
                        }`}>
                          Prazo: {formatarData(recurso.data_prazo)}
                          {diasRestantes !== null && (
                            <div>
                              {isPrazoVencido 
                                ? `Vencido há ${Math.abs(diasRestantes)} dias` 
                                : `${diasRestantes} dias restantes`
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <button className="mt-2 p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {recursos.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Mostrando {recursos.length} recursos
        </div>
      )}
    </div>
  );
};

export default RecursosIniciados;