import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Pause, 
  Play,
  Eye,
  Building2,
  Users,
  DollarSign,
  Calendar,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { useEmpresasStore } from '@/stores/empresasStore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface EmpresaCardProps {
  empresa: any;
  onEdit: (empresa: any) => void;
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
  onDelete: (id: string) => void;
}

function EmpresaCard({ empresa, onEdit, onSuspend, onReactivate, onDelete }: EmpresaCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            empresa.status === 'ativa' ? 'bg-green-100' : 'bg-gray-100'
          )}>
            <Building2 className={cn(
              'w-6 h-6',
              empresa.status === 'ativa' ? 'text-green-600' : 'text-gray-600'
            )} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{empresa.nome}</h3>
            <p className="text-sm text-gray-600">{empresa.cnpj}</p>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <Link
                to={`/empresas/${empresa.id}`}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setShowMenu(false)}
              >
                <Eye className="w-4 h-4" />
                <span>Ver Detalhes</span>
              </Link>
              
              <button
                onClick={() => {
                  onEdit(empresa);
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Edit className="w-4 h-4" />
                <span>Editar</span>
              </button>
              
              {empresa.status === 'ativa' ? (
                <button
                  onClick={() => {
                    onSuspend(empresa.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50"
                >
                  <Pause className="w-4 h-4" />
                  <span>Suspender</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onReactivate(empresa.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                >
                  <Play className="w-4 h-4" />
                  <span>Reativar</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  onDelete(empresa.id);
                  setShowMenu(false);
                }}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Mail className="w-4 h-4" />
          <span>{empresa.email}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Phone className="w-4 h-4" />
          <span>{empresa.telefone}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{empresa.cidade}, {empresa.estado}</span>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{empresa.totalClientes} clientes</span>
            </div>
            
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span>R$ {(empresa.receitaMensal || 0).toFixed(2)}/mês</span>
            </div>
          </div>
          
          <span className={cn(
            'px-2 py-1 text-xs font-medium rounded-full',
            empresa.status === 'ativa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          )}>
            {empresa.status === 'ativa' ? 'Ativa' : 'Suspensa'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <Calendar className="w-3 h-3" />
          <span>Criada em {empresa.dataCriacao ? format(new Date(empresa.dataCriacao), 'dd/MM/yyyy', { locale: ptBR }) : 'Data não disponível'}</span>
        </div>
      </div>
    </div>
  );
}

interface EmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa?: any;
  onSave: (empresa: any) => void;
}

function EmpresaModal({ isOpen, onClose, empresa, onSave }: EmpresaModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    planoId: '',
    responsavel: '',
    emailResponsavel: ''
  });
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  
  const { planos } = useEmpresasStore();
  
  useEffect(() => {
    if (empresa) {
      setFormData({
        nome: empresa.nome || '',
        cnpj: empresa.cnpj || '',
        email: empresa.email || '',
        telefone: empresa.telefone || '',
        endereco: empresa.endereco || '',
        cidade: empresa.cidade || '',
        estado: empresa.estado || '',
        cep: empresa.cep || '',
        planoId: empresa.planoId || '',
        responsavel: empresa.responsavel || '',
        emailResponsavel: empresa.emailResponsavel || ''
      });
    } else {
      setFormData({
        nome: '',
        cnpj: '',
        email: '',
        telefone: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        planoId: '',
        responsavel: '',
        emailResponsavel: ''
      });
    }
  }, [empresa, isOpen]);
  
  // Função para buscar dados do CNPJ
  const buscarDadosCnpj = async (cnpj: string) => {
    // Remove caracteres não numéricos
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    // Verifica se o CNPJ tem 14 dígitos
    if (cnpjLimpo.length !== 14) return;
    
    setIsLoadingCnpj(true);
    
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Mapeia os dados da API para o formulário
        setFormData(prev => ({
          ...prev,
          nome: data.razao_social || data.nome_fantasia || '',
          email: data.email || '',
          telefone: data.ddd_telefone_1 || '',
          endereco: `${data.logradouro || ''}, ${data.numero || ''} ${data.complemento || ''}`.trim(),
          cidade: data.municipio || '',
          estado: data.uf || '',
          cep: data.cep || ''
        }));
        
        toast.success('Dados da empresa carregados com sucesso!');
      } else {
        toast.error('CNPJ não encontrado ou inválido');
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      toast.error('Erro ao buscar dados do CNPJ');
    } finally {
      setIsLoadingCnpj(false);
    }
  };
  
  // Função para lidar com mudanças no CNPJ
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setFormData({ ...formData, cnpj: valor });
    
    // Se o CNPJ tiver 14 dígitos (sem formatação), busca automaticamente
    const cnpjLimpo = valor.replace(/\D/g, '');
    if (cnpjLimpo.length === 14) {
      buscarDadosCnpj(valor);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {empresa ? 'Editar Empresa' : 'Nova Empresa'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CNPJ * 
                {isLoadingCnpj && (
                  <span className="text-blue-600 text-xs ml-2">
                    Buscando dados...
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.cnpj}
                  onChange={handleCnpjChange}
                  placeholder="Digite o CNPJ para buscar dados automaticamente"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoadingCnpj}
                />
                {isLoadingCnpj && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Empresa *
              </label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone *
              </label>
              <input
                type="tel"
                required
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endereço
              </label>
              <input
                type="text"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cidade *
              </label>
              <input
                type="text"
                required
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado *
              </label>
              <select
                required
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
                <option value="RS">Rio Grande do Sul</option>
                <option value="PR">Paraná</option>
                <option value="SC">Santa Catarina</option>
                <option value="BA">Bahia</option>
                <option value="GO">Goiás</option>
                <option value="DF">Distrito Federal</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CEP
              </label>
              <input
                type="text"
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Responsável *
              </label>
              <input
                type="text"
                required
                value={formData.responsavel}
                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email do Responsável *
              </label>
              <input
                type="email"
                required
                value={formData.emailResponsavel}
                onChange={(e) => setFormData({ ...formData, emailResponsavel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
              {empresa ? 'Atualizar' : 'Criar'} Empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Empresas() {
  const { 
    empresas, 
    planos, 
    fetchEmpresas, 
    criarEmpresa, 
    atualizarEmpresa, 
    suspenderEmpresa, 
    reativarEmpresa,
    isLoading 
  } = useEmpresasStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planoFilter, setPlanoFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<any>(null);
  
  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);
  
  const filteredEmpresas = empresas.filter(empresa => {
    const matchesSearch = empresa.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         empresa.cnpj.includes(searchTerm) ||
                         empresa.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || empresa.status === statusFilter;
    const matchesPlano = planoFilter === 'all' || empresa.planoId === planoFilter;
    
    return matchesSearch && matchesStatus && matchesPlano;
  });
  
  const handleCreateEmpresa = (data: any) => {
    criarEmpresa(data);
    toast.success('Empresa criada com sucesso!');
  };
  
  const handleUpdateEmpresa = (data: any) => {
    if (editingEmpresa) {
      atualizarEmpresa(editingEmpresa.id, data);
      toast.success('Empresa atualizada com sucesso!');
      setEditingEmpresa(null);
    }
  };
  
  const handleSuspendEmpresa = (id: string) => {
    suspenderEmpresa(id);
    toast.success('Empresa suspensa com sucesso!');
  };
  
  const handleReactivateEmpresa = (id: string) => {
    reativarEmpresa(id);
    toast.success('Empresa reativada com sucesso!');
  };
  
  const handleDeleteEmpresa = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
      // Simular exclusão da empresa
      const updatedEmpresas = empresas.filter(e => e.id !== id);
      // Aqui você atualizaria o estado global das empresas
      toast.success('Empresa excluída com sucesso!');
    }
  };
  
  const handleEditEmpresa = (empresa: any) => {
    setEditingEmpresa(empresa);
    setShowModal(true);
  };
  
  const handleNewEmpresa = () => {
    setEditingEmpresa(null);
    setShowModal(true);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando empresas...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Empresas</h1>
          <p className="text-gray-600 mt-1">Gerencie as empresas clientes da plataforma</p>
        </div>
        <button
          onClick={handleNewEmpresa}
          className="mt-4 sm:mt-0 inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Empresa</span>
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar empresas..."
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
            <option value="ativa">Ativas</option>
            <option value="suspensa">Suspensas</option>
          </select>
          
          <select
            value={planoFilter}
            onChange={(e) => setPlanoFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os planos</option>
            {planos.map((plano) => (
              <option key={plano.id} value={plano.id}>
                {plano.nome}
              </option>
            ))}
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
          {filteredEmpresas.length} empresa{filteredEmpresas.length !== 1 ? 's' : ''} encontrada{filteredEmpresas.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      {/* Companies Grid */}
      {filteredEmpresas.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEmpresas.map((empresa) => (
            <EmpresaCard
              key={empresa.id}
              empresa={empresa}
              onEdit={handleEditEmpresa}
              onSuspend={handleSuspendEmpresa}
              onReactivate={handleReactivateEmpresa}
              onDelete={handleDeleteEmpresa}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma empresa encontrada</h3>
          <p className="text-gray-600 mb-6">Não há empresas que correspondam aos filtros selecionados.</p>
          <button
            onClick={handleNewEmpresa}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Criar primeira empresa</span>
          </button>
        </div>
      )}
      
      {/* Modal */}
      <EmpresaModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEmpresa(null);
        }}
        empresa={editingEmpresa}
        onSave={editingEmpresa ? handleUpdateEmpresa : handleCreateEmpresa}
      />
    </div>
  );
}