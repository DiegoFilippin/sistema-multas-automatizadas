import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit,
  Trash2,
  CheckCircle2,
  User,
  RotateCw,
  Users,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { useEmpresasStore } from '../stores/empresasStore';
import type { Empresa } from '../stores/empresasStore';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';
import { authService } from '../services/authService';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  role: 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente' | 'admin' | 'user' | 'viewer'; // Incluir roles antigos para compatibilidade
  company_id: string;
  empresa_nome?: string;
  ativo: boolean;
  ultimo_login?: string;
  created_at: string;
  asaas_customer_id?: string;
}

type UsuarioFormData = {
  nome: string;
  email: string;
  telefone: string;
  role: 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente';
  password?: string;
  confirmPassword?: string;
  company_id?: string;
};

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
  onSave: (usuario: UsuarioFormData) => void;
  isSuperadmin?: boolean;
  empresas?: Empresa[];
}

function UsuarioModal({ isOpen, onClose, usuario, onSave, isSuperadmin = false, empresas = [] }: UsuarioModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    role: 'Usuario/Cliente' as 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente',
    password: '',
    confirmPassword: '',
    company_id: ''
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
        confirmPassword: '',
        company_id: usuario.company_id || ''
      });
    } else {
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        role: 'Usuario/Cliente',
        password: '',
        confirmPassword: '',
        company_id: ''
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

    if (isSuperadmin && !usuario && !formData.company_id) {
      toast.error('Selecione a empresa do usuário a ser criado');
      return;
    }

    setIsLoading(true);
    try {
      const sanitizedData = {
        ...formData,
        nome: formData.nome.trim(),
        email: formData.email.trim().toLowerCase(),
        telefone: formData.telefone?.trim() || '',
      };
      await onSave(sanitizedData);
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

            {isSuperadmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa {usuario ? '' : '*'}
                </label>
                <select
                  required={!usuario}
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione a empresa</option>
                  {empresas?.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nome}</option>
                  ))}
                </select>
              </div>
            )}

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

// Layout de cards removido após migração para lista/tabela de usuários.

