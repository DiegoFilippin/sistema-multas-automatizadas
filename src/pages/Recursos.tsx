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
import TipoRecursoTag, { Art267Explanation } from '@/components/TipoRecursoTag';
import { supabase } from '@/lib/supabase';

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
  
  // Função auxiliar para verificar se o usuário pode editar/enviar recursos
  const canManageRecursos = (userRole: string | undefined) => {
    if (!userRole) return false;
    return userRole === 'Despachante' || userRole === 'ICETRAN' || userRole === 'Superadmin' || 
           userRole === 'user' || userRole === 'admin'; // Compatibilidade com roles antigos
  };
  
  const canEdit = canManageRecursos(user?.role) && recurso.status === 'rascunho';
  const canSend = canManageRecursos(user?.role) && recurso.status === 'rascunho';
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'deferido':
        return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100 text-green-800', icon: CheckCircle, iconColor: 'text-green-600' };
      case 'indeferido':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-800', icon: XCircle, iconColor: 'text-red-600' };
      case 'em_analise':
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-800', icon: Clock, iconColor: 'text-blue-600' };
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', badge: 'bg-gray-100 text-gray-800', icon: FileText, iconColor: 'text-gray-600' };
    }
  };
  
  const statusConfig = getStatusConfig(recurso.status);
  const StatusIcon = statusConfig.icon;
  
  return (
    <div className={cn(
      'bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-all duration-200 cursor-pointer group',
      statusConfig.border
    )}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Info Principal e Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
              {recurso.numero_processo}
            </h3>
            <span className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0',
              statusConfig.badge
            )}>
              <StatusIcon className={cn('w-3 h-3 mr-1', statusConfig.iconColor)} />
              {recurso.status === 'deferido' ? 'Deferido' :
               recurso.status === 'indeferido' ? 'Indeferido' :
               recurso.status === 'em_analise' ? 'Em Análise' : 'Rascunho'}
            </span>
            {recurso.geradoPorIA && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 shrink-0">
                <Bot className="w-3 h-3 mr-1" />
                IA
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <TipoRecursoTag tipoRecurso={recurso.tipo_recurso} size="sm" />
            
            <div className="flex items-center gap-1">
              <Car className="w-4 h-4 text-gray-400" />
              <span className="truncate max-w-[120px]">
                {(recurso.is_service_order ? recurso.multa_placa : multa?.placa_veiculo) || 'Placa não info.'}
              </span>
            </div>

            <div className="hidden lg:block h-4 w-px bg-gray-200"></div>

            <div className="flex items-center gap-1">
              <User className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-gray-900 truncate max-w-[150px]">
                {(recurso.is_service_order ? recurso.client_name : multa?.clients?.nome) || 'Cliente não info.'}
              </span>
            </div>

            {recurso.client_email && (
              <>
                <div className="hidden lg:block h-4 w-px bg-gray-200"></div>
                <div className="flex items-center gap-1 text-xs">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate max-w-[180px]">{recurso.client_email}</span>
                </div>
              </>
            )}

            {recurso.client_telefone && (
              <>
                <div className="hidden xl:block h-4 w-px bg-gray-200"></div>
                <div className="flex items-center gap-1 text-xs">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{recurso.client_telefone}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Datas e Ações */}
        <div className="flex items-center justify-between md:justify-end gap-6 min-w-[200px]">
          <div className="text-right hidden md:block">
            <div className="text-xs text-gray-500 mb-1">Criado em</div>
            <div className="text-sm font-medium text-gray-900">
              {format(new Date(recurso.created_at), 'dd/MM/yyyy', { locale: ptBR })}
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onViewDetails(recurso); }}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Ver Detalhes"
              >
                <Eye className="w-5 h-5" />
              </button>
              
              <button
                onClick={(e) => { e.stopPropagation(); onDownloadPDF(recurso.id); }}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Baixar PDF"
              >
                <Download className="w-5 h-5" />
              </button>

              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    {canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(recurso); setShowMenu(false); }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Editar</span>
                      </button>
                    )}
                    
                    {canSend && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSend(recurso.id); setShowMenu(false); }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>Enviar Recurso</span>
                      </button>
                    )}
                    
                    {canManageRecursos(user?.role) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(recurso.id); setShowMenu(false); }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Content (opcional, se quisermos mostrar mais detalhes no clique) */}
      {/* Por enquanto removi fundamentação e timeline detalhada do card principal para limpar o visual */}
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
              <div className="mt-2">
                <TipoRecursoTag tipoRecurso={recurso.tipo_recurso} size="md" />
              </div>
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
              {/* Explicação Art. 267 se aplicável */}
              {recurso.tipo_recurso === 'conversao' && (
                <Art267Explanation className="mb-4" />
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tipo de Recurso</p>
                  <div className="mt-1">
                    <TipoRecursoTag tipoRecurso={recurso.tipo_recurso} size="sm" />
                  </div>
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
  // Estado para recursos provenientes de service_orders iniciados
  const [soRecursos, setSoRecursos] = useState<any[]>([]);
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => {
    if (user) {
      // Carregar recursos baseado no tipo de usuário
      if (user.role === 'Superadmin' || user.role === 'ICETRAN') {
        fetchRecursos();
      } else if (user.role === 'Despachante') {
        fetchRecursos({ companyId: user.company_id });
      } else if (user.role === 'Usuario/Cliente') {
        fetchRecursos({ clientId: user.id });
      } else if (user.role === 'admin') {
        fetchRecursos();
      } else if (user.role === 'user') {
        fetchRecursos({ companyId: user.company_id });
      } else if (user.role === 'viewer') {
        fetchRecursos({ clientId: user.id });
      }
    }
  }, [user, fetchRecursos]);


  
  // Buscar service_orders com processos iniciados e mapear para recursos
  useEffect(() => {
    const fetchServiceOrdersIniciados = async () => {
      if (!user) return;
      try {
        console.log('🔍 [Recursos] Buscando recursos da tabela recursos...');
        console.log('👤 [Recursos] Usuário:', { role: user.role, company_id: user.company_id, email: user.email });
        
        // 1. Buscar recursos da tabela recursos
        let recursosQuery = supabase
          .from('recursos')
          .select('*')
          .order('created_at', { ascending: false });

        // Filtro por papel do usuário
        if (user.role === 'Despachante' || user.role === 'user') {
          console.log(`🔍 [Recursos] Filtrando por company_id: ${user.company_id}`);
          recursosQuery = recursosQuery.eq('company_id', user.company_id);
        } else if (user.role === 'Usuario/Cliente' || user.role === 'viewer') {
          const { data: clientData } = await supabase
            .from('clients')
            .select('id')
            .eq('email', user.email)
            .single();
          if (clientData?.id) {
            console.log(`🔍 [Recursos] Filtrando por client_id: ${clientData.id}`);
            recursosQuery = recursosQuery.eq('client_id', clientData.id);
          }
        } else {
          console.log('🔍 [Recursos] Sem filtro (admin/superadmin)');
        }

        let { data: recursosData, error: recursosError } = await recursosQuery;
        if (recursosError) {
          console.error('❌ Erro ao buscar recursos:', recursosError);
        }

        console.log(`✅ [Recursos] Encontrados ${recursosData?.length || 0} recursos na tabela recursos`);
        if (recursosData && recursosData.length > 0) {
          console.log('📋 [Recursos] Primeiros recursos encontrados:', recursosData.slice(0, 3));
        }

        // 2. Buscar service_orders com processos iniciados
        console.log('🔍 [Recursos] Buscando service_orders com recursos iniciados...');
        
        let query = supabase
          .from('service_orders')
          .select('*')
          .eq('status', 'paid') // Apenas orders pagas
          .order('created_at', { ascending: false });

        // Filtro por papel do usuário
        if (user.role === 'Despachante' || user.role === 'user') {
          query = query.eq('company_id', user.company_id);
        } else if (user.role === 'Usuario/Cliente' || user.role === 'viewer') {
          const { data: clientData } = await supabase
            .from('clients')
            .select('id')
            .eq('email', user.email)
            .single();
          if (clientData?.id) {
            query = query.eq('client_id', clientData.id);
          } else {
            // Se não encontrou cliente, usar apenas recursos da tabela
            setSoRecursos(recursosData || []);
            return;
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        console.log(`🔍 [Recursos] Encontradas ${data?.length || 0} service_orders pagas`);

        // IMPORTANTE: Incluir service_orders que têm recurso_id para buscar o recurso associado
        const serviceOrdersComRecurso = (data || []).filter((order: any) => order.recurso_id);
        console.log(`🔍 [Recursos] ${serviceOrdersComRecurso.length} service_orders com recurso_id`);
        
        // Buscar recursos vinculados a essas service_orders
        if (serviceOrdersComRecurso.length > 0) {
          const recursoIds = serviceOrdersComRecurso.map((o: any) => o.recurso_id);
          const { data: recursosVinculados, error: recursoError } = await supabase
            .from('recursos')
            .select('*')
            .in('id', recursoIds);
          
          if (!recursoError && recursosVinculados) {
            console.log(`✅ [Recursos] Encontrados ${recursosVinculados.length} recursos vinculados a service_orders`);
            // Adicionar aos recursos já encontrados
            recursosData = [...(recursosData || []), ...recursosVinculados];
          }
        }

        // Filtrar apenas as que têm recurso iniciado (mas não têm recurso_id, para evitar duplicação)
        const initiated = (data || []).filter((order: any) => {
          // Se já tem recurso_id, não incluir aqui (já foi buscado acima)
          if (order.recurso_id) {
            return false;
          }
          
          const hasRecursoGenerated = Boolean(order.recurso_generated_url);
          const hasAiAnalysis = Boolean(order.ai_analysis);
          const hasRecursoIniciado = hasRecursoGenerated || hasAiAnalysis;
          
          return hasRecursoIniciado;
        });

        console.log(`✅ [Recursos] ${initiated.length} service_orders com recurso iniciado (sem recurso_id)`);

        // Buscar informações adicionais de clientes e multas (incluindo da tabela recursos)
        const clientIds = [...new Set([
          ...initiated.map((o: any) => o.client_id).filter(Boolean),
          ...(recursosData || []).map((r: any) => r.client_id).filter(Boolean)
        ])];
        const multaIds = [...new Set([
          ...initiated.map((o: any) => o.multa_id).filter(Boolean),
          ...(recursosData || []).map((r: any) => r.multa_id).filter(Boolean)
        ])];

        let clientsMap: Record<string, any> = {};
        let multasMap: Record<string, any> = {};

        if (clientIds.length > 0) {
          const { data: clientsData } = await supabase
            .from('clients')
            .select('id, nome, cpf_cnpj, email, telefone')
            .in('id', clientIds);
          
          if (clientsData) {
            clientsMap = Object.fromEntries(clientsData.map(c => [c.id, c]));
          }
        }

        if (multaIds.length > 0) {
          const { data: multasData } = await supabase
            .from('multas')
            .select('id, numero_auto, placa_veiculo, descricao_infracao, valor_original')
            .in('id', multaIds);
          
          if (multasData) {
            multasMap = Object.fromEntries(multasData.map(m => [m.id, m]));
          }
        }

        // Mapear service_orders para formato de recurso
        const mappedServiceOrders = initiated.map((order: any) => {
          const cliente = clientsMap[order.client_id];
          const multa = multasMap[order.multa_id];
          
          return {
            id: `so-${order.id}`,
            numero_processo: `SO-${String(order.id).slice(0, 8)}`,
            tipo_recurso: order.multa_type || 'geral',
            status: order.recurso_status || 'em_analise',
            fundamentacao: order.ai_analysis || '',
            observacoes: order.description || '',
            created_at: order.created_at,
            multa_id: order.multa_id || null,
            client_id: order.client_id,
            geradoPorIA: Boolean(order.ai_analysis || order.recurso_generated_url),
            is_service_order: true,
            recurso_generated_url: order.recurso_generated_url,
            service_order_status: order.status,
            client_name: cliente?.nome || 'Cliente não encontrado',
            client_email: cliente?.email || '',
            client_telefone: cliente?.telefone || '',
            multa_numero: multa?.numero_auto || 'N/A',
            multa_placa: multa?.placa_veiculo || 'N/A',
            multa_descricao: multa?.descricao_infracao || 'N/A',
            valor_original: order.value || multa?.valor_original || 0
          };
        });

        // Mapear recursos da tabela recursos
        const mappedRecursos = (recursosData || []).map((recurso: any) => {
          const cliente = clientsMap[recurso.client_id];
          const multa = multasMap[recurso.multa_id];
          
          return {
            id: recurso.id,
            numero_processo: recurso.titulo || `Recurso ${String(recurso.id).slice(0, 8)}`,
            tipo_recurso: recurso.tipo_recurso || 'defesa_previa',
            status: recurso.status || 'iniciado',
            fundamentacao: recurso.observacoes || '',
            observacoes: recurso.observacoes || '',
            created_at: recurso.created_at,
            multa_id: recurso.multa_id || null,
            client_id: recurso.client_id,
            geradoPorIA: Boolean(recurso.metadata?.ocr_processed),
            is_service_order: false,
            recurso_generated_url: null,
            service_order_status: null,
            client_name: recurso.nome_requerente || cliente?.nome || 'Cliente não encontrado',
            client_email: cliente?.email || '',
            client_telefone: cliente?.telefone || '',
            multa_numero: recurso.numero_auto || multa?.numero_auto || 'N/A',
            multa_placa: recurso.placa_veiculo || multa?.placa_veiculo || 'N/A',
            multa_descricao: multa?.descricao_infracao || 'N/A',
            valor_original: recurso.valor_multa || multa?.valor_original || 0,
            data_prazo: recurso.data_prazo
          };
        });

        // Combinar ambos os arrays
        const allRecursos = [...mappedRecursos, ...mappedServiceOrders];

        console.log(`📋 [Recursos] Total de recursos: ${allRecursos.length} (${mappedRecursos.length} da tabela recursos + ${mappedServiceOrders.length} service_orders)`);
        setSoRecursos(allRecursos);
      } catch (e) {
        console.error('Erro ao carregar service_orders iniciados:', e);
        setSoRecursos([]);
      }
    };

    fetchServiceOrdersIniciados();
  }, [user]);

  // Filtrar recursos baseado no papel do usuário
  // Base: apenas recursos iniciados dos service_orders
  const recursosIniciados = soRecursos;

  const filteredRecursos = recursosIniciados.filter(recurso => {
    const multa = multas.find(m => m.id === recurso.multa_id);
    if (user?.role === 'Usuario/Cliente') {
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

  // Paginação
  const totalPages = Math.ceil(filteredRecursos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecursos = filteredRecursos.slice(startIndex, endIndex);
  
  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, tipoFilter]);
  
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
  
  const handleViewDetails = async (recurso: any) => {
    // Abrir recurso em nova guia
    try {
      console.log('🔍 Abrindo detalhes do recurso:', recurso);
      
      // Buscar service_order vinculada ao recurso
      const { data: serviceOrder, error } = await supabase
        .from('service_orders')
        .select('id, asaas_payment_id')
        .eq('recurso_id', recurso.id)
        .single();
      
      if (error) {
        console.error('Erro ao buscar service_order:', error);
      }
      
      // Construir URL com parâmetros
      const serviceOrderId = serviceOrder?.asaas_payment_id || serviceOrder?.id || recurso.id;
      const params = new URLSearchParams({
        serviceOrderId: serviceOrderId,
        nome: recurso.nome_requerente || recurso.client_name || '',
      });
      
      // Abrir em nova guia
      const url = `/teste-recurso-ia?${params.toString()}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Erro ao abrir detalhes do recurso:', error);
      toast.error('Erro ao abrir detalhes do recurso');
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Filters Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
        
        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.role === 'Usuario/Cliente' ? 'Meus Recursos' : 'Gestão de Recursos'}
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {user?.role === 'Usuario/Cliente'
              ? 'Acompanhe o status dos seus recursos de multas'
              : 'Gerencie recursos de multas dos clientes'
            }
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/recursos/novo')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-medium"
          >
            <FileText className="h-5 w-5" />
            Novo Recurso
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total de Recursos</p>
              <p className="text-3xl font-bold mt-2">{filteredRecursos.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm">
              <FileText className="w-7 h-7" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Em Análise</p>
              <p className="text-3xl font-bold mt-2">
                {filteredRecursos.filter(r => r.status === 'em_analise').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm">
              <Clock className="w-7 h-7" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Deferidos</p>
              <p className="text-3xl font-bold mt-2">
                {filteredRecursos.filter(r => r.status === 'deferido').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm">
              <CheckCircle className="w-7 h-7" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Taxa de Sucesso</p>
              <p className="text-3xl font-bold mt-2">
                {filteredRecursos.length > 0 
                  ? Math.round((filteredRecursos.filter(r => r.status === 'deferido').length / filteredRecursos.filter(r => r.status !== 'em_analise').length) * 100) || 0
                  : 0}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm">
              <Percent className="w-7 h-7" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <option value="conversao">Art. 267 CTB - Conversão</option>
            <option value="defesa_previa">Defesa Prévia</option>
            <option value="jari">JARI</option>
            <option value="cetran">CETRAN</option>
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
          Mostrando {startIndex + 1}-{Math.min(endIndex, filteredRecursos.length)} de {filteredRecursos.length} recurso{filteredRecursos.length !== 1 ? 's' : ''}
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-gray-500">
            Página {currentPage} de {totalPages}
          </p>
        )}
      </div>
      
      {/* Recursos Lista */}
      {paginatedRecursos.length > 0 ? (
        <div className="space-y-3">
          {paginatedRecursos.map((recurso) => {
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
                showActions={!recurso.is_service_order}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Nenhum recurso encontrado</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'all' || tipoFilter !== 'all' 
              ? 'Não há recursos que correspondam aos filtros selecionados. Tente ajustar os filtros ou criar um novo recurso.'
              : 'Você ainda não possui recursos cadastrados. Comece criando seu primeiro recurso de multa.'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/meus-servicos')}
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <FileText className="w-4 h-4 mr-2" />
              Criar Primeiro Recurso
            </button>
            {(searchTerm || statusFilter !== 'all' || tipoFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTipoFilter('all');
                }}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Paginação */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  const maxVisible = 5;
                  if (totalPages <= maxVisible) {
                    pageNumber = i + 1;
                  } else if (currentPage <= Math.floor(maxVisible / 2) + 1) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - Math.floor(maxVisible / 2)) {
                    pageNumber = totalPages - maxVisible + 1 + i;
                  } else {
                    pageNumber = currentPage - Math.floor(maxVisible / 2) + i;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={cn(
                        'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                        currentPage === pageNumber
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próximo
              </button>
            </div>
            
            <div className="text-sm text-gray-500 text-center sm:text-right">
              {filteredRecursos.length} recursos no total
            </div>
          </div>
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