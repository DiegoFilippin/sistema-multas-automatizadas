import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

// Supabase credenciais (usando as mesmas do test-supabase.ts)
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getConfig() {
  const { data, error } = await supabase
    .from('asaas_config')
    .select('api_key_sandbox, api_key_production, environment, is_active')
    .eq('is_active', true)
    .single()

  if (error) throw new Error('Falha ao buscar asaas_config: ' + error.message)
  return data
}

async function callProxy(path, method = 'GET', body) {
  const cfg = await getConfig()
  const env = cfg?.environment === 'sandbox' ? 'sandbox' : 'production'
  const rawKey = env === 'sandbox' ? cfg?.api_key_sandbox : cfg?.api_key_production
  const apiKey = (rawKey || '').trim()
  const url = `http://localhost:3001/api/asaas-proxy${path}`
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'x-asaas-env': env,
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
  console.log('Testando GET /customers (verifica 200/401):')
  const getRes = await callProxy('/customers?limit=1')
  console.log(getRes)

  console.log('Tentando criar customer (POST /customers) com email diegofilippin@synsoft.com.br:')
  const createBody = {
    name: 'Teste Synsoft',
    email: 'diegofilippin@synsoft.com.br',
    cpfCnpj: '11144477735',
  }
  const postRes = await callProxy('/customers', 'POST', createBody)
  console.log(postRes)
}

main().catch(err => {
  console.error('Falha no teste:', err)
  process.exit(1)
})