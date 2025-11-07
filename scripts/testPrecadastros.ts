import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

const API_URL = process.env.API_URL || 'http://localhost:3001/api/precadastros'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing Supabase env: VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function main() {
  console.log('🔑 Autenticando superadmin master@sistema.com...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'master@sistema.com',
    password: 'master123',
  })
  if (error || !data.session) {
    console.error('❌ Login failed:', error?.message)
    process.exit(1)
  }
  const token = data.session.access_token
  console.log('✅ Token obtido, chamando API:', API_URL)

  const res = await fetch(API_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })

  console.log('📡 Status:', res.status)
  const text = await res.text()
  console.log('📝 Body:', text)

  await supabase.auth.signOut()
}

main().catch(err => { console.error('💥 Erro no teste:', err); process.exit(1) })