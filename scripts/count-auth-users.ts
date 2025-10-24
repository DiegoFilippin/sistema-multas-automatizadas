import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !SERVICE) {
  console.error('❌ Necessário SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para contar auth.users.')
  process.exit(1)
}

const supabaseAdmin = createClient(URL, SERVICE)

async function main() {
  const perPage = 1000
  let page = 1
  let total = 0

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(error.message)
    }
    const batch = data?.users?.length ?? 0
    total += batch
    if (batch < perPage) break
    page += 1
  }

  const out = `auth.users total: ${total}`
  fs.writeFileSync('scripts/count-auth-users.out.txt', out + '\n')
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })