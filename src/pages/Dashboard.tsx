import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useMultasStore } from '@/stores/multasStore';
import { useEmpresasStore } from '@/stores/empresasStore';
import DashboardMaster from '@/components/Dashboard/DashboardMaster';
import DashboardDespachante from '@/components/Dashboard/DashboardDespachante';
import DashboardCliente from '@/components/Dashboard/DashboardCliente';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { fetchMultas } = useMultasStore();
  const { fetchEmpresas, fetchPlanos } = useEmpresasStore();

  useEffect(() => {
    if (user) {
      // Carregar dados baseado no tipo de usuário
      if (user.role === 'admin') { // 'admin' no banco = 'master' na interface
        fetchEmpresas();
        fetchPlanos();
      } else if (user.role === 'user') { // 'user' no banco = 'despachante' na interface
        fetchMultas();
      } else if (user.role === 'viewer') { // 'viewer' no banco = 'cliente' na interface
        fetchMultas({ clientId: user.id });
      }
    }
  }, [user, fetchMultas, fetchEmpresas, fetchPlanos]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Renderizar dashboard baseado no tipo de usuário
  switch (user.role) {
    case 'admin': // 'admin' no banco = 'master' na interface
      return <DashboardMaster />;
    case 'user': // 'user' no banco = 'despachante' na interface
      return <DashboardDespachante />;
    case 'viewer': // 'viewer' no banco = 'cliente' na interface
      return <DashboardCliente />;
    default:
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">Tipo de usuário não reconhecido.</p>
        </div>
      );
  }
}