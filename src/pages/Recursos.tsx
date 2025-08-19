import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  FileText,
  Download,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bot,
  Calendar,
  User,
  Car,
  DollarSign,
  Percent,
  X
} from 'lucide-react';
import { useMultasStore } from '@/stores/multasStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { recursosService } from '@/services/recursosService';

interface RecursoCardProps {
  recurso: any;
  multa: any;
  onEdit: (recurso: any) => void;
  onDelete: (id: string) => void;
  onSend: (id: string) => void;
  onViewDetails: (recurso: any) => void;
  onDownloadPDF: (id: string) => void;
  showActions?: boolean;
}

function RecursoCard({ recurso, multa, onEdit, onDelete, onSend, onViewDetails, onDownloadPDF, showActions = true }: RecursoCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuthStore();
  
  const canEdit = (user?.role === 'user' || user?.role === 'admin') && recurso.status === 'rascunho';
  const canSend = (user?.role === 'user' || user?.role === 'admin') && recurso.status === 'rascunho';
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            recurso.status === 'deferido' ? 'bg-green-100' :
            recurso.status === 'indeferido' ? 'bg-red-100' :
            recurso.status === 'em_analise' ? 'bg-blue-100' :
            'bg-gray-100'
          )}>
            {recurso.status === 'deferido' ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : recurso.status === 'indeferido' ? (
              <XCircle className="w-6 h-6 text-red-600" />
            ) : recurso.status === 'em_analise' ? (
              <Clock className="w-6 h-6 text-blue-600" />
            ) : (
              <FileText className="w-6 h-6 text-gray-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{recurso.numero_processo}</h3>
            <p className="text-sm text-gray-600">{multa?.placa_veiculo} • {multa?.descricao_infracao}</p>
            {multa?.clients && (
              <p className="text-xs text-blue-600 font-medium">
                {multa.clients.nome} • {multa.clients.cpf_cnpj}
              </p>
            )}
          </div>
        </div>
        
        {showActions && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={() => {
                    onViewDetails(recurso);
                    setShowMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Detalhes</span>
                </button>
                
                <button
                  onClick={() => {
                    onDownloadPDF(recurso.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF</span>
                </button>
                
                {canEdit && (
                  <button
                    onClick={() => {
                      onEdit(recurso);
                      setShowMenu(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                )}
                
                {canSend && (
                  <button
                    onClick={() => {
                      onSend(recurso.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar Recurso</span>
                  </button>
                )}
                
                {(user?.role === 'user' || user?.role === 'admin') && (
                  <button
                    onClick={() => {
                      onDelete(recurso.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{recurso.tipo_recurso}</p>
          <p className="text-xs text-gray-600 line-clamp-2">{recurso.fundamentacao}</p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Percent className="w-4 h-4" />
              <span>{recurso.probabilidade_sucesso}% sucesso</span>
            </div>
            
            {multa && (
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <DollarSign className="w-4 h-4" />
                <span>R$ {(multa.valor_original || 0).toFixed(2)}</span>
              </div>
            )}
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
        
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <Calendar className="w-3 h-3" />
            <span>
              Criado: {format(new Date(recurso.created_at), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
          
          {recurso.data_protocolo && (
            <div className="flex items-center space-x-2">
              <Send className="w-3 h-3" />
              <span>
                Enviado: {format(new Date(recurso.data_protocolo), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
          )}
        </div>
        
        {recurso.geradoPorIA && (
          <div className="flex items-center space-x-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            <Bot className="w-3 h-3" />
            <span>Gerado por IA</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface RecursoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurso: any;
  multa: any;
}

function RecursoDetailsModal({ isOpen, onClose, recurso, multa }: RecursoDetailsModalProps) {
  const handleDownloadPDF = async (recursoId: string) => {
    try {
      await recursosService.downloadRecursoPDF(recursoId);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar PDF. Tente novamente.');
    }
  };

  if (!isOpen || !recurso) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Detalhes do Recurso</h2>
              <p className="text-gray-600 mt-1">{recurso.numero_processo}</p>
            </div>
            <span className={cn(
              'px-3 py-1 text-sm font-medium rounded-full',
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
        </div>
        
        <div className="p-6 space-y-6">
          {/* Informações da Multa */}
          {multa && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informações da Multa</h3>
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Placa</p>
                  <p className="font-medium text-gray-900">{multa.placa}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Número do Auto</p>
                  <p className="font-medium text-gray-900">{multa.numero_auto}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo de Infração</p>
                  <p className="font-medium text-gray-900">{multa.tipo_infracao}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor</p>
                  <p className="font-medium text-gray-900">R$ {(multa.valor || 0).toFixed(2)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Descrição</p>
                  <p className="font-medium text-gray-900">{multa.descricaoInfracao}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Informações do Recurso */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informações do Recurso</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tipo de Recurso</p>
                  <p className="font-medium text-gray-900">{recurso.tipo_recurso}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Probabilidade de Sucesso</p>
                  <p className="font-medium text-gray-900">{recurso.probabilidade_sucesso}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Prazo de Resposta</p>
                  <p className="font-medium text-gray-900">{recurso.prazo_resposta} dias</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Fundamentação Legal</p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">{recurso.fundamentacao}</p>
                </div>
              </div>
              
              {recurso.argumentos && recurso.argumentos.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Argumentos</p>
                  <div className="space-y-2">
                    {recurso.argumentos.map((argumento: string, index: number) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-3">
                        <p className="text-blue-900">{argumento}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {recurso.documentosAnexos && recurso.documentosAnexos.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Documentos Anexos</p>
                  <div className="space-y-2">
                    {recurso.documentosAnexos.map((doc: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        <FileText className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-900">{doc}</span>
                        <button className="ml-auto p-1 text-gray-400 hover:text-gray-600">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Timeline */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Histórico</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Recurso criado</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(recurso.created_at), 'dd/MM/yyyy \\à\\s HH:mm', { locale: ptBR })}
                  </p>
                  {recurso.geradoPorIA && (
                    <p className="text-xs text-blue-600 mt-1">Gerado automaticamente por IA</p>
                  )}
                </div>
              </div>
              
              {recurso.data_protocolo && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Send className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Recurso enviado</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(recurso.data_protocolo), 'dd/MM/yyyy \\à\\s HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}
              
              {recurso.dataResposta && (
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    recurso.status === 'deferido' ? 'bg-green-100' : 'bg-red-100'
                  )}>
                    {recurso.status === 'deferido' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Recurso {recurso.status === 'deferido' ? 'deferido' : 'indeferido'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(recurso.dataResposta), 'dd/MM/yyyy \\à\\s HH:mm', { locale: ptBR })}
                    </p>
                    {recurso.observacoes && (
                      <p className="text-sm text-gray-700 mt-1">{recurso.observacoes}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Fechar
          </button>
          <button 
            onClick={() => handleDownloadPDF(recurso.id)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Recursos() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { 
    recursos, 
    multas,
    fetchRecursos, 
    isLoading 
  } = useMultasStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRecurso, setSelectedRecurso] = useState<any>(null);
  
  useEffect(() => {
    if (user) {
      // Carregar recursos baseado no tipo de usuário
      if (user.role === 'admin') { // 'admin' no banco = 'master' na interface
        fetchRecursos(); // Admin vê todos os recursos
      } else if (user.role === 'user') { // 'user' no banco = 'despachante' na interface
        fetchRecursos({ companyId: user.company_id }); // Despachante vê recursos da empresa
      } else if (user.role === 'viewer') { // 'viewer' no banco = 'cliente' na interface
        fetchRecursos({ clientId: user.id }); // Cliente vê apenas seus recursos
      }
    }
  }, [user, fetchRecursos]);


  
  // Filtrar recursos baseado no papel do usuário
  const filteredRecursos = recursos.filter(recurso => {
    // Se for cliente, mostrar apenas recursos de suas multas
    const multa = multas.find(m => m.id === recurso.multa_id);
    if (user?.role === 'viewer') {
      if (!multa || multa.client_id !== user.id) {
        return false;
      }
    }
    
    const matchesSearch = (recurso.numero_processo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (multa?.numero_auto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (recurso.fundamentacao || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || recurso.status === statusFilter;
    const matchesTipo = tipoFilter === 'all' || recurso.tipo_recurso === tipoFilter;
    
    return matchesSearch && matchesStatus && matchesTipo;
  });
  
  const handleDownloadPDF = async (recursoId: string) => {
    try {
      await recursosService.downloadRecursoPDF(recursoId);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar PDF. Tente novamente.');
    }
  };

  const handleSendRecurso = async (id: string) => {
    try {
      await recursosService.submitRecurso(id);
      toast.success('Recurso enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar recurso. Tente novamente.');
    }
  };
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecurso, setEditingRecurso] = useState<any>(null);

  const handleDeleteRecurso = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este recurso? Esta ação não pode ser desfeita.')) {
      // Simular exclusão do recurso
      const updatedRecursos = recursos.filter(r => r.id !== id);
      // Aqui você atualizaria o estado global dos recursos
      toast.success('Recurso excluído com sucesso!');
    }
  };
  
  const handleEditRecurso = (recurso: any) => {
    setEditingRecurso(recurso);
    setShowEditModal(true);
  };

  const handleSaveEdit = (recursoData: any) => {
    // Simular atualização do recurso
    toast.success('Recurso atualizado com sucesso!');
    setShowEditModal(false);
    setEditingRecurso(null);
  };
  
  const handleViewDetails = (recurso: any) => {
    // Navegar para a página de detalhes da multa associada ao recurso
    if (recurso.multa_id) {
      navigate(`/multas/${recurso.multa_id}`);
    } else {
      toast.error('ID da multa não encontrado para este recurso');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando recursos...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === 'user' ? 'Meus Recursos' : 'Gestão de Recursos'}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'user' 
              ? 'Acompanhe o status dos seus recursos de multas'
              : 'Gerencie recursos de multas dos clientes'
            }
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/recursos/novo')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Novo Recurso
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Recursos</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{filteredRecursos.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Em Análise</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {filteredRecursos.filter(r => r.status === 'em_analise').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-50">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Deferidos</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {filteredRecursos.filter(r => r.status === 'deferido').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {filteredRecursos.length > 0 
                  ? Math.round((filteredRecursos.filter(r => r.status === 'deferido').length / filteredRecursos.filter(r => r.status !== 'em_analise').length) * 100) || 0
                  : 0}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50">
              <Percent className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar recursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os status</option>
            <option value="rascunho">Rascunho</option>
            <option value="em_analise">Em Análise</option>
            <option value="deferido">Deferidos</option>
            <option value="indeferido">Indeferidos</option>
          </select>
          
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os tipos</option>
            <option value="Defesa Prévia">Defesa Prévia</option>
            <option value="Recurso de Multa">Recurso de Multa</option>
            <option value="Recurso de Suspensão">Recurso de Suspensão</option>
            <option value="JARI">JARI</option>
            <option value="CETRAN">CETRAN</option>
          </select>
          
          <button className="inline-flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
          </button>
        </div>
      </div>
      
      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {filteredRecursos.length} recurso{filteredRecursos.length !== 1 ? 's' : ''} encontrado{filteredRecursos.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      {/* Recursos Grid */}
      {filteredRecursos.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRecursos.map((recurso) => {
            // Usar os dados da multa que vêm junto com o recurso (com dados do cliente)
            const multa = multas.find(m => m.id === recurso.multa_id);
            return (
              <RecursoCard
                key={recurso.id}
                recurso={recurso}
                multa={multa}
                onEdit={handleEditRecurso}
                onDelete={handleDeleteRecurso}
                onSend={handleSendRecurso}
                onViewDetails={handleViewDetails}
                onDownloadPDF={handleDownloadPDF}
                showActions={true}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum recurso encontrado</h3>
          <p className="text-gray-600 mb-6">Não há recursos que correspondam aos filtros selecionados.</p>
        </div>
      )}
      
      {/* Details Modal */}
      <RecursoDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedRecurso(null);
        }}
        recurso={selectedRecurso}
        multa={selectedRecurso ? (selectedRecurso.multas || multas.find(m => m.id === selectedRecurso.multa_id)) : null}
      />

      {/* Edit Modal */}
      <RecursoEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRecurso(null);
        }}
        recurso={editingRecurso}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

// Modal de Edição de Recurso
function RecursoEditModal({ isOpen, onClose, recurso, onSave }: {
  isOpen: boolean;
  onClose: () => void;
  recurso: any;
  onSave: (recurso: any) => void;
}) {
  const [formData, setFormData] = useState({
    tipo: '',
    fundamentacao: '',
    observacoes: ''
  });

  useEffect(() => {
    if (recurso) {
      setFormData({
        tipo: recurso.tipo_recurso || '',
        fundamentacao: recurso.fundamentacao || '',
        observacoes: recurso.observacoes || ''
      });
    }
  }, [recurso]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tipo || !formData.fundamentacao) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    onSave({ ...recurso, ...formData });
  };

  if (!isOpen || !recurso) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Editar Recurso</h2>
              <p className="text-gray-600 mt-1">{recurso.numero_processo}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Recurso *
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione o tipo</option>
              <option value="Defesa Prévia">Defesa Prévia</option>
              <option value="Recurso de Multa">Recurso de Multa</option>
              <option value="Recurso de Suspensão">Recurso de Suspensão</option>
              <option value="JARI">JARI</option>
              <option value="CETRAN">CETRAN</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fundamentação *
            </label>
            <textarea
              value={formData.fundamentacao}
              onChange={(e) => setFormData({ ...formData, fundamentacao: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
              placeholder="Descreva a fundamentação legal do recurso..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Observações adicionais..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}