import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'
import { subaccountService } from './subaccountService'

type CompanyMaster = Database['public']['Tables']['companies_master']['Row']
type CompanyMasterInsert = Database['public']['Tables']['companies_master']['Insert']
type CompanyMasterUpdate = Database['public']['Tables']['companies_master']['Update']

type Company = Database['public']['Tables']['companies']['Row']
type CompanyInsert = Database['public']['Tables']['companies']['Insert']
type CompanyUpdate = Database['public']['Tables']['companies']['Update']

type Plan = Database['public']['Tables']['plans']['Row']
type PlanInsert = Database['public']['Tables']['plans']['Insert']
type PlanUpdate = Database['public']['Tables']['plans']['Update']

export interface CompanyFilters {
  masterCompanyId?: string
  search?: string
  status?: 'ativo' | 'inativo' | 'suspenso'
  planId?: string
}

export interface CompanyStats {
  total: number
  ativas: number
  inativas: number
  suspensas: number
  porPlano: { plano: string; count: number }[]
  crescimentoMensal: number
}

export interface PlanUsage {
  companyId: string
  multasUsadas: number
  recursosUsados: number
  clientesUsados: number
  limitesPlano: {
    multas: number
    recursos: number
    clientes: number
  }
}

class CompaniesService {
  // Validação para empresas ICETRAN
  async validateIcetranCompany(companyId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('company_type, status')
        .eq('id', companyId)
        .eq('company_type', 'icetran')
        .eq('status', 'ativo')
        .single()

      if (error) {
        console.error('Erro ao validar empresa ICETRAN:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('Erro ao validar empresa ICETRAN:', error)
      return false
    }
  }

  // Buscar apenas empresas ICETRAN ativas
  async getIcetranCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('company_type', 'icetran')
      .eq('status', 'ativo')
      .order('nome')

    if (error) {
      throw new Error(`Erro ao buscar empresas ICETRAN: ${error.message}`)
    }

    return data || []
  }

