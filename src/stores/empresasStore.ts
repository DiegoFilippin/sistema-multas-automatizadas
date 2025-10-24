import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { parseEndereco } from '../lib/endereco';

export interface Plano {
  id: string;
  nome: string;
  preco: number;
  recursosInclusos: number;
  precoRecursoAdicional: number;
  maxClientes: number;
  features: string[];
  popular?: boolean;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  responsavel: string;
  emailResponsavel: string;
  planoId: string;
  status: 'ativa' | 'suspensa' | 'cancelada';
  dataAssinatura: string;
  dataVencimento: string;
  dataCriacao: string;
  totalClientes: number;
  receitaMensal: number;
  recursosUsados: number;
  clientesCadastrados: number;
  masterCompanyId?: string;
}

export interface EmpresasState {
  empresas: Empresa[];
  planos: Plano[];
  isLoading: boolean;
  
  // Actions
  fetchEmpresas: () => Promise<void>;
  fetchEmpresaById: (id: string) => Promise<void>;
  fetchPlanos: () => Promise<void>;
  criarEmpresa: (dados: {
    nome: string;
    cnpj: string;
    email: string;
    telefone?: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
    responsavel: string;
    emailResponsavel: string;
    planoId: string;
    status: 'ativa' | 'suspensa' | 'cancelada';
    dataAssinatura: string;
    dataVencimento: string;
    masterCompanyId?: string;
  }) => Promise<void>;
  atualizarEmpresa: (id: string, dados: Partial<Empresa>) => Promise<void>;
  suspenderEmpresa: (id: string) => Promise<void>;
  reativarEmpresa: (id: string) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  getEstatisticasGerais: () => {
    totalEmpresas: number;
    empresasAtivas: number;
    receitaMensal: number;
    recursosProcessados: number;
  };
}

// Mock data
const mockPlanos: Plano[] = [
  {
    id: 'plan_basic',
    nome: 'Básico',
    preco: 199,
    recursosInclusos: 10,
    precoRecursoAdicional: 25,
    maxClientes: 50,
    features: [
      '10 recursos inclusos',
      'Até 50 clientes',
      'Dashboard básico',
      'Suporte por email'
    ]
  },
  {
    id: 'plan_professional',
    nome: 'Profissional',
    preco: 399,
    recursosInclusos: 25,
    precoRecursoAdicional: 20,
    maxClientes: 150,
    features: [
      '25 recursos inclusos',
      'Até 150 clientes',
      'Dashboard avançado',
      'API básica',
      'Suporte prioritário'
    ],
    popular: true
  },
  {
    id: 'plan_enterprise',
    nome: 'Enterprise',
    preco: 799,
    recursosInclusos: 50,
    precoRecursoAdicional: 15,
    maxClientes: -1, // Ilimitado
    features: [
      '50 recursos inclusos',
      'Clientes ilimitados',
      'Dashboard completo',
      'API completa',
      'Suporte 24/7',
      'Relatórios personalizados'
    ]
  }
];

const mockEmpresas: Empresa[] = [
  {
    id: 'comp_1',
    nome: 'Despachante Silva & Associados',
    cnpj: '12.345.678/0001-90',
    email: 'contato@silvaassociados.com.br',
    telefone: '(11) 99999-9999',
    endereco: 'Rua das Flores, 123 - São Paulo/SP',
    planoId: 'plan_professional',
    status: 'ativa',
    dataAssinatura: '2024-01-01',
    dataVencimento: '2024-12-31',
    dataCriacao: '2024-01-01',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '01234-567',
    responsavel: 'João Silva',
    emailResponsavel: 'joao@silvaassociados.com.br',
    totalClientes: 87,
    receitaMensal: 2500.00,
    recursosUsados: 18,
    clientesCadastrados: 87,
    masterCompanyId: 'master_1'
  },
  {
    id: 'comp_2',
    nome: 'Auto Serviços Santos',
    cnpj: '98.765.432/0001-10',
    email: 'admin@autosantos.com.br',
    telefone: '(21) 88888-8888',
    endereco: 'Av. Atlântica, 456 - Rio de Janeiro/RJ',
    planoId: 'plan_basic',
    status: 'ativa',
    dataAssinatura: '2024-02-15',
    dataVencimento: '2025-02-14',
    dataCriacao: '2024-02-15',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    cep: '22070-900',
    responsavel: 'Maria Santos',
    emailResponsavel: 'maria@autosantos.com.br',
    totalClientes: 23,
    receitaMensal: 1200.00,
    recursosUsados: 7,
    clientesCadastrados: 23,
    masterCompanyId: 'master_1'
  },
  {
    id: 'comp_3',
    nome: 'Mega Despachante',
    cnpj: '11.222.333/0001-44',
    email: 'contato@megadespachante.com.br',
    telefone: '(31) 77777-7777',
    endereco: 'Rua da Liberdade, 789 - Belo Horizonte/MG',
    planoId: 'plan_enterprise',
    status: 'ativa',
    dataAssinatura: '2023-12-01',
    dataVencimento: '2024-11-30',
    dataCriacao: '2023-12-01',
    cidade: 'Belo Horizonte',
    estado: 'MG',
    cep: '30112-000',
    responsavel: 'Carlos Oliveira',
    emailResponsavel: 'carlos@megadespachante.com.br',
    totalClientes: 234,
    receitaMensal: 5800.00,
    recursosUsados: 42,
    clientesCadastrados: 234,
    masterCompanyId: 'master_1'
  }
];

