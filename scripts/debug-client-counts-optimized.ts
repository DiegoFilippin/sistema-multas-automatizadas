/**
 * Script otimizado para debug de contagens de multas/recursos por cliente
 * 
 * Este script resolve o problema N+1 queries fazendo buscas em lote
 * e mantém compatibilidade com o comportamento original
 */

import { createClient } from '@supabase/supabase-js'
import { logger } from '../src/utils/logger.js'
import dotenv from 'dotenv'
import type { Database } from '../src/lib/supabase'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const companyId = process.env.COMPANY_ID || process.env.VITE_COMPANY_ID

if (!supabaseUrl) {
  logger.error('VITE_SUPABASE_URL não definido no .env')
  process.exit(1)
}

if (!supabaseAnonKey && !supabaseServiceKey) {
  logger.error('É necessário definir VITE_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY no .env')
  process.exit(1)
}

const usingServiceKey = !!supabaseServiceKey
const client = createClient(supabaseUrl, usingServiceKey ? (supabaseServiceKey as string) : (supabaseAnonKey as string))

// Tipos das tabelas
type ClientRow = Database['public']['Tables']['clients']['Row']

interface ClientStats {
  client_id: string
  cliente: string
  multas_count: number
  recursos_count: number
  company_id?: string
}

/**
 * Função otimizada para buscar estatísticas de múltiplos clientes de uma vez
 * Resolve o problema N+1 queries fazendo buscas em lote
 */
async function getClientsStatsOptimized(clientIds: string[], companyId?: string): Promise<Map<string, { multas: number; recursos: number }>> {
  const stats = new Map<string, { multas: number; recursos: number }>()
  
  // Inicializar mapa com zeros
  clientIds.forEach(id => stats.set(id, { multas: 0, recursos: 0 }))

  try {
    // Buscar todas as multas dos clientes de uma vez
    let multasQuery = client
      .from('multas')
      .select('id,client_id')
      .in('client_id', clientIds)

    if (companyId) {
      multasQuery = multasQuery.eq('company_id', companyId)
    }

    const { data: multasData, error: multasError } = await multasQuery

    if (multasError) {
      logger.error('Erro ao buscar multas em lote', multasError, { clientIds: clientIds.length })
      return stats
    }

    // Contar multas por cliente
    const multasCount = new Map<string, number>()
    multasData?.forEach(multa => {
      const count = multasCount.get(multa.client_id) || 0
      multasCount.set(multa.client_id, count + 1)
    })

    // Buscar todos os recursos dos clientes de uma vez
    if (multasData && multasData.length > 0) {
      const multaIds = multasData.map(m => m.id)
      
      let recursosQuery = client
        .from('recursos')
        .select('multa_id')
        .in('multa_id', multaIds)

      if (companyId) {
        recursosQuery = recursosQuery.eq('company_id', companyId)
      }

      const { data: recursosData, error: recursosError } = await recursosQuery

      if (recursosError) {
        logger.error('Erro ao buscar recursos em lote', recursosError, { multaIds: multaIds.length })
      } else {
        // Mapear recursos para clientes via multa_id
        const recursoToClient = new Map<string, string>()
        multasData.forEach(multa => {
          recursoToClient.set(multa.id, multa.client_id)
        })

        // Contar recursos por cliente
        const recursosCount = new Map<string, number>()
        recursosData?.forEach(recurso => {
          const clientId = recursoToClient.get(recurso.multa_id)
          if (clientId) {
            const count = recursosCount.get(clientId) || 0
            recursosCount.set(clientId, count + 1)
          }
        })

        // Combinar contagens
        clientIds.forEach(clientId => {
          stats.set(clientId, {
            multas: multasCount.get(clientId) || 0,
            recursos: recursosCount.get(clientId) || 0
          })
        })
      }
    }

    return stats
  } catch (error) {
    logger.error('Erro inesperado em getClientsStatsOptimized', error, { clientIds: clientIds.length })
    return stats
  }
}

/**
 * Função legada para comparar resultados (mantida para compatibilidade)
 * Será removida após validação da versão otimizada
 */
