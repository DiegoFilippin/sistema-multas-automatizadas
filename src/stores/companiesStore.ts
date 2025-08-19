import { create } from 'zustand'
import { companiesService, type CompanyFilters, type CompanyStats, type PlanUsage } from '../services/companiesService'
import type { Database } from '../lib/supabase'

type CompanyMaster = Database['public']['Tables']['companies_master']['Row']
type CompanyMasterInsert = Database['public']['Tables']['companies_master']['Insert']
type Company = Database['public']['Tables']['companies']['Row']
type CompanyInsert = Database['public']['Tables']['companies']['Insert']
type Plan = Database['public']['Tables']['plans']['Row']
type PlanInsert = Database['public']['Tables']['plans']['Insert']

interface CompaniesState {
  masterCompanies: CompanyMaster[]
  companies: Company[]
  plans: Plan[]
  isLoading: boolean
  error: string | null
  
  // Master Company actions
  fetchMasterCompanies: () => Promise<void>
  addMasterCompany: (company: CompanyMasterInsert) => Promise<void>
  updateMasterCompany: (id: string, updates: Partial<CompanyMaster>) => Promise<void>
  deleteMasterCompany: (id: string) => Promise<void>
  
  // Company actions
  fetchCompanies: (filters?: CompanyFilters) => Promise<void>
  addCompany: (company: CompanyInsert) => Promise<void>
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>
  deleteCompany: (id: string) => Promise<void>
  toggleCompanyStatus: (id: string) => Promise<void>
  getCompanyStats: (masterCompanyId?: string) => Promise<CompanyStats>
  getPlanUsage: (companyId: string) => Promise<PlanUsage>
  
  // Plan actions
  fetchPlans: () => Promise<void>
  addPlan: (plan: PlanInsert) => Promise<void>
  updatePlan: (id: string, updates: Partial<Plan>) => Promise<void>
  deletePlan: (id: string) => Promise<void>
}

export const useCompaniesStore = create<CompaniesState>((set, get) => ({
  masterCompanies: [],
  companies: [],
  plans: [],
  isLoading: false,
  error: null,

  // Master Company methods
  fetchMasterCompanies: async () => {
    try {
      set({ isLoading: true, error: null })
      const masterCompanies = await companiesService.getMasterCompanies()
      set({ masterCompanies, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao buscar empresas master', isLoading: false })
    }
  },

  addMasterCompany: async (companyData) => {
    try {
      set({ isLoading: true, error: null })
      const newCompany = await companiesService.createMasterCompany(companyData)
      set(state => ({ 
        masterCompanies: [newCompany, ...state.masterCompanies], 
        isLoading: false 
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao criar empresa master', isLoading: false })
    }
  },

  updateMasterCompany: async (id, updates) => {
    try {
      set({ isLoading: true, error: null })
      const updatedCompany = await companiesService.updateMasterCompany(id, updates)
      set(state => ({
        masterCompanies: state.masterCompanies.map(company => 
          company.id === id ? updatedCompany : company
        ),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao atualizar empresa master', isLoading: false })
    }
  },

  deleteMasterCompany: async (id) => {
    try {
      set({ isLoading: true, error: null })
      await companiesService.deleteMasterCompany(id)
      set(state => ({
        masterCompanies: state.masterCompanies.filter(company => company.id !== id),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao deletar empresa master', isLoading: false })
    }
  },

  // Company methods
  fetchCompanies: async (filters) => {
    try {
      set({ isLoading: true, error: null })
      const companies = await companiesService.getCompanies(filters)
      set({ companies, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao buscar empresas', isLoading: false })
    }
  },

  addCompany: async (companyData) => {
    try {
      set({ isLoading: true, error: null })
      const newCompany = await companiesService.createCompany(companyData)
      set(state => ({ 
        companies: [newCompany, ...state.companies], 
        isLoading: false 
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao criar empresa', isLoading: false })
    }
  },

  updateCompany: async (id, updates) => {
    try {
      set({ isLoading: true, error: null })
      const updatedCompany = await companiesService.updateCompany(id, updates)
      set(state => ({
        companies: state.companies.map(company => 
          company.id === id ? updatedCompany : company
        ),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao atualizar empresa', isLoading: false })
    }
  },

  deleteCompany: async (id) => {
    try {
      set({ isLoading: true, error: null })
      await companiesService.deleteCompany(id)
      set(state => ({
        companies: state.companies.filter(company => company.id !== id),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao deletar empresa', isLoading: false })
    }
  },

  toggleCompanyStatus: async (id) => {
    try {
      set({ isLoading: true, error: null })
      const updatedCompany = await companiesService.toggleCompanyStatus(id)
      set(state => ({
        companies: state.companies.map(company => 
          company.id === id ? updatedCompany : company
        ),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao alterar status da empresa', isLoading: false })
    }
  },

  getCompanyStats: async (masterCompanyId) => {
    try {
      return await companiesService.getCompanyStats(masterCompanyId)
    } catch (error) {
      throw error
    }
  },

  getPlanUsage: async (companyId) => {
    try {
      return await companiesService.getPlanUsage(companyId)
    } catch (error) {
      throw error
    }
  },

  // Plan methods
  fetchPlans: async () => {
    try {
      set({ isLoading: true, error: null })
      const plans = await companiesService.getPlans()
      set({ plans, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao buscar planos', isLoading: false })
    }
  },

  addPlan: async (planData) => {
    try {
      set({ isLoading: true, error: null })
      const newPlan = await companiesService.createPlan(planData)
      set(state => ({ 
        plans: [newPlan, ...state.plans], 
        isLoading: false 
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao criar plano', isLoading: false })
    }
  },

  updatePlan: async (id, updates) => {
    try {
      set({ isLoading: true, error: null })
      const updatedPlan = await companiesService.updatePlan(id, updates)
      set(state => ({
        plans: state.plans.map(plan => 
          plan.id === id ? updatedPlan : plan
        ),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao atualizar plano', isLoading: false })
    }
  },

  deletePlan: async (id) => {
    try {
      set({ isLoading: true, error: null })
      await companiesService.deletePlan(id)
      set(state => ({
        plans: state.plans.filter(plan => plan.id !== id),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao deletar plano', isLoading: false })
    }
  },
}))

// Export types for use in components
export type { CompanyMaster, CompanyMasterInsert, Company, CompanyInsert, Plan, PlanInsert }