export const useEmpresasStore = create<EmpresasState>((set, get) => ({
  empresas: [],
  planos: [],
  isLoading: false,

  fetchEmpresas: async () => {
    set({ isLoading: true });
    
    try {
      const { data: empresasDb, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar empresas:', error);
        throw new Error(`Erro ao carregar empresas: ${error.message}`);
      }
      
      const empresas: Empresa[] = (empresasDb || []).map(empresaDb => {
        const enderecoCompleto = (empresaDb.endereco || '').trim();
        const { endereco, cidade, estado, cep } = parseEndereco(enderecoCompleto);
        
        return {
          id: empresaDb.id,
          nome: empresaDb.nome,
          cnpj: empresaDb.cnpj,
          email: empresaDb.email,
          telefone: empresaDb.telefone || '',
          endereco,
          cidade,
          estado,
          cep,
          responsavel: '',
          emailResponsavel: '',
          planoId: 'plan_basic',
          status: empresaDb.status === 'ativo' ? 'ativa' : 'suspensa',
          dataAssinatura: empresaDb.data_inicio_assinatura?.split('T')[0] || new Date().toISOString().split('T')[0],
          dataVencimento: empresaDb.data_fim_assinatura?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dataCriacao: empresaDb.created_at,
          totalClientes: 0,
          receitaMensal: 0,
          recursosUsados: 0,
          clientesCadastrados: 0,
          masterCompanyId: empresaDb.master_company_id
        };
      });
      
      set({ empresas, isLoading: false });
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  fetchEmpresaById: async (id: string) => {
    try {
      const { data: empresaDb, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const enderecoCompleto = (empresaDb.endereco || '').trim();
      const { endereco, cidade, estado, cep } = parseEndereco(enderecoCompleto);

      const empresa: Empresa = {
        id: empresaDb.id,
        nome: empresaDb.nome,
        cnpj: empresaDb.cnpj,
        email: empresaDb.email,
        telefone: empresaDb.telefone || '',
        endereco,
        cidade,
        estado,
        cep,
        responsavel: '',
        emailResponsavel: '',
        planoId: 'plan_basic',
        status: empresaDb.status === 'ativo' ? 'ativa' : 'suspensa',
        dataAssinatura: empresaDb.data_inicio_assinatura?.split('T')[0] || new Date().toISOString().split('T')[0],
        dataVencimento: empresaDb.data_fim_assinatura?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dataCriacao: empresaDb.created_at,
        totalClientes: 0,
        receitaMensal: 0,
        recursosUsados: 0,
        clientesCadastrados: 0,
        masterCompanyId: empresaDb.master_company_id
      };

      // Atualiza no estado: substitui se já existir, ou adiciona
      set(state => {
        const exists = state.empresas.some(e => e.id === empresa.id);
        return {
          empresas: exists
            ? state.empresas.map(e => (e.id === empresa.id ? empresa : e))
            : [empresa, ...state.empresas],
        } as Partial<EmpresasState>;
      });
    } catch (error) {
      console.error('Erro ao buscar empresa por ID:', error);
      throw error;
    }
  },

  fetchPlanos: async () => {
    // Por enquanto, carrega os planos mockados
    set({ planos: mockPlanos });
  },

  // Criar empresa (stub mínimo)
  criarEmpresa: async (dados) => {
    try {
      set({ isLoading: true });
      const payload = {
        master_company_id: dados.masterCompanyId || 'master_1',
        plan_id: dados.planoId,
        nome: dados.nome,
        cnpj: dados.cnpj,
        email: dados.email,
        telefone: dados.telefone || null,
        endereco: `${dados.endereco}, ${dados.cidade} - ${dados.estado} ${dados.cep}`,
        status: dados.status === 'ativa' ? 'ativo' : 'inativo',
        data_inicio_assinatura: dados.dataAssinatura,
        data_fim_assinatura: dados.dataVencimento,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any;

      const { data, error } = await supabase
        .from('companies')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;

      const { endereco, cidade, estado, cep } = parseEndereco(data.endereco || '');
      const empresa: Empresa = {
        id: data.id,
        nome: data.nome,
        cnpj: data.cnpj,
        email: data.email,
        telefone: data.telefone || '',
        endereco,
        cidade: cidade || dados.cidade,
        estado: estado || dados.estado,
        cep: cep || dados.cep,
        responsavel: dados.responsavel,
        emailResponsavel: dados.emailResponsavel,
        planoId: dados.planoId,
        status: data.status === 'ativo' ? 'ativa' : 'suspensa',
        dataAssinatura: data.data_inicio_assinatura?.split('T')[0] || dados.dataAssinatura,
        dataVencimento: data.data_fim_assinatura?.split('T')[0] || dados.dataVencimento,
        dataCriacao: data.created_at,
        totalClientes: 0,
        receitaMensal: 0,
        recursosUsados: 0,
        clientesCadastrados: 0,
        masterCompanyId: data.master_company_id
      };

      set(state => ({ empresas: [empresa, ...state.empresas], isLoading: false }));
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  suspenderEmpresa: async (id: string) => {
    try {
      set({ isLoading: true });
      const { data, error } = await supabase
        .from('companies')
        .update({ status: 'suspenso', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;

      set(state => ({
        empresas: state.empresas.map(e => e.id === id ? { ...e, status: 'suspensa' } : e),
        isLoading: false
      }));
    } catch (error) {
      console.error('Erro ao suspender empresa:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  reativarEmpresa: async (id: string) => {
    try {
      set({ isLoading: true });
      const { data, error } = await supabase
        .from('companies')
        .update({ status: 'ativo', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;

      set(state => ({
        empresas: state.empresas.map(e => e.id === id ? { ...e, status: 'ativa' } : e),
        isLoading: false
      }));
    } catch (error) {
      console.error('Erro ao reativar empresa:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteCompany: async (id: string) => {
    try {
      set({ isLoading: true });
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);
      if (error) throw error;

      set(state => ({ empresas: state.empresas.filter(e => e.id !== id), isLoading: false }));
    } catch (error) {
      console.error('Erro ao deletar empresa:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getEstatisticasGerais: () => {
    const { empresas } = get();
    const totalEmpresas = empresas.length;
    const empresasAtivas = empresas.filter((e) => e.status === 'ativa').length;
    const receitaMensal = empresas.reduce((acc, e) => acc + (e.receitaMensal || 0), 0);
    const recursosProcessados = empresas.reduce((acc, e) => acc + (e.recursosUsados || 0), 0);

    return {
      totalEmpresas,
      empresasAtivas,
      receitaMensal,
      recursosProcessados,
    };
  },

  atualizarEmpresa: async (id: string, dados: Partial<Empresa>) => {
    try {
      set({ isLoading: true });

      const updatePayload: any = {};
      if (dados.nome !== undefined) updatePayload.nome = dados.nome;
      if (dados.cnpj !== undefined) updatePayload.cnpj = dados.cnpj;
      if (dados.email !== undefined) updatePayload.email = dados.email;
      if (dados.telefone !== undefined) updatePayload.telefone = dados.telefone;
      if (dados.endereco !== undefined) {
        // Monta endereco final incluindo cidade/estado/cep se informados
        const enderecoComCidade = [
          dados.endereco,
          dados.cidade
        ].filter(Boolean).join(', ');
        const cauda = [dados.estado, dados.cep].filter(Boolean).join(' ');
        const enderecoFinal = [
          enderecoComCidade,
          cauda
        ].filter(Boolean).join(' - ');
        updatePayload.endereco = enderecoFinal;
      }
      // Campos cidade/estado/cep são derivados do endereço e podem não existir na tabela
      // Portanto, não enviamos estes campos para evitar erro de coluna inexistente
      updatePayload.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('companies')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao atualizar empresa:', error);
        throw new Error(`Erro ao atualizar empresa: ${error.message}`);
      }

      const enderecoCompleto = (data.endereco || '').trim();
      const { endereco, cidade, estado, cep } = parseEndereco(enderecoCompleto);

      set(state => ({
        empresas: state.empresas.map(e => 
          e.id === id 
            ? {
                ...e,
                nome: data.nome,
                cnpj: data.cnpj,
                email: data.email,
                telefone: data.telefone || '',
                endereco,
                cidade: cidade || e.cidade,
                estado: estado || e.estado,
                cep: cep || e.cep,
                status: data.status === 'ativo' ? 'ativa' : 'suspensa',
                dataAssinatura: data.data_inicio_assinatura?.split('T')[0] || e.dataAssinatura,
                dataVencimento: data.data_fim_assinatura?.split('T')[0] || e.dataVencimento,
                dataCriacao: data.created_at || e.dataCriacao,
                masterCompanyId: data.master_company_id || e.masterCompanyId
              }
            : e
        ),
        isLoading: false
      }));
    } catch (err) {
      console.error('Erro ao atualizar empresa:', err);
      set({ isLoading: false });
      throw err;
    }
  },
}));