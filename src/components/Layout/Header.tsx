import { Bell, Search, Menu } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
  onMenuClick?: () => void;
}

export default function Header({ title, subtitle, className, onMenuClick }: HeaderProps) {
  const { user } = useAuthStore();

  return (
    <header className={cn(
      'bg-white border-b border-gray-200 px-6 py-4',
      className
    )}>
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          )}
          
          <div>
            {title && (
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
              </span>
            </button>
          </div>

          {/* User menu */}
          {user && (
            <div className="flex items-center space-x-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">{user.nome}</p>
                <p className="text-xs text-gray-500">
                  {user.role === 'Superadmin' ? 'Superadministrador' :
                   user.role === 'ICETRAN' ? 'ICETRAN' :
                   user.role === 'Despachante' ? 'Despachante' : 'Usuário/Cliente'}
                </p>
              </div>
              <img
                src={'https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20business%20person&image_size=square'}
                alt={user.nome}
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}