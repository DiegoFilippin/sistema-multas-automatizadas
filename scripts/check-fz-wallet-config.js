import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON) {
  console.error('❌ Variáveis de ambiente do Supabase ausentes. Verifique .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(URL, ANON, { auth: { persistSession: false } })
const supabaseAdmin = SERVICE ? createClient(URL, SERVICE, { auth: { persistSession: false } }) : null

async function checkFZWallet() {
  console.log('🔍 Checando configuração de wallet da F&Z CONSULTORIA EMPRESARIAL LTDA')
  console.log('===============================================================')

  // Buscar empresa F&Z por nome exato ou similar
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id, nome, manual_wallet_id, asaas_wallet_id, parent_company_id')
    .or('nome.eq.F&Z CONSULTORIA EMPRESARIAL LTDA,nome.ilike.%F&Z%')
    .order('nome', { ascending: true })

  if (companyError) {
    console.error('❌ Erro ao buscar empresa F&Z:', companyError.message)
    console.dir(companyError, { depth: 5 })
    process.exit(1)
  }

  if (!companies || companies.length === 0) {
    console.log('⚠️ Empresa F&Z não encontrada.')
    process.exit(0)
  }

  console.log(`✅ Encontradas ${companies.length} empresas que batem com F&Z`)
  for (const company of companies) {
    console.log('\n🏢 Empresa:')
    console.log(`   id: ${company.id}`)
    console.log(`   nome: ${company.nome}`)
    console.log(`   parent_company_id: ${company.parent_company_id || '—'}`)
    console.log(`   manual_wallet_id: ${company.manual_wallet_id || '—'}`)
    console.log(`   asaas_wallet_id (legado): ${company.asaas_wallet_id || '—'}`)

    // Ver subaccounts registradas para a empresa
    const { data: subaccounts, error: subError } = await supabase
      .from('asaas_subaccounts')
      .select('id, company_id, wallet_id, manual_wallet_id, created_at, updated_at')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })

    if (subError) {
      console.error('❌ Erro ao buscar subaccounts:', subError.message)
      console.dir(subError, { depth: 5 })
    } else {
      console.log('📄 Subaccounts relacionadas:')
      if (!subaccounts || subaccounts.length === 0) {
        console.log('   (nenhuma)')
      } else {
        for (const sub of subaccounts) {
          console.log(`   - id: ${sub.id}`)
          console.log(`     wallet_id (legacy): ${sub.wallet_id || '—'}`)
          console.log(`     manual_wallet_id: ${sub.manual_wallet_id || '—'}`)
          console.log(`     created_at: ${sub.created_at}`)
          console.log(`     updated_at: ${sub.updated_at}`)
        }
      }
    }
  }

  // Se houver chave de serviço, validar leitura direta do companies sem RLS
  if (supabaseAdmin) {
    console.log('\n🔐 Validação via service role (sem RLS)')
    const { data: adminCompanies, error: adminError } = await supabaseAdmin
      .from('companies')
      .select('id, nome, manual_wallet_id, asaas_wallet_id')
      .or('nome.eq.F&Z CONSULTORIA EMPRESARIAL LTDA,nome.ilike.%F&Z%')

    if (adminError) {
      console.error('❌ Erro admin ao buscar companies:', adminError.message)
    } else {
      console.log(`✅ Admin leu ${adminCompanies?.length || 0} registros.`)
    }
  } else {
    console.log('\nℹ️ Sem chave de serviço configurada, pulando validação admin.')
  }

  console.log('\n✅ Checagem concluída.')
}

checkFZWallet().catch(err => {
  console.error('💥 Erro ao checar F&Z:', err)
  process.exit(1)
})