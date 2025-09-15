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
      if (user.role === 'Superadmin' || user.role === 'ICETRAN') {
        fetchEmpresas();
        fetchPlanos();
      } else if (user.role === 'Despachante') {
        fetchMultas();
      } else if (user.role === 'Usuario/Cliente') {
        fetchMultas({ clientId: user.id });
      }
      // Manter compatibilidade com roles antigos durante transição
      else if (user.role === 'admin') {
        fetchEmpresas();
        fetchPlanos();
      } else if (user.role === 'user') {
        fetchMultas();
      } else if (user.role === 'viewer') {
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
  const userRole = user.role as string;
  if (userRole === 'Superadmin' || userRole === 'ICETRAN' || userRole === 'admin') {
    return <DashboardMaster />;
  } else if (userRole === 'Despachante' || userRole === 'user') {
    return <DashboardDespachante />;
  } else if (userRole === 'Usuario/Cliente' || userRole === 'viewer') {
    return <DashboardCliente />;
  } else {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Tipo de usuário não reconhecido: {user.role}</p>
      </div>
    );
  }
}