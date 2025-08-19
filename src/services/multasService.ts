import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Multa = Database['public']['Tables']['multas']['Row']
type MultaInsert = Database['public']['Tables']['multas']['Insert']
type MultaUpdate = Database['public']['Tables']['multas']['Update']

export interface MultaFilters {
  companyId?: string
  clientId?: string
  status?: string
  startDate?: string
  endDate?: string
  licensePlate?: string
  infractionType?: string
}

export interface MultaStats {
  total: number
  pending: number
  paid: number
  inAppeal: number
  totalValue: number
  paidValue: number
}

class MultasService {
  async getMultas(filters: MultaFilters = {}): Promise<Multa[]> {
    try {
      let query = supabase
        .from('multas')
        .select('*')
        .order('data_infracao', { ascending: false })

      if (filters.companyId) {
        query = query.eq('company_id', filters.companyId)
      }

      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.startDate) {
        query = query.gte('data_infracao', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('data_infracao', filters.endDate)
      }

      if (filters.licensePlate) {
        query = query.ilike('placa_veiculo', `%${filters.licensePlate}%`)
      }

      if (filters.infractionType) {
        query = query.ilike('descricao_infracao', `%${filters.infractionType}%`)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (error) {
      throw new Error(`Failed to fetch multas: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getMultaById(id: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('multas')
        .select(`
          *,
          client:clients(
            id,
            nome,
            cpf_cnpj,
            email,
            telefone,
            endereco
          ),
          recursos(
            id,
            numero_processo,
            tipo_recurso,
            data_protocolo,
            status,
            fundamentacao,
            observacoes,
            created_at
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to fetch multa: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async createMulta(multa: MultaInsert): Promise<Multa> {
    try {
      const { data, error } = await supabase
        .from('multas')
        .insert(multa)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to create multa: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updateMulta(id: string, updates: MultaUpdate): Promise<Multa> {
    try {
      const { data, error } = await supabase
        .from('multas')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to update multa: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteMulta(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('multas')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      throw new Error(`Failed to delete multa: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getMultaStats(companyId: string): Promise<MultaStats> {
    try {
      const { data, error } = await supabase
        .from('multas')
        .select('status, valor_final')
        .eq('company_id', companyId)

      if (error) {
        throw new Error(error.message)
      }

      const stats: MultaStats = {
        total: data.length,
        pending: 0,
        paid: 0,
        inAppeal: 0,
        totalValue: 0,
        paidValue: 0,
      }

      data.forEach(multa => {
        stats.totalValue += multa.valor_final

        switch (multa.status) {
          case 'pendente':
            stats.pending++
            break
          case 'pago':
            stats.paid++
            stats.paidValue += multa.valor_final
            break
          case 'em_recurso':
            stats.inAppeal++
            break
        }
      })

      return stats
    } catch (error) {
      throw new Error(`Failed to fetch multa stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getMultasByType(companyId: string): Promise<{ type: string; count: number; value: number }[]> {
    try {
      const { data, error } = await supabase
        .from('multas')
        .select('descricao_infracao, valor_final')
        .eq('company_id', companyId)

      if (error) {
        throw new Error(error.message)
      }

      const groupedData = data.reduce((acc, multa) => {
        const type = multa.descricao_infracao
        if (!acc[type]) {
          acc[type] = { count: 0, value: 0 }
        }
        acc[type].count++
        acc[type].value += multa.valor_final
        return acc
      }, {} as Record<string, { count: number; value: number }>)

      return Object.entries(groupedData).map(([type, typeData]) => ({
        type,
        count: (typeData as { count: number; value: number }).count,
        value: (typeData as { count: number; value: number }).value,
      }))
    } catch (error) {
      throw new Error(`Failed to fetch multas by type: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async importMultas(multas: MultaInsert[]): Promise<Multa[]> {
    try {
      const { data, error } = await supabase
        .from('multas')
        .insert(multas)
        .select()

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (error) {
      throw new Error(`Failed to import multas: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getMultasByLicensePlate(licensePlate: string, companyId: string): Promise<Multa[]> {
    try {
      const { data, error } = await supabase
        .from('multas')
        .select('*')
        .eq('company_id', companyId)
        .eq('placa_veiculo', licensePlate)
        .order('data_infracao', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (error) {
      throw new Error(`Failed to fetch multas by license plate: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updateMultaStatus(id: string, status: string, paymentDate?: string): Promise<Multa> {
    try {
      const updates: MultaUpdate = {
        status: status as any,
        updated_at: new Date().toISOString(),
      }

      if (paymentDate) {
        updates.data_pagamento = paymentDate
      }

      const { data, error } = await supabase
        .from('multas')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to update multa status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const multasService = new MultasService()