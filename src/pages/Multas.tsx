import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  FileText,
  Car,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Upload,
  Bot,
  MessageSquare
} from 'lucide-react';
import { useMultasStore } from '@/stores/multasStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface MultaCardProps {
  multa: any;
  onEdit: (multa: any) => void;
  onDelete: (id: string) => void;
  onCreateRecurso: (multaId: string) => void;
  onViewDetails: (multa: any) => void;
  showActions?: boolean;
}

function MultaCard({ multa, onEdit, onDelete, onCreateRecurso, onViewDetails, showActions = true }: MultaCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuthStore();
  
  // Função auxiliar para verificar se o usuário pode gerenciar multas
  const canManageMultas = (userRole: string | undefined) => {
    if (!userRole) return false;
    return userRole === 'Despachante' || userRole === 'ICETRAN' || userRole === 'Superadmin' || 
           userRole === 'user' || userRole === 'admin'; // Compatibilidade com roles antigos
  };
  
  const canCreateRecurso = multa.status === 'pendente' && canManageMultas(user?.role);
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            multa.status === 'pendente' ? 'bg-yellow-100' :
            multa.status === 'em_recurso' ? 'bg-blue-100' :
            multa.status === 'deferida' ? 'bg-green-100' :
            'bg-red-100'
          )}>
            <Car className={cn(
              'w-6 h-6',
              multa.status === 'pendente' ? 'text-yellow-600' :
              multa.status === 'em_recurso' ? 'text-blue-600' :
              multa.status === 'deferida' ? 'text-green-600' :
              'text-red-600'
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{multa.placa}</h3>
            <p className="text-sm text-gray-600">{multa.numeroAuto}</p>
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
                    onViewDetails(multa);
                    setShowMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Detalhes</span>
                </button>
                
                {canManageMultas(user?.role) && (
                  <>
                    <button
                      onClick={() => {
                        onEdit(multa);
                        setShowMenu(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Editar</span>
                    </button>
                    
                    {canCreateRecurso && (
                      <button
                        onClick={() => {
                          onCreateRecurso(multa.id);
                          setShowMenu(false);
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                      >
                        <Bot className="w-4 h-4" />
                        <span>Criar Recurso IA</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        onViewDetails(multa);
                        setShowMenu(false);
                        // Scroll para a seção de recursos N8N após navegar
                        setTimeout(() => {
                          const element = document.querySelector('[data-section="recursos-n8n"]');
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 500);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Ver Recursos N8N</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        onDelete(multa.id);
                        setShowMenu(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{multa.descricao_infracao}</p>
          <p className="text-xs text-gray-600">{multa.codigo_infracao}</p>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{format(new Date(multa.data_infracao), 'dd/MM/yyyy', { locale: ptBR })}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{multa.local_infracao}</span>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-1 text-lg font-semibold text-gray-900">
            <DollarSign className="w-5 h-5" />
            <span>R$ {(multa.valor || 0).toFixed(2)}</span>
          </div>
          
          <span className={cn(
            'px-2 py-1 text-xs font-medium rounded-full',
            multa.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
            multa.status === 'em_recurso' ? 'bg-blue-100 text-blue-800' :
            multa.status === 'deferida' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          )}>
            {multa.status === 'pendente' ? 'Pendente' :
             multa.status === 'em_recurso' ? 'Em Recurso' :
             multa.status === 'deferida' ? 'Deferida' : 'Indeferida'}
          </span>
        </div>
        
        {multa.data_vencimento && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Vence em {format(new Date(multa.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface MultaModalProps {
  isOpen: boolean;
  onClose: () => void;
  multa?: any;
  onSave: (multa: any) => void;
}

function MultaModal({ isOpen, onClose, multa, onSave }: MultaModalProps) {
  const [formData, setFormData] = useState({
    numero_auto: '',
    placa_veiculo: '',
    codigo_infracao: '',
    descricao_infracao: '',
    data_infracao: '',
    local_infracao: '',
    valor: '',
    data_vencimento: '',
    orgao_autuador: '',
    client_id: ''
  });
  
  useEffect(() => {
    if (multa) {
      setFormData({
        numero_auto: multa.numero_auto || '',
        placa_veiculo: multa.placa_veiculo || '',
        codigo_infracao: multa.codigo_infracao || '',
        descricao_infracao: multa.descricao_infracao || '',
        data_infracao: multa.data_infracao ? multa.data_infracao.split('T')[0] : '',
        local_infracao: multa.local_infracao || '',
        valor: multa.valor?.toString() || '',
        data_vencimento: multa.data_vencimento ? multa.data_vencimento.split('T')[0] : '',
        orgao_autuador: multa.orgao_autuador || '',
        client_id: multa.client_id || ''
      });
    } else {
      setFormData({
        numero_auto: '',
        placa_veiculo: '',
        codigo_infracao: '',
        descricao_infracao: '',
        data_infracao: '',
        local_infracao: '',
        valor: '',
        data_vencimento: '',
        orgao_autuador: '',
        client_id: ''
      });
    }
  }, [multa, isOpen]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      valor: parseFloat(formData.valor)
    });
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {multa ? 'Editar Multa' : 'Nova Multa'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número do Auto *
              </label>
              <input
                type="text"
                required
                value={formData.numero_auto}
                onChange={(e) => setFormData({ ...formData, numero_auto: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placa *
              </label>
              <input
                type="text"
                required
                value={formData.placa_veiculo}
                onChange={(e) => setFormData({ ...formData, placa_veiculo: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ABC1234"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Infração *
              </label>
              <select
                required
                value={formData.codigo_infracao}
                onChange={(e) => setFormData({ ...formData, codigo_infracao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                <option value="Velocidade">Excesso de Velocidade</option>
                <option value="Estacionamento">Estacionamento Irregular</option>
                <option value="Sinalização">Desrespeito à Sinalização</option>
                <option value="Documentação">Documentação</option>
                <option value="Equipamentos">Equipamentos Obrigatórios</option>
                <option value="Outras">Outras</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição da Infração *
              </label>
              <textarea
                required
                rows={3}
                value={formData.descricao_infracao}
                onChange={(e) => setFormData({ ...formData, descricao_infracao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data da Infração *
              </label>
              <input
                type="date"
                required
                value={formData.data_infracao}
                onChange={(e) => setFormData({ ...formData, data_infracao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Local da Infração *
              </label>
              <input
                type="text"
                required
                value={formData.local_infracao}
                onChange={(e) => setFormData({ ...formData, local_infracao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Órgão Autuador *
              </label>
              <select
                required
                value={formData.orgao_autuador}
                onChange={(e) => setFormData({ ...formData, orgao_autuador: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                <option value="DETRAN-SP">DETRAN-SP</option>
                <option value="DETRAN-RJ">DETRAN-RJ</option>
                <option value="DETRAN-MG">DETRAN-MG</option>
                <option value="PRF">Polícia Rodoviária Federal</option>
                <option value="CET">CET</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {multa ? 'Atualizar' : 'Criar'} Multa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface MultaDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  multa: any;
}

function MultaDetailsModal({ isOpen, onClose, multa }: MultaDetailsModalProps) {
  if (!isOpen || !multa) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Detalhes da Multa</h2>
            <span className={cn(
              'px-3 py-1 text-sm font-medium rounded-full',
              multa.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
              multa.status === 'em_recurso' ? 'bg-blue-100 text-blue-800' :
              multa.status === 'deferida' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            )}>
              {multa.status === 'pendente' ? 'Pendente' :
               multa.status === 'em_recurso' ? 'Em Recurso' :
               multa.status === 'deferida' ? 'Deferida' : 'Indeferida'}
            </span>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">INFORMAÇÕES DO VEÍCULO</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Placa</p>
                  <p className="font-medium text-gray-900">{multa.placa_veiculo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Número do Auto</p>
                  <p className="font-medium text-gray-900">{multa.numero_auto}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">INFORMAÇÕES FINANCEIRAS</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Valor da Multa</p>
                  <p className="text-2xl font-bold text-gray-900">R$ {(multa.valor || 0).toFixed(2)}</p>
                </div>
                {multa.data_vencimento && (
                  <div>
                    <p className="text-sm text-gray-600">Data de Vencimento</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(multa.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">DETALHES DA INFRAÇÃO</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <p className="font-medium text-gray-900">{multa.codigo_infracao}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Descrição</p>
                <p className="font-medium text-gray-900">{multa.descricao_infracao}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Data da Infração</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(multa.data_infracao), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Local</p>
                <p className="font-medium text-gray-900">{multa.local_infracao}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Órgão Autuador</p>
                <p className="font-medium text-gray-900">{multa.orgao_autuador}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Multas() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { 
    multas, 
    fetchMultas, 
    addMulta, 
    updateMulta, 
    criarRecurso,
    isLoading 
  } = useMultasStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingMulta, setEditingMulta] = useState<any>(null);
  const [selectedMulta, setSelectedMulta] = useState<any>(null);

  // Carregar multas com filtro por empresa para despachantes
  useEffect(() => {
    const loadMultas = async () => {
      if (!user) return;
      
      let filters = {};
      
      // Superadmin vê todas as multas
      if (user.role === 'Superadmin') {
        filters = {};
      } else {
        // Despachantes e ICETRAN veem apenas multas da sua empresa
        if (!user.company_id) {
          console.error('Usuário não possui empresa associada');
          return;
        }
        filters = { companyId: user.company_id };
      }
      
      await fetchMultas(filters);
    };
    
    loadMultas();
  }, [user, fetchMultas]);
  
  // Filtrar multas baseado no papel do usuário
  const filteredMultas = multas.filter(multa => {
    // Se for cliente, mostrar apenas suas multas
    if (user?.role === 'Usuario/Cliente' && multa.client_id !== user.id) {
      return false;
    }
    
    const matchesSearch = multa.placa_veiculo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         multa.numero_auto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (multa.descricao_infracao || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || multa.status === statusFilter;
    const matchesTipo = tipoFilter === 'all' || (multa.descricao_infracao || '').includes(tipoFilter);
    
    return matchesSearch && matchesStatus && matchesTipo;
  });
  
  const handleCreateMulta = (data: any) => {
    addMulta({
      ...data,
      client_id: user?.role === 'Usuario/Cliente' ? user.id : data.clienteId
    });
    toast.success('Multa criada com sucesso!');
  };
  
  const handleUpdateMulta = (data: any) => {
    if (editingMulta) {
      updateMulta(editingMulta.id, data);
      toast.success('Multa atualizada com sucesso!');
      setEditingMulta(null);
    }
  };
  
  const handleDeleteMulta = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta multa? Esta ação não pode ser desfeita.')) {
      // Simular exclusão da multa
      const updatedMultas = multas.filter(m => m.id !== id);
      // Aqui você atualizaria o estado global das multas
      toast.success('Multa excluída com sucesso!');
    }
  };
  
  const handleCreateRecurso = async (multaId: string) => {
    try {
      await criarRecurso(multaId);
      toast.success('Recurso criado com sucesso pela IA!');
    } catch (error) {
      toast.error('Erro ao criar recurso. Tente novamente.');
    }
  };
  
  const handleEditMulta = (multa: any) => {
    setEditingMulta(multa);
    setShowModal(true);
  };
  
  const handleViewDetails = (multa: any) => {
    if (multa?.id) {
      navigate(`/multas/${multa.id}`);
    }
  };
  
  const handleNewMulta = () => {
    setEditingMulta(null);
    setShowModal(true);
  };
  
  // Função auxiliar para verificar se o usuário pode gerenciar multas
  const canManageMultas = (userRole: string | undefined) => {
    if (!userRole) return false;
    return userRole === 'Despachante' || userRole === 'ICETRAN' || userRole === 'Superadmin' || 
           userRole === 'user' || userRole === 'admin'; // Compatibilidade com roles antigos
  };
  
  const canCreateMulta = canManageMultas(user?.role);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando multas...</p>
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
            {user?.role === 'Usuario/Cliente' ? 'Minhas Multas' : 'Gestão de Multas'}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'Usuario/Cliente'
              ? 'Visualize e acompanhe suas multas e recursos'
              : 'Gerencie multas e recursos dos clientes'
            }
          </p>
        </div>
        {canCreateMulta && (
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Upload className="w-4 h-4" />
              <span>Importar</span>
            </button>
            <button
              onClick={handleNewMulta}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Multa</span>
            </button>
          </div>
        )}
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar multas..."
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
            <option value="pendente">Pendentes</option>
            <option value="em_recurso">Em Recurso</option>
            <option value="deferida">Deferidas</option>
            <option value="indeferida">Indeferidas</option>
          </select>
          
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os tipos</option>
            <option value="Velocidade">Excesso de Velocidade</option>
            <option value="Estacionamento">Estacionamento</option>
            <option value="Sinalização">Sinalização</option>
            <option value="Documentação">Documentação</option>
            <option value="Equipamentos">Equipamentos</option>
            <option value="Outras">Outras</option>
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
          {filteredMultas.length} multa{filteredMultas.length !== 1 ? 's' : ''} encontrada{filteredMultas.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      {/* Multas Grid */}
      {filteredMultas.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMultas.map((multa) => (
            <MultaCard
              key={multa.id}
              multa={multa}
              onEdit={handleEditMulta}
              onDelete={handleDeleteMulta}
              onCreateRecurso={handleCreateRecurso}
              onViewDetails={handleViewDetails}
              showActions={true}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma multa encontrada</h3>
          <p className="text-gray-600 mb-6">Não há multas que correspondam aos filtros selecionados.</p>
          {canCreateMulta && (
            <button
              onClick={handleNewMulta}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Criar primeira multa</span>
            </button>
          )}
        </div>
      )}
      
      {/* Modals */}
      <MultaModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMulta(null);
        }}
        multa={editingMulta}
        onSave={editingMulta ? handleUpdateMulta : handleCreateMulta}
      />
      
      <MultaDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedMulta(null);
        }}
        multa={selectedMulta}
      />
    </div>
  );
}