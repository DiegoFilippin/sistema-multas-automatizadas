import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!URL || !ANON) {
  console.error('❌ Variáveis de ambiente do Supabase ausentes. Verifique .env (SUPABASE_URL/VITE_SUPABASE_URL, SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabaseAnon = createClient(URL, ANON, { auth: { persistSession: false } })
const supabaseAdmin = SERVICE ? createClient(URL, SERVICE, { auth: { persistSession: false } }) : supabaseAnon

function log(title, obj) {
  console.log(`\n${title}`)
  if (obj !== undefined) console.dir(obj, { depth: 5 })
}

async function main() {
  console.log('🔍 Diagnóstico de precadastros (contagem e RLS)')
  console.log('===========================================')
  console.log(`Supabase URL: ${URL}`)

  // Contagem com anon
  console.log('\n1) Contando com cliente anon...')
  const { count: anonCount, error: anonCountError } = await supabaseAnon
    .from('precadastros')
    .select('id', { count: 'exact', head: true })

  if (anonCountError) {
    console.error('❌ Erro na contagem anon:', anonCountError.message)
    log('Detalhes', anonCountError)
  } else {
    console.log(`✅ Contagem anon: ${anonCount ?? 0}`)
  }

  // Amostra com anon
  const { data: anonSample, error: anonSampleError } = await supabaseAnon
    .from('precadastros')
    .select('id, status, email, razao_social, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (anonSampleError) {
    console.error('❌ Erro ao listar anon:', anonSampleError.message)
    log('Detalhes', anonSampleError)
  } else {
    log('Amostra anon (até 5)', anonSample)
  }

  // Contagem com service role
  console.log('\n2) Contando com cliente service role...')
  const { count: svcCount, error: svcCountError } = await supabaseAdmin
    .from('precadastros')
    .select('id', { count: 'exact', head: true })

  if (svcCountError) {
    console.error('❌ Erro na contagem service:', svcCountError.message)
    log('Detalhes', svcCountError)
  } else {
    console.log(`✅ Contagem service: ${svcCount ?? 0}`)
  }

  const { data: svcSample, error: svcSampleError } = await supabaseAdmin
    .from('precadastros')
    .select('id, status, email, razao_social, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (svcSampleError) {
    console.error('❌ Erro ao listar service:', svcSampleError.message)
    log('Detalhes', svcSampleError)
  } else {
    log('Amostra service (até 5)', svcSample)
  }

  // Heurística de RLS
  const rlsBlocked = (svcCount ?? 0) > 0 && ((anonCount ?? 0) === 0 || !!anonCountError || (!!anonSampleError && !anonSample?.length))

  const result = {
    supabase_url: URL,
    counts: {
      anon: anonCount ?? null,
      service: svcCount ?? null,
      anon_error: anonCountError ? { message: anonCountError.message, code: anonCountError.code } : null,
      service_error: svcCountError ? { message: svcCountError.message, code: svcCountError.code } : null,
    },
    sample: {
      anon: anonSample ?? null,
      service: svcSample ?? null,
    },
    rls_blocked_for_anon: rlsBlocked,
  }

  const outPath = 'scripts/diagnosePrecadastros.out.json'
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n')
  console.log(`\n📝 Resultado salvo em: ${outPath}`)

  if (rlsBlocked) {
    console.warn('⚠️ Indício de RLS bloqueando leitura com anon. A página /precadastros pode depender de sessão/role correta ou de backend usando service role.')
  } else {
    console.log('✅ Sem indícios de bloqueio RLS para leitura anon (ou não há registros).')
  }
}

main().catch(err => { console.error(err); process.exit(1) })

