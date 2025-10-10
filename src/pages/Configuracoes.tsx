import { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Bell,
  Shield,
  CreditCard,
  Zap,
  Mail,
  Phone,
  MapPin,
  Building,
  Save,
  Eye,
  EyeOff,
  Key,
  Smartphone,
  Globe,
  Database,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Upload,
  Brain,
  BarChart3
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import AgenteJuridicoAdmin from '@/components/AgenteJuridicoAdmin';
import DashboardAgenteJuridico from '@/components/DashboardAgenteJuridico';

interface ConfigSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface NotificationSettings {
  emailMultas: boolean;
  emailRecursos: boolean;
  emailPagamentos: boolean;
  smsMultas: boolean;
  smsRecursos: boolean;
  whatsappNotificacoes: boolean;
  pushNotificacoes: boolean;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  loginAlerts: boolean;
  ipWhitelist: string[];
}

interface IntegrationSettings {
  detranAutoSync: boolean;
  detranStates: string[];
  dnitIntegration: boolean;
  emailProvider: string;
  smsProvider: string;
  whatsappProvider: string;
}

function TabButton({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
        active 
          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      )}
    >
      {children}
    </button>
  );
}

function SettingCard({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ enabled, onChange, label }: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

export default function Configuracoes() {
  const { user, updateProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('perfil');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Profile Settings
  const [profileData, setProfileData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    telefone: '',
    endereco: '',
    empresa: '',
    cnpj: ''
  });
  
  // Password Settings
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Notification Settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailMultas: true,
    emailRecursos: true,
    emailPagamentos: true,
    smsMultas: false,
    smsRecursos: true,
    whatsappNotificacoes: true,
    pushNotificacoes: true
  });
  
  // Security Settings
  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    loginAlerts: true,
    ipWhitelist: []
  });
  
  // Integration Settings
  const [integrations, setIntegrations] = useState<IntegrationSettings>({
    detranAutoSync: true,
    detranStates: ['SP', 'RJ', 'MG'],
    dnitIntegration: true,
    emailProvider: 'smtp',
    smsProvider: 'twilio',
    whatsappProvider: 'whatsapp-business'
  });

  const allConfigSections: ConfigSection[] = [
    {
      id: 'perfil',
      title: 'Perfil',
      icon: User,
      description: 'Informações pessoais e da empresa'
    },
    {
      id: 'notificacoes',
      title: 'Notificações',
      icon: Bell,
      description: 'Preferências de comunicação'
    },
    {
      id: 'seguranca',
      title: 'Segurança',
      icon: Shield,
      description: 'Configurações de segurança e acesso'
    },
    {
      id: 'integracoes',
      title: 'Integrações',
      icon: Zap,
      description: 'APIs e conexões externas'
    },
    {
      id: 'agente-juridico',
      title: 'Agente Jurídico',
      icon: Brain,
      description: 'Base de conhecimento e IA jurídica'
    },
    {
      id: 'metricas-ia',
      title: 'Métricas IA',
      icon: BarChart3,
      description: 'Dashboard e analytics do agente jurídico'
    },
    {
      id: 'plano',
      title: 'Plano & Cobrança',
      icon: CreditCard,
      description: 'Gerenciar assinatura e pagamentos'
    }
  ];

  // Filtrar seções baseado no tipo de usuário
  const configSections = allConfigSections.filter(section => {
    // Se o usuário for despachante, ocultar certas seções
    if (user?.role === 'Despachante') {
      const hiddenSections = ['integracoes', 'agente-juridico', 'metricas-ia', 'plano'];
      return !hiddenSections.includes(section.id);
    }
    // Mostrar todas as seções apenas para superadmin
    if (user?.role === 'Superadmin') {
      return true;
    }
    // Para outros tipos de usuário (ICETRAN, Usuario/Cliente), ocultar seções administrativas
    const adminSections = ['integracoes', 'agente-juridico', 'metricas-ia', 'plano'];
    return !adminSections.includes(section.id);
  });

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateProfile({
        ...user!,
        nome: profileData.nome,
        email: profileData.email
      });
      
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    
    setIsLoading(true);
    try {
      // Simular mudança de senha
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success('Senha alterada com sucesso!');
    } catch (error) {
      toast.error('Erro ao alterar senha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable2FA = () => {
    setSecurity({ ...security, twoFactorEnabled: !security.twoFactorEnabled });
    toast.success(
      security.twoFactorEnabled 
        ? 'Autenticação de dois fatores desabilitada' 
        : 'Autenticação de dois fatores habilitada'
    );
  };

  const handleExportData = () => {
    toast.success('Dados exportados com sucesso!');
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,.xlsx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            // Simular processamento do arquivo
            toast.success(`Arquivo ${file.name} importado com sucesso!`);
          } catch (error) {
            toast.error('Erro ao processar o arquivo. Verifique o formato.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <SettingCard
        title="Informações Pessoais"
        description="Atualize suas informações básicas"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={profileData.nome}
              onChange={(e) => setProfileData({ ...profileData, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <input
              type="tel"
              value={profileData.telefone}
              onChange={(e) => setProfileData({ ...profileData, telefone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(11) 99999-9999"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Empresa
            </label>
            <input
              type="text"
              value={profileData.empresa}
              onChange={(e) => setProfileData({ ...profileData, empresa: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome da empresa"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Endereço
          </label>
          <textarea
            value={profileData.endereco}
            onChange={(e) => setProfileData({ ...profileData, endereco: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Endereço completo"
          />
        </div>
        
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveProfile}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </SettingCard>
      
      <SettingCard
        title="Alterar Senha"
        description="Mantenha sua conta segura com uma senha forte"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha Atual
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleChangePassword}
              disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Key className="w-4 h-4" />
              <span>{isLoading ? 'Alterando...' : 'Alterar Senha'}</span>
            </button>
          </div>
        </div>
      </SettingCard>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <SettingCard
        title="Notificações por Email"
        description="Configure quando receber emails"
      >
        <div className="space-y-1">
          <Toggle
            enabled={notifications.emailMultas}
            onChange={(enabled) => setNotifications({ ...notifications, emailMultas: enabled })}
            label="Novas multas detectadas"
          />
          <Toggle
            enabled={notifications.emailRecursos}
            onChange={(enabled) => setNotifications({ ...notifications, emailRecursos: enabled })}
            label="Atualizações de recursos"
          />
          <Toggle
            enabled={notifications.emailPagamentos}
            onChange={(enabled) => setNotifications({ ...notifications, emailPagamentos: enabled })}
            label="Lembretes de pagamento"
          />
        </div>
      </SettingCard>
      
      <SettingCard
        title="Notificações por SMS"
        description="Receba alertas importantes no seu celular"
      >
        <div className="space-y-1">
          <Toggle
            enabled={notifications.smsMultas}
            onChange={(enabled) => setNotifications({ ...notifications, smsMultas: enabled })}
            label="Multas urgentes"
          />
          <Toggle
            enabled={notifications.smsRecursos}
            onChange={(enabled) => setNotifications({ ...notifications, smsRecursos: enabled })}
            label="Recursos deferidos/indeferidos"
          />
        </div>
      </SettingCard>
      
      <SettingCard
        title="Outras Notificações"
        description="WhatsApp e notificações push"
      >
        <div className="space-y-1">
          <Toggle
            enabled={notifications.whatsappNotificacoes}
            onChange={(enabled) => setNotifications({ ...notifications, whatsappNotificacoes: enabled })}
            label="WhatsApp Business"
          />
          <Toggle
            enabled={notifications.pushNotificacoes}
            onChange={(enabled) => setNotifications({ ...notifications, pushNotificacoes: enabled })}
            label="Notificações push no navegador"
          />
        </div>
      </SettingCard>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <SettingCard
        title="Autenticação de Dois Fatores"
        description="Adicione uma camada extra de segurança à sua conta"
      >
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              security.twoFactorEnabled ? 'bg-green-100' : 'bg-gray-100'
            )}>
              <Smartphone className={cn(
                'w-5 h-5',
                security.twoFactorEnabled ? 'text-green-600' : 'text-gray-600'
              )} />
            </div>
            <div>
              <p className="font-medium text-gray-900">2FA via SMS/App</p>
              <p className="text-sm text-gray-600">
                {security.twoFactorEnabled ? 'Ativado' : 'Desativado'}
              </p>
            </div>
          </div>
          <button
            onClick={handleEnable2FA}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              security.twoFactorEnabled
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            )}
          >
            {security.twoFactorEnabled ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </SettingCard>
      
      <SettingCard
        title="Configurações de Sessão"
        description="Controle o tempo de sessão e alertas de login"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeout da Sessão (minutos)
            </label>
            <select
              value={security.sessionTimeout}
              onChange={(e) => setSecurity({ ...security, sessionTimeout: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
              <option value={480}>8 horas</option>
            </select>
          </div>
          
          <Toggle
            enabled={security.loginAlerts}
            onChange={(enabled) => setSecurity({ ...security, loginAlerts: enabled })}
            label="Alertas de login suspeito"
          />
        </div>
      </SettingCard>
      
      <SettingCard
        title="Backup e Exportação"
        description="Faça backup dos seus dados"
      >
        <div className="flex space-x-4">
          <button
            onClick={handleExportData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Dados</span>
          </button>
          <button
            onClick={handleImportData}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Importar Dados</span>
          </button>
        </div>
      </SettingCard>
    </div>
  );

  const renderIntegrationsTab = () => (
    <div className="space-y-6">
      <SettingCard
        title="Integração DETRAN"
        description="Configure a sincronização automática com os DETRANs"
      >
        <div className="space-y-4">
          <Toggle
            enabled={integrations.detranAutoSync}
            onChange={(enabled) => setIntegrations({ ...integrations, detranAutoSync: enabled })}
            label="Sincronização automática"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estados Integrados
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'GO', 'DF'].map((estado) => (
                <label key={estado} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={integrations.detranStates.includes(estado)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIntegrations({
                          ...integrations,
                          detranStates: [...integrations.detranStates, estado]
                        });
                      } else {
                        setIntegrations({
                          ...integrations,
                          detranStates: integrations.detranStates.filter(s => s !== estado)
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{estado}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </SettingCard>
      
      <SettingCard
        title="Outras Integrações"
        description="Configure conexões com outros órgãos e serviços"
      >
        <div className="space-y-4">
          <Toggle
            enabled={integrations.dnitIntegration}
            onChange={(enabled) => setIntegrations({ ...integrations, dnitIntegration: enabled })}
            label="Integração DNIT (Infrações Federais)"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provedor de Email
              </label>
              <select
                value={integrations.emailProvider}
                onChange={(e) => setIntegrations({ ...integrations, emailProvider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="smtp">SMTP Personalizado</option>
                <option value="sendgrid">SendGrid</option>
                <option value="mailgun">Mailgun</option>
                <option value="ses">Amazon SES</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provedor de SMS
              </label>
              <select
                value={integrations.smsProvider}
                onChange={(e) => setIntegrations({ ...integrations, smsProvider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="twilio">Twilio</option>
                <option value="nexmo">Vonage (Nexmo)</option>
                <option value="zenvia">Zenvia</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Business
              </label>
              <select
                value={integrations.whatsappProvider}
                onChange={(e) => setIntegrations({ ...integrations, whatsappProvider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="whatsapp-business">WhatsApp Business API</option>
                <option value="twilio-whatsapp">Twilio WhatsApp</option>
                <option value="zenvia-whatsapp">Zenvia WhatsApp</option>
              </select>
            </div>
          </div>
        </div>
      </SettingCard>
    </div>
  );

  const renderPlanTab = () => (
    <div className="space-y-6">
      <SettingCard
        title="Plano Atual"
        description="Informações sobre sua assinatura"
      >
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Plano Profissional</h3>
              <p className="text-blue-700">25 recursos inclusos por mês</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900">R$ 399</p>
              <p className="text-sm text-blue-700">por mês</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-900">18</p>
              <p className="text-sm text-blue-700">Recursos usados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-900">7</p>
              <p className="text-sm text-blue-700">Recursos restantes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-900">120</p>
              <p className="text-sm text-blue-700">Clientes ativos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-900">15</p>
              <p className="text-sm text-blue-700">Dias restantes</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Fazer Upgrade
            </button>
            <button className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100">
              Ver Histórico
            </button>
          </div>
        </div>
      </SettingCard>
      
      <SettingCard
        title="Métodos de Pagamento"
        description="Gerencie suas formas de pagamento"
      >
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-8 h-8 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">•••• •••• •••• 1234</p>
                <p className="text-sm text-gray-600">Visa - Expira 12/25</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              Principal
            </span>
          </div>
          
          <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors">
            + Adicionar Método de Pagamento
          </button>
        </div>
      </SettingCard>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600 mt-1">Gerencie suas preferências e configurações da conta</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {configSections.map((section) => {
            const Icon = section.icon;
            return (
              <TabButton
                key={section.id}
                active={activeTab === section.id}
                onClick={() => setActiveTab(section.id)}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span>{section.title}</span>
                </div>
              </TabButton>
            );
          })}
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          {activeTab === 'perfil' && renderProfileTab()}
          {activeTab === 'notificacoes' && renderNotificationsTab()}
          {activeTab === 'seguranca' && renderSecurityTab()}
          {activeTab === 'integracoes' && renderIntegrationsTab()}
          {activeTab === 'agente-juridico' && <AgenteJuridicoAdmin />}
          {activeTab === 'metricas-ia' && <DashboardAgenteJuridico />}
          {activeTab === 'plano' && renderPlanTab()}
        </div>
      </div>
    </div>
  );
}