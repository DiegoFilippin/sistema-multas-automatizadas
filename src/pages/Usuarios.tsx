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
  Shield
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role: 'admin' | 'user' | 'viewer';
  company_id: string;
  ativo: boolean;
  ultimo_login?: string;
  created_at: string;
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
    role: 'user' as 'admin' | 'user' | 'viewer' | 'admin_master' | 'expert',
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
        role: usuario.role || 'user',
        password: '',
        confirmPassword: ''
      });
    } else {
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        role: 'user',
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
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' | 'viewer' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
                <option value="viewer">Visualizador</option>
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
      case 'admin_master': return 'bg-purple-100 text-purple-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      case 'expert': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'admin_master': return 'Admin Master';
      case 'user': return 'Usuário';
      case 'expert': return 'Especialista';
      case 'viewer': return 'Visualizador';
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
          role: 'admin',
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
          role: 'user',
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
        <button
          onClick={handleNewUsuario}
          className="mt-4 sm:mt-0 inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Usuário</span>
        </button>
      </div>
      
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
