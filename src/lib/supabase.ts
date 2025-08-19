import { createClient } from '@supabase/supabase-js'
import { createMockSupabaseClient } from './mockSupabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if we should use mock client
const shouldUseMock = (
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('your-supabase-project-url') || 
  supabaseUrl.includes('demo.supabase.co') ||
  supabaseAnonKey.includes('your-supabase-anon-key') ||
  supabaseAnonKey.includes('demo-key-placeholder')
)

if (shouldUseMock) {
  console.warn('⚠️  Supabase not configured properly. Using mock client for development.')
  console.warn('📝 To use real Supabase:')
  console.warn('   1. Create a project at https://supabase.com')
  console.warn('   2. Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
  console.warn('   3. Run the SQL migrations provided in the setup')
}

// Create client (real or mock)
let supabaseClient: any

if (shouldUseMock) {
  supabaseClient = createMockSupabaseClient()
} else {
  try {
    new URL(supabaseUrl)
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    console.log('✅ Connected to Supabase')
  } catch (error) {
    console.error('❌ Invalid Supabase URL format:', supabaseUrl)
    console.warn('🎭 Falling back to mock client')
    supabaseClient = createMockSupabaseClient()
  }
}

export const supabase = supabaseClient

// Database types
export interface Database {
  public: {
    Tables: {
      companies_master: {
        Row: {
          id: string
          nome: string
          email: string
          telefone: string | null
          endereco: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          email: string
          telefone?: string | null
          endereco?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string
          telefone?: string | null
          endereco?: string | null
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          preco: number
          limite_empresas: number
          limite_usuarios_por_empresa: number
          limite_clientes: number
          limite_multas: number
          limite_recursos: number
          funcionalidades: string[]
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          preco: number
          limite_empresas: number
          limite_usuarios_por_empresa: number
          limite_clientes: number
          limite_multas: number
          limite_recursos: number
          funcionalidades: string[]
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          preco?: number
          limite_empresas?: number
          limite_usuarios_por_empresa?: number
          limite_clientes?: number
          limite_multas?: number
          limite_recursos?: number
          funcionalidades?: string[]
          ativo?: boolean
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          master_company_id: string
          plan_id: string
          nome: string
          cnpj: string
          email: string
          telefone: string | null
          endereco: string | null
          status: 'ativo' | 'inativo' | 'suspenso'
          data_inicio_assinatura: string
          data_fim_assinatura: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          master_company_id: string
          plan_id: string
          nome: string
          cnpj: string
          email: string
          telefone?: string | null
          endereco?: string | null
          status?: 'ativo' | 'inativo' | 'suspenso'
          data_inicio_assinatura: string
          data_fim_assinatura?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          master_company_id?: string
          plan_id?: string
          nome?: string
          cnpj?: string
          email?: string
          telefone?: string | null
          endereco?: string | null
          status?: 'ativo' | 'inativo' | 'suspenso'
          data_inicio_assinatura?: string
          data_fim_assinatura?: string | null
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          company_id: string
          email: string
          nome: string
          role: 'admin' | 'user' | 'viewer'
          ativo: boolean
          ultimo_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          email: string
          nome: string
          role?: 'admin' | 'user' | 'viewer'
          ativo?: boolean
          ultimo_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          email?: string
          nome?: string
          role?: 'admin' | 'user' | 'viewer'
          ativo?: boolean
          ultimo_login?: string | null
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          company_id: string
          nome: string
          cpf_cnpj: string
          email: string | null
          telefone: string | null
          endereco: string | null
          cidade: string | null
          estado: string | null
          cep: string | null
          status: 'ativo' | 'inativo'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          nome: string
          cpf_cnpj: string
          email?: string | null
          telefone?: string | null
          endereco?: string | null
          cidade?: string | null
          estado?: string | null
          cep?: string | null
          status?: 'ativo' | 'inativo'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          nome?: string
          cpf_cnpj?: string
          email?: string | null
          telefone?: string | null
          endereco?: string | null
          cidade?: string | null
          estado?: string | null
          cep?: string | null
          status?: 'ativo' | 'inativo'
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          client_id: string
          company_id: string
          placa: string
          marca: string | null
          modelo: string | null
          ano: number | null
          cor: string | null
          renavam: string | null
          chassi: string | null
          status: 'ativo' | 'inativo'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          company_id: string
          placa: string
          marca?: string | null
          modelo?: string | null
          ano?: number | null
          cor?: string | null
          renavam?: string | null
          chassi?: string | null
          status?: 'ativo' | 'inativo'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          company_id?: string
          placa?: string
          marca?: string | null
          modelo?: string | null
          ano?: number | null
          cor?: string | null
          renavam?: string | null
          chassi?: string | null
          status?: 'ativo' | 'inativo'
          updated_at?: string
        }
      }
      multas: {
        Row: {
          id: string
          company_id: string
          client_id: string
          vehicle_id: string | null
          numero_auto: string
          placa_veiculo: string
          data_infracao: string
          data_vencimento: string
          valor_original: number
          valor_desconto: number | null
          valor_final: number
          status: 'pendente' | 'pago' | 'cancelado' | 'em_recurso' | 'recurso_deferido' | 'recurso_indeferido'
          codigo_infracao: string
          local_infracao: string | null
          descricao_infracao: string | null
          data_pagamento: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          client_id: string
          vehicle_id?: string | null
          numero_auto: string
          placa_veiculo: string
          data_infracao: string
          data_vencimento: string
          valor_original: number
          valor_desconto?: number | null
          valor_final: number
          status?: 'pendente' | 'pago' | 'cancelado' | 'em_recurso' | 'recurso_deferido' | 'recurso_indeferido'
          codigo_infracao: string
          local_infracao?: string | null
          descricao_infracao?: string | null
          data_pagamento?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          client_id?: string
          vehicle_id?: string | null
          numero_auto?: string
          placa_veiculo?: string
          data_infracao?: string
          data_vencimento?: string
          valor_original?: number
          valor_desconto?: number | null
          valor_final?: number
          status?: 'pendente' | 'pago' | 'cancelado' | 'em_recurso' | 'recurso_deferido' | 'recurso_indeferido'
          codigo_infracao?: string
          local_infracao?: string | null
          descricao_infracao?: string | null
          data_pagamento?: string | null
          updated_at?: string
        }
      }
      recursos: {
        Row: {
          id: string
          company_id: string
          multa_id: string
          numero_processo: string | null
          tipo_recurso: string
          data_protocolo: string
          prazo_resposta: string | null
          status: 'protocolado' | 'em_analise' | 'deferido' | 'indeferido' | 'cancelado' | 'aguardando_pagamento'
          fundamentacao: string
          documentos_anexos: string[] | null
          resposta_orgao: string | null
          data_resposta: string | null
          observacoes: string | null
          geradoPorIA: boolean
          probabilidadeSucesso: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          multa_id: string
          numero_processo?: string | null
          tipo_recurso: string
          data_protocolo: string
          prazo_resposta?: string | null
          status?: 'protocolado' | 'em_analise' | 'deferido' | 'indeferido' | 'cancelado' | 'aguardando_pagamento'
          fundamentacao: string
          documentos_anexos?: string[] | null
          resposta_orgao?: string | null
          data_resposta?: string | null
          observacoes?: string | null
          geradoPorIA?: boolean
          probabilidadeSucesso?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          multa_id?: string
          numero_processo?: string | null
          tipo_recurso?: string
          data_protocolo?: string
          prazo_resposta?: string | null
          status?: 'protocolado' | 'em_analise' | 'deferido' | 'indeferido' | 'cancelado' | 'aguardando_pagamento'
          fundamentacao?: string
          documentos_anexos?: string[] | null
          resposta_orgao?: string | null
          data_resposta?: string | null
          observacoes?: string | null
          geradoPorIA?: boolean
          probabilidadeSucesso?: number
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper functions
export const getSupabaseClient = () => supabase

export const checkConnection = async () => {
  try {
    const { data, error } = await supabase.from('companies_master').select('count').limit(1)
    if (error) throw error
    return { success: true, message: 'Connected to Supabase successfully' }
  } catch (error) {
    return { success: false, message: `Connection failed: ${error}` }
  }
}