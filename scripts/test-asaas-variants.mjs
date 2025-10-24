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

function maskKey(key) {
  const start = key.slice(0, 6)
  const end = key.slice(-4)
  return `${start}...${end}`
}

function charCodesLabel(s) {
  const codes = Array.from(s.slice(0, 10)).map(c => c.charCodeAt(0))
  return codes.join(',')
}

async function fetchJson(url, options) {
  const resp = await fetch(url, options)
  const text = await resp.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  return { status: resp.status, json }
}

async function runVariants() {
  const apiKeyRaw = await getApiKey()
  const apiKeyTrim = apiKeyRaw.trim()
  const apiKeySansComma = apiKeyTrim.replace(/,+$/, '')
  const hasWhitespaceRaw = /\s/.test(apiKeyRaw)
  const hasWhitespaceTrim = /\s/.test(apiKeyTrim)

  console.log('Diagnóstico da chave:')
  console.log('Mascarada:', maskKey(apiKeyRaw))
  console.log('Começa com $:', apiKeyRaw.startsWith('$'))
  console.log('Tamanho raw:', apiKeyRaw.length, '| tamanho trim:', apiKeyTrim.length, '| tamanho sem vírgula:', apiKeySansComma.length)
  console.log('Tem espaços/quebras (raw):', hasWhitespaceRaw, '| (trim):', hasWhitespaceTrim)
  console.log('Primeiros char codes (raw):', charCodesLabel(apiKeyRaw))
  console.log('Primeiros char codes (trim):', charCodesLabel(apiKeyTrim))
  console.log('Raw === Trim:', apiKeyRaw === apiKeyTrim)

  const baseApi = 'https://api.asaas.com/v3'
  const path = '/customers?limit=1'

  // 1) access_token RAW
  console.log('\nTeste 1: GET com access_token RAW')
  let res = await fetchJson(`${baseApi}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'access_token': apiKeyRaw },
  })
  console.log(JSON.stringify(res, null, 2))

  // 2) access_token TRIM
  console.log('\nTeste 2: GET com access_token TRIM')
  res = await fetchJson(`${baseApi}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'access_token': apiKeyTrim },
  })
  console.log(JSON.stringify(res, null, 2))

  // 2b) access_token SEM VÍRGULA FINAL
  console.log('\nTeste 2b: GET com access_token sem vírgula final')
  res = await fetchJson(`${baseApi}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'access_token': apiKeySansComma },
  })
  console.log(JSON.stringify(res, null, 2))

  // 3) Authorization Bearer RAW
  console.log('\nTeste 3: GET com Authorization Bearer RAW')
  res = await fetchJson(`${baseApi}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeyRaw}` },
  })
  console.log(JSON.stringify(res, null, 2))

  // 4) Authorization Bearer TRIM
  console.log('\nTeste 4: GET com Authorization Bearer TRIM')
  res = await fetchJson(`${baseApi}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeyTrim}` },
  })
  console.log(JSON.stringify(res, null, 2))

  // 4b) Authorization Bearer SEM VÍRGULA FINAL
  console.log('\nTeste 4b: GET com Authorization Bearer sem vírgula final')
  res = await fetchJson(`${baseApi}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeySansComma}` },
  })
  console.log(JSON.stringify(res, null, 2))

  // 5) Query param access_token RAW
  console.log('\nTeste 5: GET com access_token na query RAW')
  res = await fetchJson(`${baseApi}${path}&access_token=${encodeURIComponent(apiKeyRaw)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  console.log(JSON.stringify(res, null, 2))

  // 6) Query param access_token TRIM
  console.log('\nTeste 6: GET com access_token na query TRIM')
  res = await fetchJson(`${baseApi}${path}&access_token=${encodeURIComponent(apiKeyTrim)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  console.log(JSON.stringify(res, null, 2))

  // 6b) Query param access_token SEM VÍRGULA FINAL
  console.log('\nTeste 6b: GET com access_token na query sem vírgula final')
  res = await fetchJson(`${baseApi}${path}&access_token=${encodeURIComponent(apiKeySansComma)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  console.log(JSON.stringify(res, null, 2))
}

runVariants().catch(err => {
  console.error('Falha no teste de variações:', err)
  process.exit(1)
})