async function getClientStatsLegacy(clientId: string, clientName: string, companyId?: string): Promise<{ multas: number; recursos: number }> {
  try {
    // Buscar IDs e contagem de multas do cliente (método antigo N+1)
    const { data: multasData, count: multasCount, error: multasError } = await client
      .from('multas')
      .select('id', { count: 'exact' })
      .eq('client_id', clientId)

    if (multasError) {
      logger.error(`Erro ao buscar multas do cliente ${clientName} (${clientId}):`, multasError)
      return { multas: 0, recursos: 0 }
    }

    const multaIds = (multasData || []).map((m: { id: string }) => m.id)

    let recursosCount = 0
    if (multaIds.length > 0) {
      let recursosQuery = client
        .from('recursos')
        .select('id', { count: 'exact' })
        .in('multa_id', multaIds)

      if (companyId) {
        recursosQuery = recursosQuery.eq('company_id', companyId)
      }

      const { count: recursosCountResp, error: recursosError } = await recursosQuery

      if (recursosError) {
        logger.error(`Erro ao contar recursos do cliente ${clientName} (${clientId}):`, recursosError)
        recursosCount = 0
      } else {
        recursosCount = recursosCountResp ?? 0
      }
    }

    return {
      multas: multasCount ?? 0,
      recursos: recursosCount
    }
  } catch (error) {
    logger.error(`Erro inesperado no método legado para cliente ${clientName} (${clientId}):`, error)
    return { multas: 0, recursos: 0 }
  }
}

async function run() {
  logger.info('==============================')
  logger.info('Debug: Contagem de Multas/Recursos por Cliente (Supabase)')
  logger.info('URL:', supabaseUrl)
  logger.info('Auth:', usingServiceKey ? 'service_role' : 'anon')
  if (companyId) logger.info('Filtrando por company_id:', companyId)
  logger.info('==============================')

  const startTime = performance.now()
  let queries = 0

  // Buscar clientes
  let clientsQuery = client
    .from('clients')
    .select('*')
    .order('nome', { ascending: true })

  if (companyId) {
    clientsQuery = clientsQuery.eq('company_id', companyId)
  }

  queries++
  const { data: clients, error: clientsError } = await clientsQuery

  if (clientsError) {
    logger.error('Erro ao buscar clientes:', clientsError)
    process.exit(1)
  }

  const clientsList = (clients || []) as ClientRow[]

  if (clientsList.length === 0) {
    logger.warn('Nenhum cliente encontrado.')
    return
  }

  logger.info(`Encontrados ${clientsList.length} clientes`)

  // Buscar estatísticas otimizadas
  logger.info('Iniciando busca otimizada...')
  const clientIds = clientsList.map(c => c.id)
  queries++
  const optimizedStats = await getClientsStatsOptimized(clientIds, companyId)

  // Buscar recursos totais para verificar existência
  queries++
  const { count: totalRecursosCount, error: recursosTotalError } = await client
    .from('recursos')
    .select('id', { count: 'exact', head: true })

  if (recursosTotalError) {
    logger.warn('Aviso ao contar recursos totais:', recursosTotalError)
  }

  logger.info('Total de recursos no banco:', totalRecursosCount ?? 0)

  // Preparar resultados
  const resultados: ClientStats[] = clientsList.map(client => ({
    client_id: client.id,
    cliente: client.nome,
    multas_count: optimizedStats.get(client.id)?.multas || 0,
    recursos_count: optimizedStats.get(client.id)?.recursos || 0,
    company_id: client.company_id
  }))

  // Exibir resultados
  logger.info('\nResultados por cliente:')
  resultados.forEach(r => {
    logger.info(`- ${r.cliente} (${r.client_id}): multas=${r.multas_count}, recursos=${r.recursos_count}`)
  })

  // Estatísticas de performance
  const endTime = performance.now()
  const duration = endTime - startTime
  logger.performance('Script executado', duration, {
    totalClients: clientsList.length,
    totalMultas: resultados.reduce((sum, r) => sum + r.multas_count, 0),
    totalRecursos: resultados.reduce((sum, r) => sum + r.recursos_count, 0)
  })

  // Diagnóstico adicional: verificar se há recursos sem multa associada
  queries++
  const { data: recursosSemMulta, error: recursosSemMultaError } = await client
    .from('recursos')
    .select('id,multa_id')
    .is('multa_id', null)
    .limit(5)

  if (recursosSemMultaError) {
    logger.warn('Aviso ao buscar recursos com multa_id null:', recursosSemMultaError)
  } else if ((recursosSemMulta || []).length > 0) {
    logger.warn('Recursos com multa_id = null (primeiros 5):', recursosSemMulta)
  } else {
    logger.info('Nenhum recurso com multa_id = null encontrado.')
  }

  logger.info(`BENCH: queries=${queries} duration=${duration}`)
  logger.info('\nConcluído.')
}

// Executar com tratamento de erro
run().catch(error => {
  logger.error('Falha geral no script:', error)
  process.exit(1)
})