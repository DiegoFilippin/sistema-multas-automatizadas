import { createClient } from '@supabase/supabase-js'
import { createMockSupabaseClient } from './mockSupabase'

// Detect environment (browser vs Node)
const isNode = typeof process !== 'undefined' && !!(process.versions?.node)

// Resolve environment variables for URL and keys
const envSupabaseUrl = isNode
  ? (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
  : import.meta.env.VITE_SUPABASE_URL

const envAnonKey = isNode
  ? (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  : import.meta.env.VITE_SUPABASE_ANON_KEY

const envServiceKey = isNode
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  : undefined

const usingServiceKey = isNode && !!envServiceKey

// Check if we should use mock client
const shouldUseMock = (
  !envSupabaseUrl ||
  (!usingServiceKey && !envAnonKey) ||
  (envSupabaseUrl?.includes('your-supabase-project-url') || envSupabaseUrl?.includes('demo.supabase.co')) ||
  (!usingServiceKey && (envAnonKey?.includes('your-supabase-anon-key') || envAnonKey?.includes('demo-key-placeholder')))
)

if (shouldUseMock) {
  console.warn('⚠️  Supabase not configured properly. Using mock client for development.')
  console.warn('📝 To use real Supabase:')
  console.warn('   1. Set SUPABASE_URL and either SUPABASE_ANON_KEY (frontend) or SUPABASE_SERVICE_ROLE_KEY (backend) in .env')
  console.warn('   2. Update VITE_* variables for frontend builds when applicable')
  console.warn('   3. Run the SQL migrations provided in the setup')
}

// Create client (real or mock)
let supabaseClient: any

if (shouldUseMock) {
  supabaseClient = createMockSupabaseClient()
} else {
  try {
    new URL(envSupabaseUrl as string)
    const keyToUse = usingServiceKey ? (envServiceKey as string) : (envAnonKey as string)
    supabaseClient = createClient(envSupabaseUrl as string, keyToUse)
    console.log(`✅ Connected to Supabase (${usingServiceKey ? 'service role' : 'anon'})`)
  } catch (error) {
    console.error('❌ Invalid Supabase URL format:', envSupabaseUrl)
    console.warn('🎭 Falling back to mock client')
    supabaseClient = createMockSupabaseClient()
  }
}

export const supabase = supabaseClient
export const isSupabaseMock = shouldUseMock

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
          asaas_customer_id: string | null
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
          asaas_customer_id?: string | null
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
          asaas_customer_id?: string | null
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
          // Campos expandidos - Dados do equipamento
          numero_equipamento: string | null
          tipo_equipamento: string | null
          localizacao_equipamento: string | null
          velocidade_permitida: string | null
          velocidade_aferida: string | null
          // Campos expandidos - Dados do proprietário
          nome_proprietario: string | null
          cpf_cnpj_proprietario: string | null
          endereco_proprietario: string | null
          // Campos expandidos - Observações detalhadas
          observacoes_gerais: string | null
          observacoes_condutor: string | null
          observacoes_veiculo: string | null
          mensagem_senatran: string | null
          // Campos expandidos - Registro fotográfico
          transcricao_registro_fotografico: string | null
          motivo_nao_abordagem: string | null
          // Campos expandidos - Dados do equipamento e notificação
          dados_equipamento: string | null
          notificacao_autuacao: string | null
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
          // Campos expandidos - Dados do equipamento
          numero_equipamento?: string | null
          tipo_equipamento?: string | null
          localizacao_equipamento?: string | null
          velocidade_permitida?: string | null
          velocidade_aferida?: string | null
          // Campos expandidos - Dados do proprietário
          nome_proprietario?: string | null
          cpf_cnpj_proprietario?: string | null
          endereco_proprietario?: string | null
          // Campos expandidos - Observações detalhadas
          observacoes_gerais?: string | null
          observacoes_condutor?: string | null
          observacoes_veiculo?: string | null
          mensagem_senatran?: string | null
          // Campos expandidos - Registro fotográfico
          transcricao_registro_fotografico?: string | null
          motivo_nao_abordagem?: string | null
          // Campos expandidos - Dados do equipamento e notificação
          dados_equipamento?: string | null
          notificacao_autuacao?: string | null
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
          // Campos expandidos - Dados do equipamento
          numero_equipamento?: string | null
          tipo_equipamento?: string | null
          localizacao_equipamento?: string | null
          velocidade_permitida?: string | null
          velocidade_aferida?: string | null
          // Campos expandidos - Dados do proprietário
          nome_proprietario?: string | null
          cpf_cnpj_proprietario?: string | null
          endereco_proprietario?: string | null
          // Campos expandidos - Observações detalhadas
          observacoes_gerais?: string | null
          observacoes_condutor?: string | null
          observacoes_veiculo?: string | null
          mensagem_senatran?: string | null
          // Campos expandidos - Registro fotográfico
          transcricao_registro_fotografico?: string | null
          motivo_nao_abordagem?: string | null
          // Campos expandidos - Dados do equipamento e notificação
          dados_equipamento?: string | null
          notificacao_autuacao?: string | null
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
      chat_sessions: {
        Row: {
          id: string
          company_id: string
          user_id: string
          multa_id: string | null
          session_id: string
          webhook_url: string
          webhook_payload: any
          status: 'active' | 'completed' | 'error'
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          multa_id?: string | null
          session_id: string
          webhook_url: string
          webhook_payload: any
          status?: 'active' | 'completed' | 'error'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          multa_id?: string | null
          session_id?: string
          webhook_url?: string
          webhook_payload?: any
          status?: 'active' | 'completed' | 'error'
          updated_at?: string
          completed_at?: string | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          chat_session_id: string
          message_type: 'user' | 'assistant' | 'system'
          content: string
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_session_id: string
          message_type: 'user' | 'assistant' | 'system'
          content: string
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_session_id?: string
          message_type?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: any | null
        }
      }
      recursos_gerados: {
        Row: {
          id: string
          company_id: string
          user_id: string
          multa_id: string | null
          chat_session_id: string | null
          recurso_id: string | null
          titulo: string
          conteudo_recurso: string
          fundamentacao_legal: string | null
          argumentos_principais: string[] | null
          tipo_recurso: string
          status: 'gerado' | 'revisado' | 'aprovado' | 'protocolado' | 'rejeitado'
          metadata: any | null
          versao: number
          created_at: string
          updated_at: string
          approved_at: string | null
          approved_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          multa_id?: string | null
          chat_session_id?: string | null
          recurso_id?: string | null
          titulo: string
          conteudo_recurso: string
          fundamentacao_legal?: string | null
          argumentos_principais?: string[] | null
          tipo_recurso: string
          status?: 'gerado' | 'revisado' | 'aprovado' | 'protocolado' | 'rejeitado'
          metadata?: any | null
          versao?: number
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          multa_id?: string | null
          chat_session_id?: string | null
          recurso_id?: string | null
          titulo?: string
          conteudo_recurso?: string
          fundamentacao_legal?: string | null
          argumentos_principais?: string[] | null
          tipo_recurso?: string
          status?: 'gerado' | 'revisado' | 'aprovado' | 'protocolado' | 'rejeitado'
          metadata?: any | null
          versao?: number
          updated_at?: string
          approved_at?: string | null
          approved_by?: string | null
        }
      }
      recursos_gerados_versions: {
        Row: {
          id: string
          recurso_gerado_id: string
          versao: number
          conteudo_recurso: string
          fundamentacao_legal: string | null
          argumentos_principais: string[] | null
          alteracoes_realizadas: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          recurso_gerado_id: string
          versao: number
          conteudo_recurso: string
          fundamentacao_legal?: string | null
          argumentos_principais?: string[] | null
          alteracoes_realizadas?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          recurso_gerado_id?: string
          versao?: number
          conteudo_recurso?: string
          fundamentacao_legal?: string | null
          argumentos_principais?: string[] | null
          alteracoes_realizadas?: string | null
          created_by?: string
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