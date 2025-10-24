import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ktgynzdzvfcpvbdbtplu.supabase.co'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const TARGET_SUB_ID = process.env.SUBACCOUNT_ID

if (!URL || !SERVICE) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no ambiente')
  process.exit(1)
}

const supabase = createClient(URL, SERVICE, { auth: { persistSession: false } })

async function main() {
  try {
    if (TARGET_SUB_ID) {
      console.log('🎯 Usando SUBACCOUNT_ID alvo:', TARGET_SUB_ID)
      const { data: auditsById, error: eId } = await supabase
        .from('asaas_credentials_audit')
        .select('*')
        .eq('subaccount_id', TARGET_SUB_ID)
        .order('changed_at', { ascending: false })
        .limit(20)
      if (eId) throw eId
      console.log('🧾 Logs de auditoria por subaccount_id:', auditsById)
    } else {
      // Buscar uma subconta recente para teste
      const { data: subs, error: e1 } = await supabase
        .from('asaas_subaccounts')
        .select('id, company_id, manual_wallet_id, is_manual_config, credentials_updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (e1) throw e1
      if (!subs || subs.length === 0) {
        console.log('⚠️ Nenhuma subconta encontrada')
        return
      }

      const sub = subs[0] as any
      console.log('🔎 Subconta alvo:', sub)

      // Consultar últimos logs de auditoria da subconta
      const { data: audits, error: e2 } = await supabase
        .from('asaas_credentials_audit')
        .select('*')
        .eq('subaccount_id', sub.id)
        .order('changed_at', { ascending: false })
        .limit(10)

      if (e2) throw e2

      console.log('🧾 Últimos logs de auditoria:', audits)

      // Estatísticas simples
      const byField: Record<string, number> = {}
      for (const a of (audits || [])) {
        byField[a.field_name] = (byField[a.field_name] || 0) + 1
      }
      console.log('📊 Distribuição por campo:', byField)
    }

    // Também mostrar os últimos logs gerais
    const { data: last, error: eLast } = await supabase
      .from('asaas_credentials_audit')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(5)
    if (eLast) throw eLast
    console.log('🗂️ Últimos 5 logs gerais:', last)

    console.log('✅ Inspeção concluída com sucesso.')
    process.exit(0)
  } catch (err: any) {
    console.error('❌ Falha ao consultar auditoria:', err?.message || String(err))
    process.exit(1)
  }
}

main()