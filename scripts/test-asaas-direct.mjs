import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getApiKey() {
  const { data, error } = await supabase
    .from('asaas_config')
    .select('api_key_production, is_active')
    .eq('is_active', true)
    .single()
  if (error) throw new Error('Falha ao buscar asaas_config: ' + error.message)
  if (!data?.api_key_production) throw new Error('api_key_production ausente em asaas_config')
  return data.api_key_production
}

async function callAsaas(path, method = 'GET', body) {
  const apiKey = await getApiKey()
  const baseApi = 'https://api.asaas.com/v3'
  const url = `${baseApi}${path}`
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + apiKey,
    'access_token': apiKey,
  }
  const resp = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await resp.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: resp.status, json }
}

async function main() {
  console.log('GET /customers?limit=1 (Asaas direto):')
  const getRes = await callAsaas('/customers?limit=1')
  console.log(getRes)

  console.log('POST /customers (Asaas direto) com email diegofilippin@synsoft.com.br:')
  const createBody = {
    name: 'Teste Synsoft Direto',
    email: 'diegofilippin@synsoft.com.br',
    cpfCnpj: '11144477735',
  }
  const postRes = await callAsaas('/customers', 'POST', createBody)
  console.log(postRes)
}

main().catch(err => {
  console.error('Falha no teste direto:', err)
  process.exit(1)
})