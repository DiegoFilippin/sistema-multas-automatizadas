import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ktgynzdzvfcpvbdbtplu.supabase.co'
const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON) {
  console.error('❌ Variáveis de ambiente do Supabase ausentes. Verifique .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabaseAnon = createClient(URL, ANON, { auth: { persistSession: false } })
const supabaseAdmin = SERVICE ? createClient(URL, SERVICE, { auth: { persistSession: false } }) : null

function log(title, obj) {
  console.log(`\n${title}`)
  if (obj) console.dir(obj, { depth: 5 })
}

async function diagnoseUsers() {
  console.log('🔍 Diagnóstico de criação de usuário (Auth + RLS)')
  console.log('==================================================')

  // 1) Login como um usuário administrador existente
  console.log('\n1) Fazendo login como admin@test.com ...')
  const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
    email: 'admin@test.com',
    password: 'Admin@123'
  })

  if (loginError) {
    console.error('❌ Erro no login:', loginError.message)
    return
  }

  console.log('✅ Login ok')
  console.log(`   User ID: ${loginData.user.id}`)

  // 2) Descobrir company_id e role do admin
  console.log('\n2) Buscando perfil deste admin na tabela users ...')
  const { data: adminProfile, error: adminProfileError } = await supabaseAnon
    .from('users')
    .select('id, email, nome, role, company_id')
    .eq('id', loginData.user.id)
    .single()

  if (adminProfileError) {
    console.error('❌ Erro ao buscar perfil admin:', adminProfileError.message)
    log('Detalhes', adminProfileError)
    return
  }

  console.log('✅ Perfil admin encontrado:')
  console.log(`   role: ${adminProfile.role} | company_id: ${adminProfile.company_id}`)

  // 3) Criar um novo usuário via auth.signUp (igual à UI)
  const unique = Date.now()
  const newEmail = `diagnose+${unique}@multastrae.com`
  console.log(`\n3) Criando usuário de autenticação via signUp: ${newEmail} ...`)
  const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
    email: newEmail,
    password: 'Diag@12345'
  })

  if (authError) {
    console.error('❌ Erro na autenticação (signUp):', authError.message)
    log('Detalhes', authError)
    return
  }

  const newUserId = authData.user?.id
  console.log('✅ signUp ok')
  console.log(`   New auth user id: ${newUserId}`)

  // 4) Tentar inserir perfil na tabela users com a sessão do admin (testa RLS)
  console.log('\n4) Tentando inserir perfil na tabela users (RLS) ...')
  const { data: insertData, error: insertError } = await supabaseAnon
    .from('users')
    .insert({
      id: newUserId,
      email: newEmail,
      nome: 'Diagnóstico RLS',
      role: 'user',
      company_id: adminProfile.company_id,
      ativo: true,
      ultimo_login: new Date().toISOString()
    })
    .select()
    
  if (insertError) {
    console.error('❌ Erro na inserção (RLS provável):', insertError.message)
    log('Detalhes', insertError)
  } else {
    console.log('✅ Inserido perfil com sucesso (RLS permitiu)')
    log('Perfil inserido', insertData)
  }

  // 5) Inserção usando chave de serviço (bypassa RLS) para comparar
  if (supabaseAdmin) {
    console.log('\n5) Tentando inserir perfil via service role (sem RLS) ...')
    const { data: adminInsertData, error: adminInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUserId,
        email: newEmail,
        nome: 'Diagnóstico Admin',
        role: 'user',
        company_id: adminProfile.company_id,
        ativo: true
      })
      .select()

    if (adminInsertError) {
      console.error('❌ Erro na inserção com service role:', adminInsertError.message)
      log('Detalhes', adminInsertError)
    } else {
      console.log('✅ Inserção via service role ok')
      log('Perfil inserido (service role)', adminInsertData)
    }
  } else {
    console.log('\nℹ️ Sem chave de serviço configurada, pulando comparação de bypass RLS.')
  }

  // 6) Resumo
  console.log('\n==================================================')
  console.log('Resumo:')
  console.log('- signUp cria o usuário de autenticação.')
  console.log('- Inserção na tabela users pode falhar por RLS se o adminProfile.role não for "admin" de acordo com as policies.')
  console.log('- Se a inserção via service role funcionar, confirma que o bloqueio é RLS e não schema.')
  console.log('==================================================')
}

// Run
await diagnoseUsers().catch(e => {
  console.error('💥 Erro fatal no diagnóstico:', e)
  process.exit(1)
})