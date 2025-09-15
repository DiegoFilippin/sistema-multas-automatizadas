import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

// Interface para configurações ICETRAN
interface IcetranConfig {
  id: string;
  company_id: string;
  user_id: string;
  service_id?: string;
  split_percentage: number;
  fixed_amount: number;
  is_active: boolean;
}

// Interface para permissões ICETRAN
interface IcetranPermissions {
  canViewRecursos: boolean;
  canViewFinancials: boolean;
  canViewClients: boolean;
  canViewReports: boolean;
  canManageServices: boolean;
  allowedCompanies: string[];
  allowedServices: string[];
}

// Hook para gerenciar permissões ICETRAN
export function useIcetranPermissions() {
  const { user } = useAuthStore();
  const [permissions, setPermissions] = useState<IcetranPermissions>({
    canViewRecursos: false,
    canViewFinancials: false,
    canViewClients: false,
    canViewReports: false,
    canManageServices: false,
    allowedCompanies: [],
    allowedServices: []
  });
  const [configs, setConfigs] = useState<IcetranConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'ICETRAN') {
      loadIcetranConfigs();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadIcetranConfigs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('icetran_configs')
        .select(`
          *,
          company:companies(id, name, status),
          service:services(id, name, is_active)
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;

      const icetranConfigs = data || [];
      setConfigs(icetranConfigs);

      // Calcular permissões baseadas nas configurações
      const calculatedPermissions = calculatePermissions(icetranConfigs);
      setPermissions(calculatedPermissions);

    } catch (error) {
      console.error('Erro ao carregar configurações ICETRAN:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePermissions = (configs: IcetranConfig[]): IcetranPermissions => {
    const activeConfigs = configs.filter(config => config.is_active);
    
    return {
      canViewRecursos: activeConfigs.length > 0,
      canViewFinancials: activeConfigs.length > 0,
      canViewClients: activeConfigs.length > 0,
      canViewReports: activeConfigs.length > 0,
      canManageServices: activeConfigs.length > 0,
      allowedCompanies: [...new Set(activeConfigs.map(config => config.company_id))],
      allowedServices: [...new Set(activeConfigs.map(config => config.service_id).filter(Boolean))]
    };
  };

  // Verificar se pode acessar um recurso específico
  const canAccessRecurso = (recursoCompanyId: string, serviceId?: string): boolean => {
    if (user?.role !== 'ICETRAN') return false;
    
    // Verificar se tem acesso à empresa
    const hasCompanyAccess = permissions.allowedCompanies.includes(recursoCompanyId);
    
    // Se não especificou serviço, só verifica empresa
    if (!serviceId) return hasCompanyAccess;
    
    // Verificar se tem acesso ao serviço específico
    const hasServiceAccess = permissions.allowedServices.includes(serviceId);
    
    return hasCompanyAccess && hasServiceAccess;
  };

  // Verificar se pode ver dados financeiros de uma empresa
  const canViewCompanyFinancials = (companyId: string): boolean => {
    if (user?.role !== 'ICETRAN') return false;
    return permissions.allowedCompanies.includes(companyId);
  };

  // Obter configuração específica para uma empresa/serviço
  const getConfigForService = (companyId: string, serviceId?: string): IcetranConfig | null => {
    return configs.find(config => 
      config.company_id === companyId && 
      (serviceId ? config.service_id === serviceId : !config.service_id)
    ) || null;
  };

  // Calcular valor do split para ICETRAN
  const calculateIcetranSplit = (totalValue: number, companyId: string, serviceId?: string): number => {
    const config = getConfigForService(companyId, serviceId);
    if (!config) return 0;

    // Se tem valor fixo, usa ele
    if (config.fixed_amount > 0) {
      return config.fixed_amount;
    }

    // Senão, calcula percentual
    return (totalValue * config.split_percentage) / 100;
  };

  // Verificar se é superadmin ou ICETRAN
  const isIcetranOrAdmin = (): boolean => {
    return user?.role === 'ICETRAN' || user?.role === 'Superadmin';
  };

  // Filtrar dados baseado nas permissões ICETRAN
  const filterDataByPermissions = <T extends { company_id?: string; service_id?: string }>(data: T[]): T[] => {
    if (user?.role !== 'ICETRAN') return data;
    
    return data.filter(item => {
      if (item.company_id && !permissions.allowedCompanies.includes(item.company_id)) {
        return false;
      }
      
      if (item.service_id && !permissions.allowedServices.includes(item.service_id)) {
        return false;
      }
      
      return true;
    });
  };

  return {
    permissions,
    configs,
    loading,
    canAccessRecurso,
    canViewCompanyFinancials,
    getConfigForService,
    calculateIcetranSplit,
    isIcetranOrAdmin,
    filterDataByPermissions,
    refreshConfigs: loadIcetranConfigs
  };
}

// Hook para verificar permissões gerais
export function usePermissions() {
  const { user } = useAuthStore();
  
  const isSuperadmin = (): boolean => {
    return user?.role === 'Superadmin';
  };
  
  const isIcetran = (): boolean => {
    return user?.role === 'ICETRAN';
  };
  
  const isDespachante = (): boolean => {
    return user?.role === 'Despachante';
  };
  
  const isCliente = (): boolean => {
    return user?.role === 'Usuario/Cliente';
  };
  
  const canManageUsers = (): boolean => {
    return isSuperadmin();
  };
  
  const canManageCompanies = (): boolean => {
    return isSuperadmin() || isIcetran();
  };
  
  const canViewFinancials = (): boolean => {
    return isSuperadmin() || isIcetran() || isDespachante();
  };
  
  const canManageServices = (): boolean => {
    return isSuperadmin() || isIcetran();
  };
  
  const canCreateRecursos = (): boolean => {
    return isSuperadmin() || isIcetran() || isDespachante();
  };
  
  const hasRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };
  
  return {
    user,
    isSuperadmin,
    isIcetran,
    isDespachante,
    isCliente,
    canManageUsers,
    canManageCompanies,
    canViewFinancials,
    canManageServices,
    canCreateRecursos,
    hasRole
  };
}