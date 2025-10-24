#!/usr/bin/env node

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Carrega variáveis de ambiente
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const ASAAS_PROXY_URL = process.env.ASAAS_PROXY_URL || 'http://localhost:3001/api/asaas-proxy'

if (!SUPABASE_URL) {
  console.error('❌ VITE_SUPABASE_URL/SUPABASE_URL não definido no .env')
  process.exit(1)
}
if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY (ou equivalente) não definido no .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function getGlobalAsaasConfig() {
  const { data, error } = await supabase
    .from('asaas_config')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    console.warn('⚠️  Não foi possível carregar configuração global do Asaas:', error.message)
    return null
  }
  return data
}

async function getCompanyAsaasConfig(companyId) {
  const { data, error } = await supabase
    .from('asaas_config')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (error) return null
  return data
}

function pickApiKey(config, forceEnv) {
  if (!config) return null
  const env = (forceEnv && ['production', 'sandbox'].includes(forceEnv)) ? forceEnv : (config.environment || 'sandbox')
  const key = env === 'production' ? config.api_key_production : config.api_key_sandbox
  return { env, key }
}

async function fetchAllCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('id, nome, cnpj, email, telefone, company_level, created_at')
    .order('nome')

  if (error) {
    console.error('❌ Erro ao buscar empresas:', error.message)
    process.exit(1)
  }
  return data || []
}

async function fetchAllSubaccounts() {
  const { data, error } = await supabase
    .from('asaas_subaccounts')
    .select('id, company_id, wallet_id, asaas_account_id, status')

  if (error) {
    console.error('❌ Erro ao buscar subcontas:', error.message)
    process.exit(1)
  }
  return data || []
}

function sanitizeCnpj(cnpj) {
  return (cnpj || '').replace(/\D/g, '')
}

async function createAsaasAccount(payload, apiKey, env) {
  const headers = {
    'Content-Type': 'application/json',
    'access_token': apiKey,
    'x-asaas-env': env, // ajuda o proxy a direcionar
  }

  const res = await fetch(`${ASAAS_PROXY_URL}/accounts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = null }

  if (!res.ok) {
    const msg = json?.errors?.[0]?.description || res.statusText
    throw new Error(`HTTP ${res.status} - ${msg}`)
  }

  return json
}

function makeFallbackEmail(company) {
  const domain = process.env.ASAAS_FALLBACK_EMAIL_DOMAIN || 'multasacsm.com.br'
  const cnpj = sanitizeCnpj(company.cnpj)
  return `${cnpj}@${domain}`
}

function getDefaultAddress() {
  try {
    if (process.env.DEFAULT_ADDRESS_JSON) {
      const obj = JSON.parse(process.env.DEFAULT_ADDRESS_JSON)
      // validar campos mínimos
      if (obj.postalCode && obj.address && obj.addressNumber && obj.city && obj.state) {
        return obj
      }
    }
  } catch {}
  return {
    postalCode: '88010-000',
    address: 'Rua Exemplo',
    addressNumber: '100',
    province: 'Centro',
    city: 'Florianópolis',
    state: 'SC',
  }
}

async function insertSubaccount({ company_id, asaas_account_id, wallet_id, api_key, account_type, status = 'active' }) {
  const { data, error } = await supabase
    .from('asaas_subaccounts')
    .insert({ company_id, asaas_account_id, wallet_id, api_key, account_type, status })
    .select()
    .single()

  if (error) throw new Error(`Erro ao salvar subconta: ${error.message}`)
  return data
}

async function updateSubaccount(id, fields) {
  const { data, error } = await supabase
    .from('asaas_subaccounts')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Erro ao atualizar subconta: ${error.message}`)
  return data
}

