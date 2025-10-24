import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import type { Database } from '../src/lib/supabase'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const companyId = process.env.COMPANY_ID || process.env.VITE_COMPANY_ID

if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL não definido no .env')
  process.exit(1)
}

if (!supabaseAnonKey && !supabaseServiceKey) {
  console.error('É necessário definir VITE_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY no .env')
  process.exit(1)
}

const usingServiceKey = !!supabaseServiceKey
const client = createClient(supabaseUrl, usingServiceKey ? (supabaseServiceKey as string) : (supabaseAnonKey as string))

// Tipos das tabelas
type ClientRow = Database['public']['Tables']['clients']['Row']

async function run() {
  console.log('==============================')
  console.log('Debug: Contagem de Multas/Recursos por Cliente (Supabase)')
  console.log('URL:', supabaseUrl)
  console.log('Auth:', usingServiceKey ? 'service_role' : 'anon')
  if (companyId) console.log('Filtrando por company_id:', companyId)
  console.log('==============================')

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
    console.error('Erro ao buscar clientes:', clientsError.message)
    process.exit(1)
  }

  const clientsList = (clients || []) as ClientRow[]

  if (clientsList.length === 0) {
    console.log('Nenhum cliente encontrado.')
  }

  // Buscar recursos totais para verificar existência
  queries++
  const { count: totalRecursosCount, error: recursosTotalError } = await client
    .from('recursos')
    .select('id', { count: 'exact', head: true })

  if (recursosTotalError) {
    console.warn('Aviso ao contar recursos totais:', recursosTotalError.message)
  }

  console.log('Total de recursos no banco:', totalRecursosCount ?? 0)

  const resultados: Array<{
    client_id: string
    cliente: string
    multas_count: number
    recursos_count: number
  }> = []

  for (const c of clientsList) {
    // Buscar IDs e contagem de multas do cliente
    queries++
    const { data: multasData, count: multasCount, error: multasError } = await client
      .from('multas')
      .select('id', { count: 'exact' })
      .eq('client_id', c.id)

    if (multasError) {
      console.error(`Erro ao buscar multas do cliente ${c.nome} (${c.id}):`, multasError.message)
      resultados.push({ client_id: c.id, cliente: c.nome, multas_count: 0, recursos_count: 0 })
      continue
    }

    const multaIds = (multasData || []).map((m: { id: string }) => m.id)

    let recursosCount = 0
    if (multaIds.length > 0) {
      let recursosQuery = client
        .from('recursos')
        .select('id', { count: 'exact' })
        .in('multa_id', multaIds)
      // Otimização: garantir o mesmo company_id quando disponível
      if (c.company_id) {
        recursosQuery = recursosQuery.eq('company_id', c.company_id)
      }

      queries++
      const { count: recursosCountResp, error: recursosError } = await recursosQuery

      if (recursosError) {
        console.error(`Erro ao contar recursos do cliente ${c.nome} (${c.id}):`, recursosError.message)
        recursosCount = 0
      } else {
        recursosCount = recursosCountResp ?? 0
      }
    }

    resultados.push({
      client_id: c.id,
      cliente: c.nome,
      multas_count: multasCount ?? 0,
      recursos_count: recursosCount
    })
  }

  // Exibir resultados
  console.log('\nResultados por cliente:')
  for (const r of resultados) {
    console.log(`- ${r.cliente} (${r.client_id}): multas=${r.multas_count}, recursos=${r.recursos_count}`)
  }

  // Diagnóstico adicional: verificar se há recursos sem multa associada
  queries++
  const { data: recursosSemMulta, error: recursosSemMultaError } = await client
    .from('recursos')
    .select('id,multa_id')
    .is('multa_id', null)
    .limit(5)

  if (recursosSemMultaError) {
    console.warn('Aviso ao buscar recursos com multa_id null:', recursosSemMultaError.message)
  } else if ((recursosSemMulta || []).length > 0) {
    console.log('\nRecursos com multa_id = null (primeiros 5):', recursosSemMulta)
  } else {
    console.log('\nNenhum recurso com multa_id = null encontrado.')
  }

  const duration = performance.now() - startTime
  console.log(`\nConcluído.`)
  console.log(`BENCH: queries=${queries} duration=${duration}`)
}

run().catch(err => {
  console.error('Falha geral no script:', err)
  process.exit(1)
})