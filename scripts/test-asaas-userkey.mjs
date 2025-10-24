import fetch from 'node-fetch'

// Chave fornecida pelo usuário (usada exatamente como enviada, sem trim)
const USER_KEY = "$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAxODYyMzk6OiRhYWNoXzc5NDM0ZDk0LWJiMDctNDYxMC1iNjkzLTQ2ODNmZjZmMzVlZg=="

async function callDirect(headersVariant) {
  const url = 'https://api.asaas.com/v3/customers?limit=1'
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'sistema-multas-teste/1.0'
  }
  if (headersVariant === 'authorization') headers['Authorization'] = `Bearer ${USER_KEY}`
  if (headersVariant === 'access_token') headers['access_token'] = USER_KEY
  if (headersVariant === 'both') {
    headers['Authorization'] = `Bearer ${USER_KEY}`
    headers['access_token'] = USER_KEY
  }

  const resp = await fetch(url, { method: 'GET', headers })
  const contentType = resp.headers.get('content-type') || ''
  const text = await resp.text()
  let json
  try { json = JSON.parse(text) } catch { json = null }
  return { variant: `direct:${headersVariant}`, status: resp.status, contentType, json, raw: json ? undefined : (text || null) }
}

async function callDirectWithQuery() {
  const url = `https://api.asaas.com/v3/customers?limit=1&access_token=${encodeURIComponent(USER_KEY)}`
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'sistema-multas-teste/1.0'
  }
  const resp = await fetch(url, { method: 'GET', headers })
  const contentType = resp.headers.get('content-type') || ''
  const text = await resp.text()
  let json
  try { json = JSON.parse(text) } catch { json = null }
  return { variant: 'direct:query', status: resp.status, contentType, json, raw: json ? undefined : (text || null) }
}

async function callProxy(headersVariant) {
  const url = 'http://localhost:3001/api/asaas-proxy/customers?limit=1'
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-asaas-env': 'production'
  }
  if (headersVariant === 'authorization') headers['Authorization'] = `Bearer ${USER_KEY}`
  if (headersVariant === 'access_token') headers['access_token'] = USER_KEY
  if (headersVariant === 'both') {
    headers['Authorization'] = `Bearer ${USER_KEY}`
    headers['access_token'] = USER_KEY
  }

  const resp = await fetch(url, { method: 'GET', headers })
  const text = await resp.text()
  let json
  try { json = JSON.parse(text) } catch { json = null }
  return { variant: `proxy:${headersVariant}`, status: resp.status, json, raw: json ? undefined : (text || null) }
}

async function main() {
  const tests = []
  tests.push(await callDirect('authorization'))
  tests.push(await callDirect('access_token'))
  tests.push(await callDirect('both'))
  tests.push(await callDirectWithQuery())

  // Proxy precisa estar rodando
  try {
    tests.push(await callProxy('authorization'))
    tests.push(await callProxy('access_token'))
    tests.push(await callProxy('both'))
  } catch (e) {
    tests.push({ variant: 'proxy:error', status: null, error: String(e && e.message || e) })
  }

  for (const t of tests) {
    console.log(JSON.stringify(t, null, 2))
  }
}

main().catch(err => {
  console.error('Falha geral no teste:', err)
  process.exit(1)
})