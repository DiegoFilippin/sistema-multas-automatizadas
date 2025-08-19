import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Client = Database['public']['Tables']['clients']['Row']
type ClientInsert = Database['public']['Tables']['clients']['Insert']
type ClientUpdate = Database['public']['Tables']['clients']['Update']
type Vehicle = Database['public']['Tables']['vehicles']['Row']
type VehicleInsert = Database['public']['Tables']['vehicles']['Insert']
type VehicleUpdate = Database['public']['Tables']['vehicles']['Update']

export interface ClientFilters {
  companyId?: string
  search?: string
  status?: 'ativo' | 'inativo'
  estado?: string
  cidade?: string
}

export interface VehicleFilters {
  clientId?: string
  companyId?: string
  placa?: string
  marca?: string
  modelo?: string
}

export interface ClientStats {
  total: number
  ativos: number
  inativos: number
  porEstado: { estado: string; count: number }[]
  crescimentoMensal: number
}

class ClientsService {
  async getClients(filters?: ClientFilters): Promise<Client[]> {
    let query = supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId)
    }

    if (filters?.search) {
      query = query.or(`nome.ilike.%${filters.search}%,email.ilike.%${filters.search}%,cpf_cnpj.ilike.%${filters.search}%`)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.estado) {
      query = query.eq('estado', filters.estado)
    }

    if (filters?.cidade) {
      query = query.eq('cidade', filters.cidade)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Erro ao buscar clientes: ${error.message}`)
    }

    return data || []
  }

  async getClientsWithStats(filters?: ClientFilters): Promise<(Client & { vehicles: Vehicle[]; multas_count: number; recursos_count: number; valor_economizado: number })[]> {
    let query = supabase
      .from('clients')
      .select(`
        *,
        vehicles!left(
          id,
          placa,
          modelo,
          marca,
          ano,
          cor,
          renavam,
          created_at
        ),
        multas!left(
          id,
          recursos!left(
            id
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId)
    }

    if (filters?.search) {
      query = query.or(`nome.ilike.%${filters.search}%,email.ilike.%${filters.search}%,cpf_cnpj.ilike.%${filters.search}%`)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.estado) {
      query = query.eq('estado', filters.estado)
    }

    if (filters?.cidade) {
      query = query.eq('cidade', filters.cidade)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Erro ao buscar clientes com estatísticas: ${error.message}`)
    }

    // Processar os dados para contar multas e recursos
    const clientsWithStats = (data || []).map(client => {
      const multasCount = Array.isArray(client.multas) ? client.multas.length : 0
      const vehicles = Array.isArray(client.vehicles) ? client.vehicles : []
      
      // Contar recursos através das multas
      let recursosCount = 0
      let valorEconomizado = 0
      
      if (Array.isArray(client.multas)) {
        client.multas.forEach((multa: any) => {
          if (Array.isArray(multa.recursos)) {
            recursosCount += multa.recursos.length
            // Como não temos valor_economizado na tabela recursos, definimos como 0
            valorEconomizado = 0
          }
        })
      }

      // Remover as propriedades de join para retornar apenas os dados do cliente
      const { multas, vehicles: vehiclesData, ...clientData } = client
      
      return {
        ...clientData,
        vehicles: vehicles,
        multas_count: multasCount,
        recursos_count: recursosCount,
        valor_economizado: valorEconomizado
      }
    })

    return clientsWithStats
  }

  async getClientById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Erro ao buscar cliente: ${error.message}`)
    }

    return data
  }

  async getClientWithDetails(id: string): Promise<(Client & { vehicles: Vehicle[]; multas_count: number; recursos_count: number; valor_economizado: number }) | null> {
    // Buscar cliente
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (clientError) {
      if (clientError.code === 'PGRST116') {
        return null
      }
      throw new Error(`Erro ao buscar cliente: ${clientError.message}`)
    }

    // Buscar veículos do cliente
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('client_id', id)

    if (vehiclesError) {
      throw new Error(`Erro ao buscar veículos: ${vehiclesError.message}`)
    }

    // Buscar multas e recursos do cliente
    const { data: multas, error: multasError } = await supabase
      .from('multas')
      .select(`
        id,
        recursos!left(
          id
        )
      `)
      .eq('client_id', id)

    if (multasError) {
      throw new Error(`Erro ao buscar multas: ${multasError.message}`)
    }

    // Contar multas e recursos
    const multasCount = Array.isArray(multas) ? multas.length : 0
    let recursosCount = 0
    
    if (Array.isArray(multas)) {
      multas.forEach((multa: any) => {
        if (Array.isArray(multa.recursos)) {
          recursosCount += multa.recursos.length
        }
      })
    }

    return {
      ...client,
      vehicles: vehicles || [],
      multas_count: multasCount,
      recursos_count: recursosCount,
      valor_economizado: 0 // Como não temos essa coluna na tabela recursos
    }
  }

  async createClient(clientData: ClientInsert): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar cliente: ${error.message}`)
    }

    return data
  }

  async updateClient(id: string, updates: ClientUpdate): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar cliente: ${error.message}`)
    }

    return data
  }

  async deleteClient(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Erro ao deletar cliente: ${error.message}`)
    }
  }

  async getClientStats(companyId: string): Promise<ClientStats> {
    // Total de clientes
    const { count: total, error: totalError } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    if (totalError) {
      throw new Error(`Erro ao buscar estatísticas: ${totalError.message}`)
    }

    // Clientes ativos
    const { count: ativos, error: ativosError } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'ativo')

    if (ativosError) {
      throw new Error(`Erro ao buscar clientes ativos: ${ativosError.message}`)
    }

    // Clientes por estado
    const { data: porEstadoData, error: estadoError } = await supabase
      .from('clients')
      .select('estado')
      .eq('company_id', companyId)
      .not('estado', 'is', null)

    if (estadoError) {
      throw new Error(`Erro ao buscar clientes por estado: ${estadoError.message}`)
    }

    const porEstado = porEstadoData?.reduce((acc: { estado: string; count: number }[], client) => {
      const existing = acc.find(item => item.estado === client.estado)
      if (existing) {
        existing.count++
      } else {
        acc.push({ estado: client.estado!, count: 1 })
      }
      return acc
    }, []) || []

    // Crescimento mensal (simulado - seria necessário dados históricos)
    const crescimentoMensal = Math.floor(Math.random() * 20) - 10 // -10% a +10%

    return {
      total: total || 0,
      ativos: ativos || 0,
      inativos: (total || 0) - (ativos || 0),
      porEstado,
      crescimentoMensal
    }
  }

  // Métodos para veículos
  async getVehicles(filters?: VehicleFilters): Promise<Vehicle[]> {
    let query = supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId)
    }

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId)
    }

    if (filters?.placa) {
      query = query.ilike('placa', `%${filters.placa}%`)
    }

    if (filters?.marca) {
      query = query.ilike('marca', `%${filters.marca}%`)
    }

    if (filters?.modelo) {
      query = query.ilike('modelo', `%${filters.modelo}%`)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Erro ao buscar veículos: ${error.message}`)
    }

    return data || []
  }

  async getVehicleById(id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Erro ao buscar veículo: ${error.message}`)
    }

    return data
  }

  async createVehicle(vehicleData: VehicleInsert): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicleData)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar veículo: ${error.message}`)
    }

    return data
  }

  async updateVehicle(id: string, updates: VehicleUpdate): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar veículo: ${error.message}`)
    }

    return data
  }

  async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Erro ao deletar veículo: ${error.message}`)
    }
  }

  async importClients(clients: ClientInsert[]): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .insert(clients)
      .select()

    if (error) {
      throw new Error(`Erro ao importar clientes: ${error.message}`)
    }

    return data || []
  }
}

export const clientsService = new ClientsService()
export type { Client, ClientInsert, ClientUpdate, Vehicle, VehicleInsert, VehicleUpdate }