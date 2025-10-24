import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Users, 
  BarChart3, 
  Settings,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  UserPlus,
  Shield,
  Eye,
  EyeOff,
  Wallet
} from 'lucide-react';
import { useEmpresasStore } from '../stores/empresasStore';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import SubcontaAsaasTab from '../components/SubcontaAsaasTab';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente' | 'admin' | 'user' | 'viewer';
  ativo: boolean;
  ultimo_login: string | null;
  created_at: string;
}

interface EstatisticasUso {
  recursosUsados: number;
  clientesCadastrados: number;
  multasProcessadas: number;
  receitaMensal: number;
}

export default function EmpresaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { empresas, isLoading, fetchEmpresas, atualizarEmpresa, suspenderEmpresa, reativarEmpresa } = useEmpresasStore();
  
  const [activeTab, setActiveTab] = useState<'dados' | 'usuarios' | 'uso' | 'subconta' | 'configuracoes'>('dados');
  const [isEditing, setIsEditing] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [estatisticas, setEstatisticas] = useState<EstatisticasUso>({
    recursosUsados: 0,
    clientesCadastrados: 0,
    multasProcessadas: 0,
    receitaMensal: 0
  });
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    responsavel: '',
    emailResponsavel: ''
  });

  const empresa = empresas.find(emp => emp.id === id);

  useEffect(() => {
    if (empresa) {
      // Parse da primeira parte do endereço (logradouro, número/complemento e bairro)
      const primeiraParte = (empresa.endereco || '').trim();
      const partes = primeiraParte.split(',').map(p => p.trim()).filter(Boolean);
      const logradouroInicial = partes[0] || '';
      const numeroComplementoParte = partes[1] || '';

      // Detectar bairro: pode vir após vírgula(s) ou após " - " no logradouro
      let logradouroBase = logradouroInicial;
      let bairroParte = '';

      // Se houver partes extras após número, considerar como bairro
      if (partes.length > 2) {
        bairroParte = partes.slice(2).join(', ');
      } else {
        // Tentar extrair bairro do próprio logradouro com hífen
        const splitHifen = (logradouroInicial || '').split(' - ').map(p => p.trim());
        if (splitHifen.length > 1) {
          logradouroBase = splitHifen[0];
          bairroParte = splitHifen.slice(1).join(' - ');
        }
      }

      // Extrair número e complemento
      const numeroMatch = (numeroComplementoParte || '').match(/^(\d+)(.*)/);
      const numero = numeroMatch ? numeroMatch[1] : '';
      const complemento = numeroMatch ? numeroMatch[2].trim() : numeroComplementoParte;

      setFormData({
        nome: empresa.nome,
        cnpj: empresa.cnpj,
        email: empresa.email,
        telefone: empresa.telefone,
        logradouro: logradouroBase || '',
        numero: numero || '',
        complemento: complemento || '',
        bairro: bairroParte || '',
        cidade: empresa.cidade,
        estado: empresa.estado,
        cep: empresa.cep,
        responsavel: empresa.responsavel,
        emailResponsavel: empresa.emailResponsavel
      });
      
    }
  }, [empresa]);

  useEffect(() => {
    if (id) {
      // Buscar empresa na lista já carregada ou carregar se necessário
      const empresaEncontrada = empresas.find(emp => emp.id === id);
      if (!empresaEncontrada && empresas.length === 0) {
        fetchEmpresas();
      }
      loadUsuarios(id);
    }
  }, [id, empresas, fetchEmpresas]);

  const loadUsuarios = async (empresaId: string) => {
    try {
      const { data: usuarios, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', empresaId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUsuarios(usuarios || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários da empresa');
    }
  };

  useEffect(() => {
    // Mock data for estatisticas - pode ser substituído por dados reais futuramente
    setEstatisticas({
      recursosUsados: 75,
      clientesCadastrados: 150,
      multasProcessadas: 1250,
      receitaMensal: 15000
    });
  }, []);

  const handleSave = async () => {
    if (!empresa) return;
    
    try {
      // Monta o endereço completo a partir dos campos separados
      const primeiraParteEndereco = [
        formData.logradouro,
        formData.numero + (formData.complemento ? ` ${formData.complemento}` : '')
      ].filter(Boolean).join(', ');

      const enderecoComBairro = formData.bairro
        ? `${primeiraParteEndereco} - ${formData.bairro}`
        : primeiraParteEndereco;

      const updates = {
        nome: formData.nome,
        cnpj: formData.cnpj,
        email: formData.email,
        telefone: formData.telefone,
        endereco: enderecoComBairro,
        cidade: formData.cidade,
        estado: formData.estado,
        cep: formData.cep,
        responsavel: formData.responsavel,
        emailResponsavel: formData.emailResponsavel
      };

      await atualizarEmpresa(empresa.id, updates);
      setIsEditing(false);
      toast.success('Empresa atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar empresa');
    }
  };

  const handleStatusToggle = async () => {
    if (!empresa) return;
    
    try {
      if (empresa.status === 'ativa') {
        await suspenderEmpresa(empresa.id);
        toast.success('Empresa suspensa com sucesso!');
      } else {
        await reativarEmpresa(empresa.id);
        toast.success('Empresa reativada com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao alterar status da empresa');
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (usuario: Usuario) => {
    setEditingUser(usuario);
    setShowUserModal(true);
  };

  const handleSaveUser = async (userData: any) => {
    if (!empresa) return;
    
    try {
      if (editingUser) {
        // Atualizar usuário existente
        const { error } = await supabase
          .from('users')
          .update({
            nome: userData.nome,
            email: userData.email,
            role: userData.role,
            ativo: userData.ativo
          })
          .eq('id', editingUser.id);
        
        if (error) throw error;
        
        // Atualizar estado local
        setUsuarios(usuarios.map(user => 
          user.id === editingUser.id 
            ? { ...user, ...userData }
            : user
        ));
        
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário no sistema de autenticação primeiro
        const { data: authUser, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.senha,
          options: {
            data: {
              nome: userData.nome,
              role: userData.role,
              company_id: empresa.id
            }
          }
        });
        
        if (authError) {
          console.error('Erro ao criar usuário na autenticação:', authError);
          toast.error(`Erro na autenticação: ${authError.message}`);
          return;
        }
        
        // Criar customer no Asaas se for despachante
        let asaasCustomerId = null;
        if (userData.role === 'Despachante') {
          try {
            console.log('🏢 Criando customer no Asaas para despachante:', userData.nome);

            // Usar serviço Asaas com configuração e headers corretos
            const { asaasService } = await import('@/services/asaasService');
            await asaasService.reloadConfig();
            if (!asaasService.isConfigured()) {
              throw new Error('Integração Asaas não configurada');
            }

            const asaasCustomer = await asaasService.createCustomer({
              name: userData.nome,
              email: userData.email,
              cpfCnpj: empresa.cnpj, // Usar CNPJ da empresa
              mobilePhone: empresa.telefone,
              address: empresa.endereco,
              addressNumber: '0',
              complement: '',
              province: empresa.cidade,
              city: empresa.cidade,
              postalCode: (empresa.cep || '').replace(/\D/g, ''),
              externalReference: `despachante_${authUser.user?.id}`,
              notificationDisabled: false,
              additionalEmails: userData.email,
              municipalInscription: '',
              stateInscription: '',
              observations: `Despachante da empresa ${empresa.nome}`
            });

            asaasCustomerId = asaasCustomer?.id || null;
            console.log('✅ Customer criado no Asaas:', asaasCustomerId);
            if (asaasCustomerId) {
              toast.success('Customer criado no Asaas com sucesso!');
            } else {
              toast.warning('Não foi possível confirmar o Customer Asaas.');
            }
          } catch (error) {
            console.error('❌ Erro ao criar customer no Asaas:', error);
            toast.error('Aviso: Erro ao criar customer no Asaas, mas usuário será criado');
          }
        }
        
        // Mapear role da UI para role do banco (admin/user)
        const mapRoleToDb = (r: Usuario['role']): 'admin' | 'user' => {
          switch (r) {
            case 'ICETRAN':
              return 'admin';
            case 'Despachante':
            case 'Usuario/Cliente':
              return 'user';
            case 'Superadmin':
              return 'admin';
            default:
              return r === 'admin' ? 'admin' : 'user';
          }
        };

        // Criar/atualizar usuário na tabela customizada (evitar duplicidade)
        const { data: newUser, error } = await supabase
          .from('users')
          .upsert({
            id: authUser.user?.id!, // Usar o mesmo ID do auth.users
            company_id: empresa.id,
            nome: userData.nome,
            email: userData.email,
            role: mapRoleToDb(userData.role as Usuario['role']),
            ativo: userData.ativo ?? true,
            asaas_customer_id: asaasCustomerId // Salvar ID do customer do Asaas
          }, { onConflict: 'id' })
          .select()
          .single();
        
        if (error) {
          console.error('Erro ao criar usuário na tabela users:', error);
          // Se falhar, tentar remover o usuário da autenticação
          if (authUser.user?.id) {
            await supabase.auth.admin.deleteUser(authUser.user.id);
          }
          throw error;
        }
        
        // Adicionar ao estado local
        setUsuarios([...usuarios, {
          id: newUser.id,
          nome: newUser.nome,
          email: newUser.email,
          role: newUser.role,
          ativo: newUser.ativo,
          ultimo_login: null,
          created_at: newUser.created_at
        }]);
        
        toast.success('Usuário criado com sucesso! Um email de confirmação foi enviado.');
      }
      
      setShowUserModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast.error('Erro ao salvar usuário');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      setUsuarios(usuarios.filter(user => user.id !== userId));
      toast.success('Usuário excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const handleToggleUserStatus = async (userId: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ ativo })
        .eq('id', userId);
      
      if (error) throw error;
      
      setUsuarios(usuarios.map(user => 
        user.id === userId ? { ...user, ativo } : user
      ));
      
      toast.success(`Usuário ${ativo ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      toast.error('Erro ao alterar status do usuário');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Empresa não encontrada</h3>
        <p className="text-gray-500 mb-4">A empresa solicitada não foi encontrada.</p>
        <button
          onClick={() => navigate('/empresas')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Empresas
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'dados', label: 'Dados da Empresa', icon: Building2 },
    { id: 'usuarios', label: 'Usuários', icon: Users },
    { id: 'uso', label: 'Uso & Estatísticas', icon: BarChart3 },
    { id: 'subconta', label: 'Subconta Asaas', icon: Wallet },
    { id: 'configuracoes', label: 'Configurações', icon: Settings }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/empresas')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{empresa.nome}</h1>
            <p className="text-gray-500">CNPJ: {empresa.cnpj}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            empresa.status === 'ativa' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {empresa.status === 'ativa' ? 'Ativa' : 'Suspensa'}
          </span>
          
          <button
            onClick={handleStatusToggle}
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              empresa.status === 'ativa'
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {empresa.status === 'ativa' ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Suspender
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Reativar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'dados' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Informações da Empresa</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                {isEditing ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Empresa
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{empresa.nome}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CNPJ
                </label>
                <p className="text-gray-900">{empresa.cnpj}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{empresa.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{empresa.telefone}</p>
                )}
              </div>

              {/* Endereço formatado (somente visualização) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Logradouro</label>
                      <input
                        type="text"
                        value={formData.logradouro}
                        onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Número</label>
                      <input
                        type="text"
                        value={formData.numero}
                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Complemento</label>
                      <input
                        type="text"
                        value={formData.complemento}
                        onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
                      <input
                        type="text"
                        value={formData.bairro}
                        onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Logradouro</label>
                      <p className="text-gray-900">{formData.logradouro}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Número</label>
                      <p className="text-gray-900">{formData.numero}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Complemento</label>
                      <p className="text-gray-900">{formData.complemento || '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
                      <p className="text-gray-900">{formData.bairro}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* CEP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{empresa.cep}</p>
                )}
              </div>

              {/* Cidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{empresa.cidade}</p>
                )}
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{empresa.estado}</p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Usuários da Empresa</h2>
              <button 
                onClick={handleCreateUser}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Usuário
              </button>
            </div>

            <div className="space-y-4">
              {usuarios.map((usuario) => (
                <div key={usuario.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{usuario.nome}</h3>
                      <p className="text-sm text-gray-500">{usuario.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      usuario.role === 'Superadmin' ? 'bg-red-100 text-red-800' :
                      usuario.role === 'ICETRAN' ? 'bg-purple-100 text-purple-800' :
                      usuario.role === 'Despachante' ? 'bg-blue-100 text-blue-800' :
                      usuario.role === 'Usuario/Cliente' ? 'bg-green-100 text-green-800' :
                      // Compatibilidade com roles antigos durante transição
                      usuario.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      usuario.role === 'user' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {usuario.role === 'Superadmin' ? 'Superadmin' :
                       usuario.role === 'ICETRAN' ? 'ICETRAN' :
                       usuario.role === 'Despachante' ? 'Despachante' :
                       usuario.role === 'Usuario/Cliente' ? 'Cliente' :
                       // Compatibilidade com roles antigos
                       usuario.role === 'admin' ? 'ICETRAN' :
                       usuario.role === 'user' ? 'Despachante' :
                       usuario.role === 'viewer' ? 'Cliente' : 'Desconhecido'}
                    </span>
                    
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      usuario.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditUser(usuario)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Editar usuário"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      <button 
                        onClick={() => handleToggleUserStatus(usuario.id, !usuario.ativo)}
                        className={`p-1 text-gray-400 hover:${usuario.ativo ? 'text-yellow-600' : 'text-green-600'}`}
                        title={usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                      >
                        {usuario.ativo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteUser(usuario.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Excluir usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'uso' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Estatísticas de Uso</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Recursos Usados</p>
                    <p className="text-2xl font-bold text-blue-900">{estatisticas.recursosUsados}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Clientes</p>
                    <p className="text-2xl font-bold text-green-900">{estatisticas.clientesCadastrados}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Activity className="w-8 h-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-600">Multas Processadas</p>
                    <p className="text-2xl font-bold text-yellow-900">{estatisticas.multasProcessadas}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">Receita Mensal</p>
                    <p className="text-2xl font-bold text-purple-900">R$ {estatisticas.receitaMensal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subconta' && (
          <div className="p-6">
            <SubcontaAsaasTab companyId={empresa.id} />
          </div>
        )}

        {activeTab === 'configuracoes' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Configurações da Empresa</h2>
            
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Status da Empresa</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Controle o status de ativação da empresa no sistema.
                </p>
                <button
                  onClick={handleStatusToggle}
                  className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    empresa.status === 'ativa'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {empresa.status === 'ativa' ? 'Suspender Empresa' : 'Reativar Empresa'}
                </button>
              </div>
              
              <div className="border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-900 mb-2">Zona de Perigo</h3>
                <p className="text-sm text-red-600 mb-4">
                  Ações irreversíveis que afetam permanentemente a empresa.
                </p>
                <button className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Empresa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Usuário */}
      <UserModal 
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        usuario={editingUser}
      />
    </div>
  );
}

// Componente Modal de Usuário
interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: any) => void;
  usuario?: Usuario | null;
}

function UserModal({ isOpen, onClose, onSave, usuario }: UserModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    role: 'Usuario/Cliente' as 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente',
    ativo: true
  });
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  // Função para mapear roles antigos para novos
  const mapRoleToNew = (role: string): 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente' => {
    switch (role) {
      case 'Superadmin': return 'Superadmin';
      case 'ICETRAN': return 'ICETRAN';
      case 'Despachante': return 'Despachante';
      case 'Usuario/Cliente': return 'Usuario/Cliente';
      // Mapeamento de compatibilidade para roles antigos
      case 'admin': return 'ICETRAN';
      case 'user': return 'Despachante';
      case 'viewer': return 'Usuario/Cliente';
      default: return 'Usuario/Cliente';
    }
  };

  useEffect(() => {
    if (usuario) {
      setFormData({
        nome: usuario.nome,
        email: usuario.email,
        role: mapRoleToNew(usuario.role),
        ativo: usuario.ativo
      });
    } else {
      setFormData({
        nome: '',
        email: '',
        role: 'Usuario/Cliente',
        ativo: true
      });
    }
    setSenha('');
    setConfirmarSenha('');
  }, [usuario, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    if (!formData.email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }
    
    if (!usuario && !senha) {
      toast.error('Senha é obrigatória para novos usuários');
      return;
    }
    
    if (!usuario && senha !== confirmarSenha) {
      toast.error('Senhas não coincidem');
      return;
    }
    
    onSave({
      ...formData,
      ...(senha && { senha })
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {usuario ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome *
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome completo do usuário"
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
              placeholder="email@empresa.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Perfil *
            </label>
            <select
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Superadmin">Superadministrador</option>
              <option value="ICETRAN">ICETRAN</option>
              <option value="Despachante">Despachante</option>
              <option value="Usuario/Cliente">Usuário/Cliente</option>
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
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Senha do usuário"
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
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirme a senha"
                  minLength={6}
                />
              </div>
            </>
          )}
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="ativo" className="ml-2 text-sm text-gray-700">
              Usuário ativo
            </label>
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
              {usuario ? 'Atualizar' : 'Criar'} Usuário
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
