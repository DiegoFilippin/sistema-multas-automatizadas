import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
  fetchPlanos: () => Promise<void>;
  criarEmpresa: (dados: Omit<Empresa, 'id' | 'dataAssinatura' | 'recursosUsados' | 'clientesCadastrados'>) => Promise<void>;
  atualizarEmpresa: (id: string, dados: Partial<Empresa>) => Promise<void>;
  suspenderEmpresa: (id: string) => Promise<void>;
  reativarEmpresa: (id: string) => Promise<void>;
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
      // Buscar empresas do Supabase
      const { data: empresasDb, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar empresas:', error);
        throw new Error(`Erro ao carregar empresas: ${error.message}`);
      }
      
      // Converter dados do banco para o formato do store
      const empresas: Empresa[] = (empresasDb || []).map(empresaDb => {
        // Extrair informações do endereço
        const enderecoCompleto = empresaDb.endereco || '';
        const partesEndereco = enderecoCompleto.split(', ');
        
        return {
          id: empresaDb.id,
          nome: empresaDb.nome,
          cnpj: empresaDb.cnpj,
          email: empresaDb.email,
          telefone: empresaDb.telefone || '',
          endereco: partesEndereco[0] || '',
          cidade: partesEndereco[1] || '',
          estado: partesEndereco[2]?.split(' ')[0] || '',
          cep: partesEndereco[2]?.split(' ')[1] || '',
          responsavel: '', // Campo não está no banco, manter vazio
          emailResponsavel: '', // Campo não está no banco, manter vazio
          planoId: 'plan_basic', // Plano padrão
          status: empresaDb.status === 'ativo' ? 'ativa' : 'suspensa',
          dataAssinatura: empresaDb.data_inicio_assinatura?.split('T')[0] || new Date().toISOString().split('T')[0],
          dataVencimento: empresaDb.data_fim_assinatura?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dataCriacao: empresaDb.created_at,
          totalClientes: 0, // Calcular posteriormente se necessário
          receitaMensal: 0, // Calcular posteriormente se necessário
          recursosUsados: 0, // Calcular posteriormente se necessário
          clientesCadastrados: 0, // Calcular posteriormente se necessário
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

  fetchPlanos: async () => {
    set({ isLoading: true });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      set({ planos: mockPlanos, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  criarEmpresa: async (dados) => {
    set({ isLoading: true });
    
    try {
      // Buscar ou criar empresa master
      let masterCompanyId = '00000000-0000-0000-0000-000000000001'; // UUID padrão
      
      // Tentar buscar uma empresa master existente
      const { data: masterCompanies } = await supabase
        .from('companies_master')
        .select('id')
        .limit(1);
      
      if (masterCompanies && masterCompanies.length > 0) {
        masterCompanyId = masterCompanies[0].id;
      }
      
      // Preparar dados para o Supabase
      const empresaData = {
        nome: dados.nome,
        cnpj: dados.cnpj,
        email: dados.email,
        telefone: dados.telefone || null,
        endereco: `${dados.endereco || ''}, ${dados.cidade || ''}, ${dados.estado || ''} ${dados.cep || ''}`.trim(),
        master_company_id: masterCompanyId,
        status: 'ativo' as const,
        data_inicio_assinatura: new Date().toISOString()
      };
      
      // Inserir no Supabase
      const { data: novaEmpresaDb, error } = await supabase
        .from('companies')
        .insert([empresaData])
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar empresa:', error);
        throw new Error(`Erro ao salvar empresa: ${error.message}`);
      }
      
      // Converter dados do banco para o formato do store
      const novaEmpresa: Empresa = {
        id: novaEmpresaDb.id,
        nome: novaEmpresaDb.nome,
        cnpj: novaEmpresaDb.cnpj,
        email: novaEmpresaDb.email,
        telefone: novaEmpresaDb.telefone || '',
        endereco: dados.endereco || '',
        cidade: dados.cidade || '',
        estado: dados.estado || '',
        cep: dados.cep || '',
        responsavel: dados.responsavel || '',
        emailResponsavel: dados.emailResponsavel || '',
        planoId: 'plan_basic', // Plano padrão para todas as empresas
        status: novaEmpresaDb.status === 'ativo' ? 'ativa' : 'suspensa',
        dataAssinatura: novaEmpresaDb.data_inicio_assinatura.split('T')[0],
        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias
        dataCriacao: novaEmpresaDb.created_at,
        totalClientes: 0,
        receitaMensal: 0,
        recursosUsados: 0,
        clientesCadastrados: 0,
        masterCompanyId: novaEmpresaDb.master_company_id
      };
      
      // Atualizar estado local
      set(state => ({
        empresas: [...state.empresas, novaEmpresa],
        isLoading: false
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  atualizarEmpresa: async (id, dados) => {
    set({ isLoading: true });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      set(state => ({
        empresas: state.empresas.map(empresa => 
          empresa.id === id ? { ...empresa, ...dados } : empresa
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  suspenderEmpresa: async (id) => {
    await get().atualizarEmpresa(id, { status: 'suspensa' });
  },

  reativarEmpresa: async (id) => {
    await get().atualizarEmpresa(id, { status: 'ativa' });
  },

  getEstatisticasGerais: () => {
    const { empresas, planos } = get();
    
    const totalEmpresas = empresas.length;
    const empresasAtivas = empresas.filter(e => e.status === 'ativa').length;
    
    const receitaMensal = empresas
      .filter(e => e.status === 'ativa')
      .reduce((total, empresa) => {
        const plano = planos.find(p => p.id === empresa.planoId);
        if (!plano) return total;
        
        let receita = plano.preco;
        
        // Adicionar receita de recursos extras
        const recursosExtras = Math.max(0, empresa.recursosUsados - plano.recursosInclusos);
        receita += recursosExtras * plano.precoRecursoAdicional;
        
        return total + receita;
      }, 0);
    
    const recursosProcessados = empresas.reduce((total, empresa) => 
      total + empresa.recursosUsados, 0
    );
    
    return {
      totalEmpresas,
      empresasAtivas,
      receitaMensal,
      recursosProcessados
    };
  }
}));