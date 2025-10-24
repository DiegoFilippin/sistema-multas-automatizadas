import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON) {
  console.error('❌ Variáveis de ambiente do Supabase ausentes. Verifique .env')
  process.exit(1)
}

const supabaseAnon = createClient(URL, ANON)
const supabaseAdmin = SERVICE ? createClient(URL, SERVICE) : supabaseAnon

async function countTable(table: string) {
  const { count, error } = await supabaseAdmin
    .from(table as any)
    .select('*', { count: 'exact', head: true })
  return { count: count ?? null, error: error ? error.message : null }
}

async function main() {
  const outputs: string[] = []
  const result: any = { supabase_url: URL, totals: {}, distribution_by_company: [] }
  const log = (s: string) => { outputs.push(s) }

  log(`🔎 Supabase: ${URL}`)

  // Total em public.users
  const users = await countTable('users')
  result.totals.users = users
  log(users.error ? `users erro: ${users.error}` : `users total: ${users.count}`)

  // Total em user_profiles (se existir)
  const profiles = await countTable('user_profiles')
  result.totals.user_profiles = profiles
  log(profiles.error ? `user_profiles erro: ${profiles.error}` : `user_profiles total: ${profiles.count}`)

  // Total em auth.users (requer service role)
  try {
    const { count, error } = await supabaseAdmin
      .from('auth.users' as any)
      .select('id', { count: 'exact', head: true })
    result.totals.auth_users = { count: count ?? null, error: error ? error.message : null }
    log(error ? `auth.users erro: ${error.message}` : `auth.users total: ${count}`)
  } catch (e: any) {
    result.totals.auth_users = { count: null, error: e?.message || String(e) }
    log(`auth.users não acessível: ${e?.message || e}`)
  }

  // Distribuição por empresa
  const { data: usersList, error: usersErr } = await supabaseAdmin
    .from('users')
    .select('id, company_id, role')
  if (usersErr) {
    result.distribution_error = usersErr.message
    log(`Distribuição por empresa erro: ${usersErr.message}`)
  } else if (usersList && usersList.length) {
    const { data: companies, error: compErr } = await supabaseAdmin
      .from('companies')
      .select('id, nome')

    const names = new Map<string, string>()
    if (!compErr && companies) companies.forEach(c => names.set(c.id, c.nome))

    const agg: Record<string, { name: string; total: number; roles: Record<string, number> }> = {}
    for (const u of usersList) {
      const cid = u.company_id || 'SEM_EMPRESA'
      const name = names.get(cid) || (cid === 'SEM_EMPRESA' ? 'Sem empresa' : cid)
      agg[cid] ??= { name, total: 0, roles: {} }
      agg[cid].total++
      const r = u.role || 'unknown'
      agg[cid].roles[r] = (agg[cid].roles[r] || 0) + 1
    }

    const entries = Object.entries(agg)
    entries.sort((a, b) => b[1].total - a[1].total)
    result.distribution_by_company = entries.map(([cid, info]) => ({ company_id: cid, name: info.name, total: info.total, roles: info.roles }))

    log('\n📊 Usuários por empresa:')
    for (const [cid, info] of entries) {
      const roles = Object.entries(info.roles).map(([k, v]) => `${k}:${v}`).join(', ')
      log(`- ${info.name} (${cid}): ${info.total} [${roles}]`)
    }
  } else {
    log('Nenhum usuário em users para distribuir por empresa.')
  }

  outputs.push('\n✅ Fim')

  // Escrever saída em arquivos
  const outTxt = outputs.join('\n')
  const outJson = JSON.stringify(result, null, 2)
  fs.writeFileSync('scripts/count-users.out.txt', outTxt)
  fs.writeFileSync('scripts/count-users.out.json', outJson)
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })