import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Shield,
  Zap,

  Receipt,
  Building,
  PieChart,
  Package
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: ('Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente')[];
  badge?: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    roles: ['Superadmin', 'Despachante', 'Usuario/Cliente']
  },
  {
    id: 'dashboard-icetran',
    label: 'Dashboard ICETRAN',
    icon: Building,
    href: '/dashboard-icetran',
    roles: ['ICETRAN']
  },
  {
    id: 'meus-servicos',
    label: 'Meus Serviços',
    icon: Package,
    href: '/meus-servicos',
    roles: ['Despachante']
  },
  {
    id: 'empresas',
    label: 'Empresas',
    icon: Building2,
    href: '/empresas',
    roles: ['Superadmin', 'ICETRAN']
  },
  {
    id: 'usuarios',
    label: 'Usuários',
    icon: Users,
    href: '/usuarios',
    roles: ['Superadmin']
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: Shield,
    href: '/clientes',
    roles: ['Superadmin', 'ICETRAN', 'Despachante']
  },
  {
    id: 'cobrancas',
    label: 'Cobranças',
    icon: Receipt,
    href: '/cobrancas',
    roles: ['Superadmin', 'ICETRAN', 'Despachante']
  },
  {
    id: 'recursos',
    label: 'Recursos IA',
    icon: Zap,
    href: '/recursos',
    roles: ['Superadmin', 'ICETRAN', 'Despachante'],
    badge: 'IA'
  },
  {
    id: 'relatorios-financeiros',
    label: 'Relatórios Financeiros',
    icon: BarChart3,
    href: '/relatorios-financeiros',
    roles: ['Superadmin', 'ICETRAN', 'Despachante']
  },

  {
    id: 'servicos-splits',
    label: 'Serviços e Splits',
    icon: PieChart,
    href: '/servicos-splits',
    roles: ['Superadmin', 'ICETRAN']
  },

  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    href: '/configuracoes',
    roles: ['Superadmin', 'ICETRAN', 'Despachante', 'Usuario/Cliente']
  },
  {
    id: 'asaas-config',
    label: 'Configurações Asaas',
    icon: CreditCard,
    href: '/asaas-config',
    roles: ['Superadmin']
  },

  {
    id: 'admin-panel',
    label: 'Painel Administrativo',
    icon: Settings,
    href: '/subcontas-admin',
    roles: ['Superadmin'],
    badge: 'ADMIN'
  },
  
];

export default function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  type UiRole = 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente' | 'admin' | 'user' | 'viewer' | 'admin_master';
  const role = (user?.role ?? undefined) as UiRole | undefined;
  const effectiveRole: 'Superadmin' | 'ICETRAN' | 'Despachante' | 'Usuario/Cliente' | undefined = role ? (
    role === 'admin_master' ? 'Superadmin' :
    role === 'admin' ? 'ICETRAN' :
    role === 'user' ? 'Despachante' :
    role === 'viewer' ? 'Usuario/Cliente' :
    role
  ) : undefined;

  // Bypass temporário: se localStorage.setItem('sidebar_show_all','1'), mostra todos os itens
  const showAll = typeof window !== 'undefined' && localStorage.getItem('sidebar_show_all') === '1';

  const filteredMenuItems = (showAll ? menuItems : menuItems.filter(item => 
    !!effectiveRole && item.roles.includes(effectiveRole)
  ));

  useEffect(() => {
    try {
      const debug = {
        userRole: user?.role,
        effectiveRole,
        count: filteredMenuItems.length,
        items: filteredMenuItems.map(i => ({ id: i.id, label: i.label }))
      };
      // eslint-disable-next-line no-console
      console.log('[Sidebar Debug]', debug);
    } catch {
      // silêncio
    }
  }, [user?.role, effectiveRole, filteredMenuItems.length]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className={cn(
      'bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64',
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                <img 
                  src="/icetran-logo.png" 
                  alt="ICETRAN Logo" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <span className="font-bold text-xl text-gray-900">Icetran - Multas</span>
            </div>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img
              src={'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20business%20person&image_size=square'}
              alt={user.nome}
              className="w-10 h-10 rounded-full object-cover"
            />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.nome}
                </p>
                <p className="text-xs text-gray-500">
                  {user.role === 'Superadmin' || user.role === 'admin_master' ? 'Superadministrador' :
                   user.role === 'ICETRAN' ? 'ICETRAN' :
                   user.role === 'Despachante' ? 'Despachante' : 'Usuário/Cliente'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.id}
              to={item.href}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 flex-shrink-0',
                isActive ? 'text-blue-700' : 'text-gray-400'
              )} />
              
              {!isCollapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full',
            isCollapsed && 'justify-center'
          )}
        >
          <LogOut className="w-5 h-5 text-gray-400" />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
}