  // Métodos para Company Master
  async getMasterCompanies(): Promise<CompanyMaster[]> {
    const { data, error } = await supabase
      .from('companies_master')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erro ao buscar empresas master: ${error.message}`)
    }

    return data || []
  }

  async getMasterCompanyById(id: string): Promise<CompanyMaster | null> {
    const { data, error } = await supabase
      .from('companies_master')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Erro ao buscar empresa master: ${error.message}`)
    }

    return data
  }

  async createMasterCompany(companyData: CompanyMasterInsert): Promise<CompanyMaster> {
    const { data, error } = await supabase
      .from('companies_master')
      .insert(companyData)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar empresa master: ${error.message}`)
    }

    return data
  }

  async updateMasterCompany(id: string, updates: CompanyMasterUpdate): Promise<CompanyMaster> {
    const { data, error } = await supabase
      .from('companies_master')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar empresa master: ${error.message}`)
    }

    return data
  }

  async deleteMasterCompany(id: string): Promise<void> {
    const { error } = await supabase
      .from('companies_master')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Erro ao deletar empresa master: ${error.message}`)
    }
  }

  // Métodos para Companies
  async getCompanies(filters?: CompanyFilters): Promise<Company[]> {
    let query = supabase
      .from('companies')
      .select(`
        *,
        plans(*),
        companies_master(*)
      `)
      .order('created_at', { ascending: false })

    if (filters?.masterCompanyId) {
      query = query.eq('master_company_id', filters.masterCompanyId)
    }

    if (filters?.search) {
      query = query.or(`nome.ilike.%${filters.search}%,cnpj.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.planId) {
      query = query.eq('plan_id', filters.planId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Erro ao buscar empresas: ${error.message}`)
    }

    return data || []
  }

  async getCompanyById(id: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        plans(*),
        companies_master(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Erro ao buscar empresa: ${error.message}`)
    }

    return data
  }

  async createCompany(companyData: CompanyInsert): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .insert(companyData)
      .select(`
        *,
        plans(*),
        companies_master(*)
      `)
      .single()

    if (error) {
      throw new Error(`Erro ao criar empresa: ${error.message}`)
    }

    // Criar subconta no Asaas automaticamente (operação opcional)
    try {
      if (data.nome && data.email && data.cnpj) {
        console.log(`🏢 Criando subconta Asaas para empresa: ${data.nome}`);
        
        await subaccountService.createSubaccount(data.id, {
          name: data.nome,
          email: data.email,
          cpfCnpj: data.cnpj,
          birthDate: '1990-01-01', // Data padrão para empresas
          mobilePhone: data.telefone || undefined,
          address: data.endereco ? {
            postalCode: data.cep || '',
            address: data.endereco,
            addressNumber: data.numero || '0',
            province: data.bairro || '',
            city: data.cidade || '',
            state: data.estado || ''
          } : undefined
        });
        
        console.log(`✅ Subconta Asaas criada com sucesso para empresa: ${data.nome}`);
      } else {
        console.warn(`⚠️ Dados insuficientes para criar subconta Asaas para empresa ID: ${data.id}`);
      }
    } catch (subaccountError) {
      // Log do erro mas não falha a criação da empresa
      console.error(`❌ Erro ao criar subconta Asaas para empresa ${data.nome}:`, subaccountError);
      console.log(`ℹ️ Empresa criada com sucesso, mas subconta Asaas falhou. Pode ser criada manualmente depois.`);
    }

    return data
  }

  async updateCompany(id: string, updates: CompanyUpdate): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        plans(*),
        companies_master(*)
      `)
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar empresa: ${error.message}`)
    }

    return data
  }

  async deleteCompany(id: string): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Erro ao deletar empresa: ${error.message}`)
    }
  }

  async toggleCompanyStatus(id: string): Promise<Company> {
    const company = await this.getCompanyById(id)
    if (!company) {
      throw new Error('Empresa não encontrada')
    }

    const newStatus = company.status === 'ativo' ? 'inativo' : 'ativo'
    return this.updateCompany(id, { status: newStatus })
  }

  async getCompanyStats(masterCompanyId?: string): Promise<CompanyStats> {
    let query = supabase
      .from('companies')
      .select('status, plan_id, plans(nome)')

    if (masterCompanyId) {
      query = query.eq('master_company_id', masterCompanyId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`)
    }

    const companies = data || []
    const total = companies.length
    const ativas = companies.filter(c => c.status === 'ativo').length
    const inativas = companies.filter(c => c.status === 'inativo').length
    const suspensas = companies.filter(c => c.status === 'suspenso').length

    const porPlano = companies.reduce((acc: { plano: string; count: number }[], company) => {
      const planName = (company.plans as any)?.nome || 'Sem plano'
      const existing = acc.find(item => item.plano === planName)
      if (existing) {
        existing.count++
      } else {
        acc.push({ plano: planName, count: 1 })
      }
      return acc
    }, [])

    // Crescimento mensal (simulado - seria necessário dados históricos)
    const crescimentoMensal = Math.floor(Math.random() * 20) - 10 // -10% a +10%

    return {
      total,
      ativas,
      inativas,
      suspensas,
      porPlano,
      crescimentoMensal
    }
  }

  // Métodos para Plans
  async getPlans(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('preco', { ascending: true })

    if (error) {
      throw new Error(`Erro ao buscar planos: ${error.message}`)
    }

    return data || []
  }

  async getPlanById(id: string): Promise<Plan | null> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Erro ao buscar plano: ${error.message}`)
    }

    return data
  }

  async createPlan(planData: PlanInsert): Promise<Plan> {
    const { data, error } = await supabase
      .from('plans')
      .insert(planData)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar plano: ${error.message}`)
    }

    return data
  }

  async updatePlan(id: string, updates: PlanUpdate): Promise<Plan> {
    const { data, error } = await supabase
      .from('plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar plano: ${error.message}`)
    }

    return data
  }

  async deletePlan(id: string): Promise<void> {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Erro ao deletar plano: ${error.message}`)
    }
  }

  async getPlanUsage(companyId: string): Promise<PlanUsage> {
    // Buscar empresa e plano
    const company = await this.getCompanyById(companyId)
    if (!company) {
      throw new Error('Empresa não encontrada')
    }

    const plan = await this.getPlanById(company.plan_id)
    if (!plan) {
      throw new Error('Plano não encontrado')
    }

    // Contar recursos usados
    const [multasCount, recursosCount, clientesCount] = await Promise.all([
      supabase
        .from('multas')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      
      supabase
        .from('recursos')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      
      supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
    ])

    return {
      companyId,
      multasUsadas: multasCount.count || 0,
      recursosUsados: recursosCount.count || 0,
      clientesUsados: clientesCount.count || 0,
      limitesPlano: {
        multas: plan.limite_multas || 0,
        recursos: plan.limite_recursos || 0,
        clientes: plan.limite_clientes || 0
      }
    }
  }
}

export const companiesService = new CompaniesService()
export type { 
  CompanyMaster, 
  CompanyMasterInsert, 
  CompanyMasterUpdate,
  Company, 
  CompanyInsert, 
  CompanyUpdate,
  Plan, 
  PlanInsert, 
  PlanUpdate 
}