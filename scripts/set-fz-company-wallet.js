import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON) {
  console.error('❌ Variáveis de ambiente do Supabase ausentes. Verifique .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabaseAnon = createClient(URL, ANON, { auth: { persistSession: false } })
const supabaseAdmin = SERVICE ? createClient(URL, SERVICE, { auth: { persistSession: false } }) : null

async function setFZCompanyWallet() {
  console.log('🔧 Atualizando companies.manual_wallet_id para F&Z CONSULTORIA EMPRESARIAL LTDA')
  console.log('====================================================================')

  // 1) Buscar empresa F&Z
  const { data: company, error: companyError } = await supabaseAnon
    .from('companies')
    .select('id, nome, manual_wallet_id')
    .eq('nome', 'F&Z CONSULTORIA EMPRESARIAL LTDA')
    .single()

  if (companyError) {
    console.error('❌ Erro ao buscar empresa F&Z:', companyError.message)
    process.exit(1)
  }
  if (!company) {
    console.error('⚠️ Empresa F&Z não encontrada por nome exato.')
    process.exit(1)
  }

  console.log('🏢 Empresa alvo:', company)

  // 2) Buscar subaccount da empresa
  const { data: sub, error: subError } = await supabaseAnon
    .from('asaas_subaccounts')
    .select('id, company_id, manual_wallet_id, wallet_id, updated_at')
    .eq('company_id', company.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (subError) {
    console.error('❌ Erro ao buscar subaccount da empresa:', subError.message)
    process.exit(1)
  }
  if (!sub) {
    console.error('⚠️ Empresa não possui subaccount cadastrada.')
    process.exit(1)
  }

  const selectedWallet = sub.manual_wallet_id || sub.wallet_id
  if (!selectedWallet) {
    console.error('⚠️ Subaccount não possui manual_wallet_id nem wallet_id. Nada para atualizar.')
    process.exit(1)
  }

  console.log('🎯 Wallet a aplicar na company:', selectedWallet)

  // 3) Atualizar companies.manual_wallet_id (preferir service role para evitar RLS)
  const client = supabaseAdmin || supabaseAnon
  const { data: updated, error: updateError } = await client
    .from('companies')
    .update({ manual_wallet_id: selectedWallet })
    .eq('id', company.id)
    .select('id, nome, manual_wallet_id')
    .single()

  if (updateError) {
    console.error('❌ Erro ao atualizar companies.manual_wallet_id:', updateError.message)
    process.exit(1)
  }

  console.log('✅ Company atualizada:', updated)

  // 4) Confirmar leitura
  const { data: confirm, error: confirmError } = await supabaseAnon
    .from('companies')
    .select('id, nome, manual_wallet_id')
    .eq('id', company.id)
    .single()

  if (confirmError) {
    console.error('❌ Erro ao confirmar company:', confirmError.message)
    process.exit(1)
  }

  console.log('📌 Company após update (confirmação):', confirm)
  console.log('\n✅ Atualização concluída.')
}

setFZCompanyWallet().catch(err => {
  console.error('💥 Erro ao atualizar wallet da F&Z:', err)
  process.exit(1)
})