async function backfill() {
  const targetCompanyIds = (process.env.COMPANY_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  const targetCompanyNames = (process.env.COMPANY_NAMES || '').split(',').map(s => s.trim()).filter(Boolean)
  const forceEnv = (process.env.FORCE_ENV || '').trim().toLowerCase() // 'production' | 'sandbox' | ''
  const updateExisting = String(process.env.UPDATE_EXISTING || '').toLowerCase() === 'true'

  const [companies, subaccounts, globalConfig] = await Promise.all([
    fetchAllCompanies(),
    fetchAllSubaccounts(),
    getGlobalAsaasConfig(),
  ])

  const subMap = new Map(subaccounts.map(sa => [sa.company_id, sa]))

  let processed = 0
  let created = 0
  let skipped = 0
  let errors = 0

  console.log(`📊 Empresas: ${companies.length} | Subcontas existentes: ${subaccounts.length}`)
  if (forceEnv) console.log(`⚙️  FORCE_ENV ativo: ${forceEnv}`)
  if (updateExisting) console.log(`⚙️  UPDATE_EXISTING ativo: atualizar credenciais/wallet se faltando`)

  for (const company of companies) {
    const matchesIdFilter = targetCompanyIds.length ? targetCompanyIds.includes(company.id) : true
    const matchesNameFilter = targetCompanyNames.length 
      ? targetCompanyNames.some(n => company.nome.toLowerCase().includes(n.toLowerCase()))
      : true
    if (!(matchesIdFilter && matchesNameFilter)) {
      continue
    }

    const existing = subMap.get(company.id)
    const hasWallet = !!existing?.wallet_id

    // Decisão: criar se não existe; ou se forçar produção, criar e atualizar existente
    const needsCreate = !existing || (forceEnv === 'production' && updateExisting)

    if (!needsCreate) {
      skipped++
      console.log(`➡️  ${company.nome}: já possui subconta${hasWallet ? ` com wallet_id (${existing.wallet_id})` : ''}`)
      continue
    }

    try {
    // Config per company com fallback global
    const companyConfig = await getCompanyAsaasConfig(company.id)
    const cfg = companyConfig || globalConfig
    const picked = pickApiKey(cfg, forceEnv)
    if (!picked?.key) {
      errors++
      console.error(`🔴 ${company.nome}: API key ausente para ambiente ${picked?.env || cfg?.environment || 'desconhecido'}`)
      continue
    }

    const env = picked.env
    const apiKey = picked.key

    let payload = {
      name: company.nome,
      email: company.email,
      cpfCnpj: sanitizeCnpj(company.cnpj),
      birthDate: '1990-01-01', // padrão para pessoa jurídica
      companyType: 'MEI',
      incomeValue: 5000,
      ...(company.telefone ? { phone: company.telefone } : {}),
    }

    // Forçar endereço padrão em produção
    if (env === 'production') {
      const address = getDefaultAddress()
      payload = { ...payload, ...address }
    }

    console.log(`🧪 Criando conta Asaas para "${company.nome}" (${company.cnpj}) [env=${env}]...`)

    let result
    try {
      result = await createAsaasAccount(payload, apiKey, env)
    } catch (err) {
      const msg = String(err.message || '')
      // Email em uso
      if (msg.includes('email') && msg.includes('já está em uso')) {
        const fallbackEmail = makeFallbackEmail(company)
        console.warn(`⚠️  Email em uso. Tentando com fallback: ${fallbackEmail}`)
        payload.email = fallbackEmail
        result = await createAsaasAccount(payload, apiKey, env)
      } else if (msg.includes('É necessário informar a cidade')) {
        const address = getDefaultAddress()
        console.warn('⚠️  Endereço ausente. Tentando com endereço padrão:', address)
        payload = { ...payload, ...address }
        result = await createAsaasAccount(payload, apiKey, env)
      } else {
        throw err
      }
    }
    console.log('✅ Asaas retornou:', {
      id: result?.id,
      walletId: result?.walletId,
      apiKey: result?.apiKey ? (result.apiKey.substring(0, 10) + '...') : 'AUSENTE',
      status: result?.status,
    })

      const account_type = company.company_level === 'subadquirente' ? 'subadquirente' : 'despachante'

      let saved
      if (existing && updateExisting) {
        saved = await updateSubaccount(existing.id, {
          asaas_account_id: result.id,
          wallet_id: result.walletId,
          api_key: result.apiKey,
          account_type,
          status: 'active',
        })
      } else {
        saved = await insertSubaccount({
          company_id: company.id,
          asaas_account_id: result.id,
          wallet_id: result.walletId,
          api_key: result.apiKey,
          account_type,
          status: 'active',
        })
      }

      console.log('💾 Subconta salva:', {
        id: saved.id,
        company_id: saved.company_id,
        wallet_id: saved.wallet_id,
      })

      created++
    } catch (err) {
      errors++
      console.error(`❌ Falha ao criar subconta para ${company.nome}:`, err.message)
    } finally {
      processed++
    }
  }

  console.log('\n📈 Resultado do Backfill')
  console.log(`   • Processadas: ${processed}`)
  console.log(`   • Criadas: ${created}`)
  console.log(`   • Ignoradas: ${skipped}`)
  console.log(`   • Erros: ${errors}`)

  if (errors > 0) process.exitCode = 1
}

backfill().catch((e) => {
  console.error('Erro inesperado no backfill:', e)
  process.exit(1)
})