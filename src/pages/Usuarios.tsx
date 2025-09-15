import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  MoreVertical,
  User,
  Mail,
  Phone,
  Shield,
  RotateCw,
  Users,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role: 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente' | 'admin' | 'user' | 'viewer'; // Incluir roles antigos para compatibilidade
  company_id: string;
  ativo: boolean;
  ultimo_login?: string;
  created_at: string;
  asaas_customer_id?: string;
}

interface DespachanteWithoutCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  asaas_customer_id?: string;
  created_at: string;
  user_profiles: {
    role: string;
  };
}

interface UsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuario?: Usuario | null;
  onSave: (usuario: any) => void;
}

function UsuarioModal({ isOpen, onClose, usuario, onSave }: UsuarioModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    role: 'Usuario/Cliente' as 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente',
    password: '',
    confirmPassword: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (usuario) {
      setFormData({
        nome: usuario.nome || '',
        email: usuario.email || '',
        telefone: usuario.telefone || '',
        role: (usuario.role === 'admin' ? 'ICETRAN' : 
               usuario.role === 'user' ? 'Despachante' : 
               usuario.role === 'viewer' ? 'Usuario/Cliente' : 
               usuario.role) as 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente' || 'Usuario/Cliente',
        password: '',
        confirmPassword: ''
      });
    } else {
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        role: 'Usuario/Cliente',
        password: '',
        confirmPassword: ''
      });
    }
  }, [usuario, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usuario && formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (!usuario && formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {usuario ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
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
                Telefone
              </label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Perfil de Acesso *
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Usuario/Cliente">Usuário/Cliente</option>
                <option value="Despachante">Despachante</option>
                <option value="ICETRAN">ICETRAN</option>
                <option value="Superadmin">Superadministrador</option>
              </select>
            </div>

            {!usuario && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    minLength={6}
                  />
                </div>
              </>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : (usuario ? 'Atualizar' : 'Criar')} Usuário
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface UsuarioCardProps {
  usuario: Usuario;
  onEdit: (usuario: Usuario) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

function UsuarioCard({ usuario, onEdit, onToggleStatus, onDelete }: UsuarioCardProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';

      case 'user': return 'bg-blue-100 text-blue-800';
      
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'Superadmin': return 'Superadministrador';
      case 'ICETRAN': return 'ICETRAN';
      case 'Despachante': return 'Despachante';
      case 'Usuario/Cliente': return 'Usuário/Cliente';
      // Manter compatibilidade com roles antigos durante transição
      case 'admin': return 'ICETRAN';
      case 'user': return 'Despachante';
      case 'viewer': return 'Usuário/Cliente';
      default: return role;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{usuario.nome}</h3>
            <div className="flex items-center space-x-4 mt-1">
              <div className="flex items-center text-gray-600">
                <Mail className="w-4 h-4 mr-1" />
                <span className="text-sm">{usuario.email}</span>
              </div>
              {usuario.telefone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="w-4 h-4 mr-1" />
                  <span className="text-sm">{usuario.telefone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(usuario.role)}`}>
            <Shield className="w-3 h-3 inline mr-1" />
            {getRoleLabel(usuario.role)}
          </span>
          
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            usuario.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {usuario.ativo ? (
              <>
                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                Ativo
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Inativo
              </>
            )}
          </span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {usuario.ultimo_login ? (
              <span>Último acesso: {new Date(usuario.ultimo_login).toLocaleDateString('pt-BR')}</span>
            ) : (
              <span>Nunca acessou</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(usuario)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar usuário"
            >
              <Edit className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => onToggleStatus(usuario.id)}
              className={`p-2 rounded-lg transition-colors ${
                usuario.ativo 
                  ? 'text-gray-600 hover:text-red-600 hover:bg-red-50' 
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
              title={usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}
            >
              {usuario.ativo ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => onDelete(usuario.id)}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Excluir usuário"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const { user } = useAuthStore();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para sincronização de customers
  const [despachantesWithoutCustomer, setDespachantesWithoutCustomer] = useState<DespachanteWithoutCustomer[]>([]);
  const [showSyncSection, setShowSyncSection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingUserId, setSyncingUserId] = useState<string | null>(null);
  const [loadingDespachantes, setLoadingDespachantes] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setIsLoading(true);
    try {
      // Simular busca de usuários da empresa
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - em produção, buscar do banco de dados filtrado por company_id
      const mockUsuarios: Usuario[] = [
        {
          id: '1',
          nome: 'João Silva',
          email: 'joao@empresa.com',
          telefone: '(11) 99999-9999',
          role: 'ICETRAN',
          company_id: user?.company_id || '',
          ativo: true,
          ultimo_login: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          nome: 'Maria Santos',
          email: 'maria@empresa.com',
          telefone: '(11) 88888-8888',
          role: 'Despachante',
          company_id: user?.company_id || '',
          ativo: true,
          created_at: new Date().toISOString()
        }
      ];
      
      setUsuarios(mockUsuarios);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || usuario.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'ativo' && usuario.ativo) ||
                         (statusFilter === 'inativo' && !usuario.ativo);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateUsuario = async (dados: any) => {
    try {
      // Aqui você implementaria a criação do usuário usando authService.register
      const novoUsuario: Usuario = {
        id: `user_${Date.now()}`,
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        role: dados.role,
        company_id: user?.company_id || '',
        ativo: true,
        created_at: new Date().toISOString()
      };
      
      setUsuarios(prev => [...prev, novoUsuario]);
      toast.success('Usuário criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast.error('Erro ao criar usuário');
      throw error;
    }
  };

  const handleUpdateUsuario = async (dados: any) => {
    if (!editingUsuario) return;
    
    try {
      const usuarioAtualizado = {
        ...editingUsuario,
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        role: dados.role
      };
      
      setUsuarios(prev => prev.map(u => u.id === editingUsuario.id ? usuarioAtualizado : u));
      toast.success('Usuário atualizado com sucesso!');
      setEditingUsuario(null);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
      throw error;
    }
  };

  const handleToggleStatus = (id: string) => {
    setUsuarios(prev => prev.map(u => 
      u.id === id ? { ...u, ativo: !u.ativo } : u
    ));
    
    const usuario = usuarios.find(u => u.id === id);
    toast.success(`Usuário ${usuario?.ativo ? 'desativado' : 'ativado'} com sucesso!`);
  };

  const handleDeleteUsuario = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      setUsuarios(prev => prev.filter(u => u.id !== id));
      toast.success('Usuário excluído com sucesso!');
    }
  };

  const handleEditUsuario = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setShowModal(true);
  };

  const handleNewUsuario = () => {
    setEditingUsuario(null);
    setShowModal(true);
  };

  // Funções para sincronização de customers
  const fetchDespachantesWithoutCustomer = async () => {
    setLoadingDespachantes(true);
    try {
      const response = await fetch('/api/users/despachantes-without-customer');
      const result = await response.json();
      
      if (result.success) {
        setDespachantesWithoutCustomer(result.data);
        console.log(`📋 Despachantes sem customer: ${result.data.length}`);
      } else {
        toast.error(`Erro ao buscar despachantes: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro ao buscar despachantes sem customer:', error);
      toast.error('Erro ao buscar despachantes sem customer');
    } finally {
      setLoadingDespachantes(false);
    }
  };

  const handleSyncSingleCustomer = async (userId: string, userName: string) => {
    setSyncingUserId(userId);
    try {
      const response = await fetch('/api/users/create-asaas-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Customer criado com sucesso para ${userName}!`);
        // Remover da lista de despachantes sem customer
        setDespachantesWithoutCustomer(prev => prev.filter(d => d.id !== userId));
      } else {
        toast.error(`Erro ao criar customer para ${userName}: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro ao criar customer:', error);
      toast.error(`Erro ao criar customer para ${userName}`);
    } finally {
      setSyncingUserId(null);
    }
  };

  const handleSyncAllCustomers = async () => {
    if (despachantesWithoutCustomer.length === 0) {
      toast.info('Nenhum despachante sem customer encontrado');
      return;
    }

    if (!confirm(`Deseja sincronizar ${despachantesWithoutCustomer.length} despachantes? Esta operação pode demorar alguns minutos.`)) {
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch('/api/users/sync-all-customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        const { total, success, errors } = result.data;
        
        if (success === total) {
          toast.success(`✅ Todos os ${success} despachantes foram sincronizados com sucesso!`);
        } else {
          toast.warning(`⚠️ ${success}/${total} despachantes sincronizados. ${errors.length} erros encontrados.`);
          
          // Mostrar erros no console para debug
          if (errors.length > 0) {
            console.error('Erros na sincronização:', errors);
          }
        }
        
        // Atualizar lista
        await fetchDespachantesWithoutCustomer();
      } else {
        toast.error(`Erro na sincronização: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro na sincronização em lote:', error);
      toast.error('Erro na sincronização em lote');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleSyncSection = async () => {
    if (!showSyncSection) {
      await fetchDespachantesWithoutCustomer();
    }
    setShowSyncSection(!showSyncSection);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-600 mt-1">Gerencie os usuários da sua empresa</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          {(user?.role === 'Superadmin' || user?.role === 'ICETRAN') && (
            <button
              onClick={handleToggleSyncSection}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
               <span>Sincronizar Customers</span>
            </button>
          )}
          <button
            onClick={handleNewUsuario}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>
      
      {/* Seção de Sincronização de Customers */}
      {showSyncSection && (user?.role === 'Superadmin' || user?.role === 'ICETRAN') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-orange-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Sincronização de Customers Asaas</h2>
                <p className="text-sm text-gray-600">Despachantes que ainda não possuem customer criado no Asaas</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={fetchDespachantesWithoutCustomer}
                disabled={loadingDespachantes}
                className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingDespachantes ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
              {despachantesWithoutCustomer.length > 0 && (
                <button
                  onClick={handleSyncAllCustomers}
                  disabled={isSyncing}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                   <span>{isSyncing ? 'Sincronizando...' : `Sincronizar Todos (${despachantesWithoutCustomer.length})`}</span>
                </button>
              )}
            </div>
          </div>
          
          {loadingDespachantes ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-2" />
                <p className="text-gray-600">Carregando despachantes...</p>
              </div>
            </div>
          ) : despachantesWithoutCustomer.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Todos os despachantes sincronizados!</h3>
              <p className="text-gray-600">Todos os despachantes já possuem customer criado no Asaas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 mb-3">
                Encontrados <strong>{despachantesWithoutCustomer.length}</strong> despachantes sem customer no Asaas
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {despachantesWithoutCustomer.map((despachante) => (
                  <div key={despachante.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{despachante.name}</h4>
                        <p className="text-sm text-gray-600">{despachante.email}</p>
                        {despachante.phone && (
                          <p className="text-sm text-gray-500">{despachante.phone}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Criado em: {new Date(despachante.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSyncSingleCustomer(despachante.id, despachante.name)}
                        disabled={syncingUserId === despachante.id || isSyncing}
                        className="ml-3 inline-flex items-center space-x-1 px-3 py-1 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50"
                      >
                        {syncingUserId === despachante.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Criando...</span>
                          </>
                        ) : (
                          <>
                             <RotateCw className="w-3 h-3" />
                             <span>Criar</span>
                           </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os perfis</option>
            <option value="admin">Administrador</option>
            <option value="user">Usuário</option>
            <option value="viewer">Visualizador</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
      </div>
      
      {/* Users Grid */}
      {filteredUsuarios.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredUsuarios.map((usuario) => (
            <UsuarioCard
              key={usuario.id}
              usuario={usuario}
              onEdit={handleEditUsuario}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteUsuario}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
          <p className="text-gray-600 mb-6">Não há usuários que correspondam aos filtros selecionados.</p>
          <button
            onClick={handleNewUsuario}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Criar primeiro usuário</span>
          </button>
        </div>
      )}
      
      {/* Modal */}
      <UsuarioModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingUsuario(null);
        }}
        usuario={editingUsuario}
        onSave={editingUsuario ? handleUpdateUsuario : handleCreateUsuario}
      />
    </div>
  );
}