export default function Usuarios() {
  const { user } = useAuthStore();
  const { empresas, fetchEmpresas } = useEmpresasStore();
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

  useEffect(() => {
    if (empresas.length === 0) {
      fetchEmpresas().catch(err => console.error('Erro ao carregar empresas:', err));
    }
  }, [empresas.length, fetchEmpresas]);

  useEffect(() => {
    if (showModal && user?.role === 'Superadmin' && empresas.length === 0) {
      fetchEmpresas().catch(err => console.error('Erro ao carregar empresas:', err));
    }
  }, [showModal, user?.role, empresas.length, fetchEmpresas]);

  useEffect(() => {
    if (empresas.length > 0 && usuarios.length > 0) {
      setUsuarios(prev => prev.map(u => {
        const emp = empresas.find(e => e.id === u.company_id);
        return { ...u, empresa_nome: emp?.nome };
      }));
    }
  }, [empresas, usuarios.length]);

  const isCreatingRef = useRef(false);

  const fetchUsuarios = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      // Superadmin e ICETRAN veem todos os usuários
      if (user?.role === 'Superadmin' || user?.role === 'ICETRAN') {
        // sem filtro de company_id
      } else if (user?.company_id) {
        // Outros papéis: restringir à empresa do usuário
        query = query.eq('company_id', user.company_id);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      type DbUser = Database['public']['Tables']['users']['Row'] & {
        telefone?: string;
        asaas_customer_id?: string;
      };

      const lista = ((data || []) as DbUser[]).map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        telefone: u.telefone,
        role: u.role as Usuario['role'],
        company_id: u.company_id || '',
        ativo: u.ativo,
        ultimo_login: u.ultimo_login || undefined,
        created_at: u.created_at,
        asaas_customer_id: u.asaas_customer_id,
        empresa_nome: empresas.find(e => e.id === (u.company_id || ''))?.nome
      }));

      setUsuarios(lista);
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

  const handleCreateUsuario = async (dados: UsuarioFormData) => {
    if (isCreatingRef.current) {
      toast.info('Processando criação de usuário...');
      return;
    }
    isCreatingRef.current = true;
    try {
      if (user?.role === 'Superadmin' && !dados.company_id) {
        toast.error('Selecione a empresa do usuário.');
        isCreatingRef.current = false;
        return;
      }

      if (!dados.password) {
        toast.error('Informe a senha do novo usuário.');
        isCreatingRef.current = false;
        return;
      }

      // Mapear papel do formulário para papel do banco (admin/user/viewer)
      const mapRoleToDb = (r: UsuarioFormData['role']): 'admin' | 'user' => {
        switch (r) {
          case 'ICETRAN':
            return 'admin';
          case 'Despachante':
            return 'user';
          case 'Usuario/Cliente':
            return 'user';
          case 'Superadmin':
            // Não criar Superadmin via UI de usuários; tratar como admin
            return 'admin';
          default:
            return 'user';
        }
      };

      const dbRole = mapRoleToDb(dados.role);
      const companyId = user?.role === 'Superadmin' ? (dados.company_id || '') : (user?.company_id || '');

      if (!companyId) {
        toast.error('Empresa do usuário não definida.');
        isCreatingRef.current = false;
        return;
      }

      // 1) Criar usuário na autenticação
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: dados.email,
        password: dados.password,
        options: {
          data: {
            nome: dados.nome,
            role: dbRole,
            company_id: companyId,
          },
        },
      });

      if (authError) {
        const msg = typeof authError.message === 'string' && authError.message.includes('registered')
          ? 'Email já registrado. Use outro email.'
          : `Erro na autenticação: ${authError.message}`;
        toast.error(msg);
        isCreatingRef.current = false;
        return;
      }

      const newUserId = authData.user?.id;
      if (!newUserId) {
        toast.error('Falha ao criar usuário de autenticação');
        isCreatingRef.current = false;
        return;
      }

      // 2) Criar perfil na tabela users; se duplicado, buscar perfil existente (evita RLS em update)
      let perfilData: Database['public']['Tables']['users']['Row'] | null = null;
      const insertRes = await supabase
        .from('users')
        .insert({
          id: newUserId,
          email: dados.email,
          nome: dados.nome,
          role: dbRole,
          company_id: companyId,
          ativo: true,
        })
        .select()
        .single();

      if (insertRes.error) {
        const err = insertRes.error as { code?: string; message?: string };
        if (err.code === '23505' || (typeof err.message === 'string' && err.message.includes('duplicate key'))) {
          // Já existe: buscar representação
          const { data: existing, error: getErr } = await supabase
            .from('users')
            .select('*')
            .eq('id', newUserId)
            .single();
          if (getErr) {
            throw new Error(getErr.message || 'Erro ao obter perfil existente');
          }
          perfilData = existing as Database['public']['Tables']['users']['Row'];
        } else {
          // Outro erro
          throw new Error(err.message || 'Erro ao criar perfil do usuário');
        }
      } else {
        perfilData = insertRes.data as Database['public']['Tables']['users']['Row'];
      }

      // 3) Atualizar estado local com o novo usuário persistido
      const empresaNome = empresas.find(e => e.id === companyId)?.nome;
      // Tipar perfilData com possível campo extra opcional
      type PerfilRow = Database['public']['Tables']['users']['Row'] & { asaas_customer_id?: string; telefone?: string };
      const p = perfilData as PerfilRow;
      const novoUsuario: Usuario = {
        id: p.id,
        nome: p.nome,
        email: p.email,
        telefone: p.telefone,
        role: p.role as Usuario['role'],
        company_id: p.company_id,
        empresa_nome: empresaNome,
        ativo: p.ativo,
        ultimo_login: p.ultimo_login || undefined,
        created_at: p.created_at,
        asaas_customer_id: p.asaas_customer_id,
      };

      setUsuarios(prev => [novoUsuario, ...prev]);
      isCreatingRef.current = false;
      toast.success('Usuário criado com sucesso! Um email de confirmação foi enviado.');
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      const message = error instanceof Error ? error.message : 'Erro ao criar usuário';
      if (typeof message === 'string' && /duplicate/i.test(message)) {
        toast.error('Email já registrado. Use outro email.');
      } else {
        toast.error(`Erro ao criar usuário: ${message}`);
      }
      // Não relançar o erro para evitar múltiplos toasts/logs
      isCreatingRef.current = false;
      return;
    }
  };

  const handleUpdateUsuario = async (dados: UsuarioFormData) => {
    if (!editingUsuario) return;
    
    try {
      // Mapear role do formulário para o banco
      const mapRoleToDb = (r: UsuarioFormData['role']): string => {
        switch (r) {
          case 'Superadmin': return 'admin_master';
          case 'ICETRAN': return 'admin';
          case 'Despachante': return 'user';
          case 'Usuario/Cliente': return 'viewer';
          default: return 'user';
        }
      };

      const dbRole = mapRoleToDb(dados.role);
      
      // Atualizar no banco de dados via authService
      await authService.adminUpdateUserProfile(editingUsuario.id, {
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        role: dbRole,
        company_id: dados.company_id || editingUsuario.company_id,
      });

      const usuarioAtualizado = {
        ...editingUsuario,
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        role: dados.role,
        company_id: dados.company_id || editingUsuario.company_id,
        empresa_nome: empresas.find(e => e.id === (dados.company_id || editingUsuario.company_id))?.nome
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

  const handleResetPassword = async (usuario: Usuario) => {
    if (!confirm(`Deseja enviar um email de redefinição de senha para ${usuario.nome} (${usuario.email})?`)) {
      return;
    }

    try {
      await authService.adminResetUserPassword(usuario.email);
      toast.success(`Email de redefinição de senha enviado para ${usuario.email}`);
    } catch (error) {
      console.error('Erro ao enviar email de redefinição:', error);
      toast.error('Erro ao enviar email de redefinição de senha');
    }
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perfil</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Login</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{usuario.nome}</div>
                      <div className="text-sm text-gray-600">{usuario.email}</div>
                      {usuario.telefone && <div className="text-xs text-gray-500">{usuario.telefone}</div>}
                    </td>
                    <td className="px-4 py-3">{usuario.empresa_nome || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        usuario.role === 'Superadmin' ? 'bg-purple-100 text-purple-800' :
                        usuario.role === 'ICETRAN' ? 'bg-blue-100 text-blue-800' :
                        usuario.role === 'Despachante' ? 'bg-orange-100 text-orange-800' :
                        usuario.role === 'Usuario/Cliente' ? 'bg-gray-100 text-gray-800' :
                        usuario.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        usuario.role === 'user' ? 'bg-orange-100 text-orange-800' :
                        usuario.role === 'viewer' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{usuario.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${usuario.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {usuario.ultimo_login ? new Date(usuario.ultimo_login).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleEditUsuario(usuario)}
                          className="inline-flex items-center px-2 py-1 text-sm text-blue-700 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 mr-1" /> Editar
                        </button>
                        {(user?.role === 'Superadmin' || user?.role === 'ICETRAN') && (
                          <button
                            onClick={() => handleResetPassword(usuario)}
                            className="inline-flex items-center px-2 py-1 text-sm text-orange-700 hover:text-orange-900"
                            title="Resetar Senha"
                          >
                            <KeyRound className="w-4 h-4 mr-1" /> Resetar Senha
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleStatus(usuario.id)}
                          className="inline-flex items-center px-2 py-1 text-sm text-gray-700 hover:text-gray-900"
                          title={usuario.ativo ? 'Desativar' : 'Ativar'}
                        >
                          {usuario.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => handleDeleteUsuario(usuario.id)}
                          className="inline-flex items-center px-2 py-1 text-sm text-red-700 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        isSuperadmin={user?.role === 'Superadmin'}
        empresas={empresas}
      />
    </div>
  );
}
