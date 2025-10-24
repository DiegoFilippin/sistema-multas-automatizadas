import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ktgynzdzvfcpvbdbtplu.supabase.co'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!URL || !SERVICE) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no ambiente')
  process.exit(1)
}

const supabase = createClient(URL, SERVICE, { auth: { persistSession: false } })

function randomWallet() {
  const s4 = () => Math.random().toString(16).slice(2, 6)
  return `${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}`
}

async function main() {
  try {
    const { data: subs, error: e1 } = await supabase
      .from('asaas_subaccounts')
      .select('id, manual_wallet_id, is_manual_config')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (e1) throw e1
    if (!subs || subs.length === 0) {
      console.log('⚠️ Nenhuma subconta encontrada')
      return
    }

    const sub = subs[0] as { id: string; manual_wallet_id: string | null }
    const newWallet = randomWallet()
    console.log('🔧 Forçando update manual_wallet_id:', { id: sub.id, from: sub.manual_wallet_id, to: newWallet })

    const { data: updated, error: e2 } = await supabase
      .from('asaas_subaccounts')
      .update({
        manual_wallet_id: newWallet,
        is_manual_config: true,
        credentials_source: 'manual',
        credentials_updated_at: new Date().toISOString(),
        credentials_updated_by: null,
        account_origin: 'external'
      })
      .eq('id', sub.id)
      .select('id, manual_wallet_id, is_manual_config, credentials_updated_at')
      .single()

    if (e2) throw e2
    console.log('✅ Update realizado:', updated)

    const { data: audits, error: e3 } = await supabase
      .from('asaas_credentials_audit')
      .select('*')
      .eq('subaccount_id', sub.id)
      .order('changed_at', { ascending: false })
      .limit(5)
    if (e3) throw e3

    console.log('🧾 Últimos 5 logs após update:', audits)
    process.exit(0)
  } catch (err: any) {
    console.error('❌ Falha no forceAudit:', err?.message || String(err))
    process.exit(1)
  }
}

main()