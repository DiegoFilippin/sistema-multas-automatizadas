#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas')
  console.log('Verifique se você tem as variáveis:')
  console.log('- VITE_SUPABASE_URL ou SUPABASE_URL')
  console.log('- VITE_SUPABASE_ANON_KEY ou SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// IDs das empresas: F&Z e ICETRAN
const companyIds = [
  '7d573ce0-125d-46bf-9e37-33d0c6074cf9', // F&Z CONSULTORIA EMPRESARIAL LTDA
  '270e0100-b920-49d4-aa13-f545fa99ecef', // ICETRAN INSTITUTO DE CERTIFICACAO E ESTUDOS DE TRANSITO E TRANSPORTE LTDA
]

async function setProductionEnvironment(companyId) {
  // Buscar config atual
  const { data: cfg, error } = await supabase
    .from('asaas_config')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (error) {
    console.error(`❌ Erro ao buscar asaas_config para ${companyId}:`, error.message)
    return
  }
  if (!cfg) {
    console.error(`❌ asaas_config ausente para empresa ${companyId}`)
    return
  }

  // Atualizar ambiente para produção
  const { data: updated, error: updError } = await supabase
    .from('asaas_config')
    .update({ environment: 'production' })
    .eq('company_id', companyId)
    .select()
    .single()

  if (updError) {
    console.error(`❌ Erro ao atualizar ambiente para produção (${companyId}):`, updError.message)
    return
  }

  const hasProdKey = Boolean(updated?.api_key_production)
  console.log(`✅ Ambiente atualizado para PRODUÇÃO: ${companyId}`)
  console.log(`   🔐 API Key produção: ${hasProdKey ? 'OK' : 'AUSENTE'}`)
}

async function main() {
  console.log('🚀 Ajustando ambiente das empresas para PRODUÇÃO...')
  for (const id of companyIds) {
    await setProductionEnvironment(id)
  }
  console.log('✅ Concluído!')
}

main().catch((e) => {
  console.error('❌ Falha geral:', e)
  process.exit(1)
})