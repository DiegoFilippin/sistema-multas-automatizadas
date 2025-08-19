import { create } from 'zustand'
import { clientsService, type ClientFilters, type ClientStats, type VehicleFilters } from '../services/clientsService'
import type { Database } from '../lib/supabase'

type Client = Database['public']['Tables']['clients']['Row']
type ClientInsert = Database['public']['Tables']['clients']['Insert']
type Vehicle = Database['public']['Tables']['vehicles']['Row']
type VehicleInsert = Database['public']['Tables']['vehicles']['Insert']

interface ClientsState {
  clients: Client[]
  vehicles: Vehicle[]
  isLoading: boolean
  error: string | null
  
  // Client actions
  fetchClients: (filters?: ClientFilters) => Promise<void>
  addClient: (client: ClientInsert) => Promise<void>
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  getClientStats: (companyId: string) => Promise<ClientStats>
  importClients: (clients: ClientInsert[]) => Promise<void>
  
  // Vehicle actions
  fetchVehicles: (filters?: VehicleFilters) => Promise<void>
  addVehicle: (vehicle: VehicleInsert) => Promise<void>
  updateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<void>
  deleteVehicle: (id: string) => Promise<void>
  getVehiclesByClient: (clientId: string) => Promise<Vehicle[]>
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  vehicles: [],
  isLoading: false,
  error: null,

  fetchClients: async (filters) => {
    try {
      set({ isLoading: true, error: null })
      const clients = await clientsService.getClients(filters)
      set({ clients, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao buscar clientes', isLoading: false })
    }
  },

  addClient: async (clientData) => {
    try {
      set({ isLoading: true, error: null })
      const newClient = await clientsService.createClient(clientData)
      set(state => ({ 
        clients: [newClient, ...state.clients], 
        isLoading: false 
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao criar cliente', isLoading: false })
    }
  },

  updateClient: async (id, updates) => {
    try {
      set({ isLoading: true, error: null })
      const updatedClient = await clientsService.updateClient(id, updates)
      set(state => ({
        clients: state.clients.map(client => 
          client.id === id ? updatedClient : client
        ),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao atualizar cliente', isLoading: false })
    }
  },

  deleteClient: async (id) => {
    try {
      set({ isLoading: true, error: null })
      await clientsService.deleteClient(id)
      set(state => ({
        clients: state.clients.filter(client => client.id !== id),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao deletar cliente', isLoading: false })
    }
  },

  getClientStats: async (companyId) => {
    try {
      return await clientsService.getClientStats(companyId)
    } catch (error) {
      throw error
    }
  },

  importClients: async (clients) => {
    try {
      set({ isLoading: true, error: null })
      const importedClients = await clientsService.importClients(clients)
      set(state => ({
        clients: [...importedClients, ...state.clients],
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao importar clientes', isLoading: false })
    }
  },

  fetchVehicles: async (filters) => {
    try {
      set({ isLoading: true, error: null })
      const vehicles = await clientsService.getVehicles(filters)
      set({ vehicles, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao buscar veículos', isLoading: false })
    }
  },

  addVehicle: async (vehicleData) => {
    try {
      set({ isLoading: true, error: null })
      const newVehicle = await clientsService.createVehicle(vehicleData)
      set(state => ({ 
        vehicles: [newVehicle, ...state.vehicles], 
        isLoading: false 
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao criar veículo', isLoading: false })
    }
  },

  updateVehicle: async (id, updates) => {
    try {
      set({ isLoading: true, error: null })
      const updatedVehicle = await clientsService.updateVehicle(id, updates)
      set(state => ({
        vehicles: state.vehicles.map(vehicle => 
          vehicle.id === id ? updatedVehicle : vehicle
        ),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao atualizar veículo', isLoading: false })
    }
  },

  deleteVehicle: async (id) => {
    try {
      set({ isLoading: true, error: null })
      await clientsService.deleteVehicle(id)
      set(state => ({
        vehicles: state.vehicles.filter(vehicle => vehicle.id !== id),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Erro ao deletar veículo', isLoading: false })
    }
  },

  getVehiclesByClient: async (clientId) => {
    try {
      return await clientsService.getVehicles({ clientId })
    } catch (error) {
      throw error
    }
  },
}))

// Export types for use in components
export type { Client, ClientInsert, Vehicle, VehicleInsert }