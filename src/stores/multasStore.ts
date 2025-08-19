import { create } from 'zustand'
import { multasService, type MultaFilters, type MultaStats } from '../services/multasService'
import { recursosService, type RecursoFilters, type RecursoStats } from '../services/recursosService'
import type { Database } from '../lib/supabase'

type Multa = Database['public']['Tables']['multas']['Row']
type Recurso = Database['public']['Tables']['recursos']['Row']
type MultaInsert = Database['public']['Tables']['multas']['Insert']
type RecursoInsert = Database['public']['Tables']['recursos']['Insert']

interface MultasState {
  multas: Multa[]
  recursos: Recurso[]
  isLoading: boolean
  error: string | null
  
  // Multas actions
  fetchMultas: (filters?: MultaFilters) => Promise<void>
  addMulta: (multa: MultaInsert) => Promise<Multa>
  updateMulta: (id: string, updates: Partial<Multa>) => Promise<void>
  deleteMulta: (id: string) => Promise<void>
  getMultaStats: (companyId: string) => Promise<MultaStats>
  
  // Recursos actions
  fetchRecursos: (filters?: RecursoFilters) => Promise<void>
  addRecurso: (recurso: RecursoInsert) => Promise<Recurso>
  updateRecurso: (id: string, updates: Partial<Recurso>) => Promise<void>
  deleteRecurso: (id: string) => Promise<void>
  getRecursoStats: (companyId: string) => Promise<RecursoStats>
  
  // Estatísticas gerais
  getEstatisticas: () => {
    totalMultas: number
    multasPendentes: number
    multasProcessadas: number
    recursosAtivos: number
    taxaSucesso: number
  }
  criarRecurso: (multaId: string) => Promise<void>
}

export const useMultasStore = create<MultasState>((set, get) => ({
  multas: [],
  recursos: [],
  isLoading: false,
  error: null,

  fetchMultas: async (filters) => {
    try {
      set({ isLoading: true, error: null })
      const multas = await multasService.getMultas(filters)
      set({ multas, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao buscar multas', isLoading: false })
    }
  },

  addMulta: async (multaData) => {
    try {
      set({ isLoading: true, error: null })
      const newMulta = await multasService.createMulta(multaData)
      set(state => ({ 
        multas: [newMulta, ...state.multas], 
        isLoading: false 
      }))
      return newMulta
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar multa'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  updateMulta: async (id, updates) => {
    try {
      set({ isLoading: true, error: null })
      const updatedMulta = await multasService.updateMulta(id, updates)
      set(state => ({
        multas: state.multas.map(multa => 
          multa.id === id ? updatedMulta : multa
        ),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao atualizar multa', isLoading: false })
    }
  },

  deleteMulta: async (id) => {
    try {
      set({ isLoading: true, error: null })
      await multasService.deleteMulta(id)
      set(state => ({
        multas: state.multas.filter(multa => multa.id !== id),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao deletar multa', isLoading: false })
    }
  },

  getMultaStats: async (companyId) => {
    try {
      return await multasService.getMultaStats(companyId)
    } catch (error) {
      throw error
    }
  },

  fetchRecursos: async (filters) => {
    try {
      set({ isLoading: true, error: null })
      const recursos = await recursosService.getRecursos(filters)
      set({ recursos, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao buscar recursos', isLoading: false })
    }
  },

  addRecurso: async (recursoData) => {
    try {
      set({ isLoading: true, error: null })
      const newRecurso = await recursosService.createRecurso(recursoData)
      set(state => ({ 
        recursos: [newRecurso, ...state.recursos], 
        isLoading: false 
      }))
      return newRecurso
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar recurso'
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  updateRecurso: async (id, updates) => {
    try {
      set({ isLoading: true, error: null })
      const updatedRecurso = await recursosService.updateRecurso(id, updates)
      set(state => ({
        recursos: state.recursos.map(recurso => 
          recurso.id === id ? updatedRecurso : recurso
        ),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao atualizar recurso', isLoading: false })
    }
  },

  deleteRecurso: async (id) => {
    try {
      set({ isLoading: true, error: null })
      await recursosService.deleteRecurso(id)
      set(state => ({
        recursos: state.recursos.filter(recurso => recurso.id !== id),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao deletar recurso', isLoading: false })
    }
  },

  getRecursoStats: async (companyId) => {
    try {
      return await recursosService.getRecursoStats(companyId)
    } catch (error) {
      throw error
    }
  },

  getEstatisticas: () => {
    const state = get()
    const totalMultas = state.multas.length
    const multasPendentes = state.multas.filter(m => m.status === 'pendente').length
    const multasProcessadas = state.multas.filter(m => m.status === 'pago' || m.status === 'cancelado').length
    const recursosAtivos = state.recursos.filter(r => r.status === 'em_analise').length
    const recursosAprovados = state.recursos.filter(r => r.status === 'deferido').length
    const taxaSucesso = state.recursos.length > 0 ? (recursosAprovados / state.recursos.length) * 100 : 0

    return {
      totalMultas,
      multasPendentes,
      multasProcessadas,
      recursosAtivos,
      taxaSucesso: Math.round(taxaSucesso)
    }
  },

  criarRecurso: async (multaId) => {
    try {
      set({ isLoading: true, error: null })
      
      // Simular criação de recurso por IA
      const recursoData: RecursoInsert = {
        multa_id: multaId,
        company_id: get().multas.find(m => m.id === multaId)?.company_id || '',
        numero_processo: `REC-${Date.now()}`,
        data_protocolo: new Date().toISOString().split('T')[0],
        tipo_recurso: 'defesa_previa',
        status: 'em_analise',
        fundamentacao: 'Recurso gerado automaticamente pela IA com base na análise da infração.',
        documentos_anexos: []
      }
      
      const newRecurso = await recursosService.createRecurso(recursoData)
      set(state => ({ 
        recursos: [newRecurso, ...state.recursos], 
        isLoading: false 
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao criar recurso', isLoading: false })
      throw error
    }
  },
}))

// Export types for use in components
export type { Multa, Recurso, MultaInsert, RecursoInsert }