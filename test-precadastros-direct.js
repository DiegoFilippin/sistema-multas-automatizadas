import 'dotenv/config'
import { supabase, isSupabaseMock } from './src/lib/supabase.ts'

async function main() {
  console.log('== Teste direto de pré-cadastros ==')
  console.log('Supabase mock?', isSupabaseMock)
  try {
    const { data, error } = await supabase
      .from('precadastros')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro na consulta:', error)
    } else {
      const count = Array.isArray(data) ? data.length : (data ? 1 : 0)
      console.log('Registros encontrados:', count)
      console.log('Dados:', JSON.stringify(data, null, 2))
    }
  } catch (e) {
    console.error('Exceção ao consultar:', e)
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})