import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Usar SERVICE_ROLE_KEY para bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey)

async function simpleCreateAdmin() {
  console.log('🚀 Criando perfil admin_master...')
  console.log('==================================================')
  
  const adminId = '00000000-0000-0000-0000-000000000002'
  const adminEmail = 'master@sistema.com'
  const adminName = 'Admin Master'
  
  try {
    // Criar/atualizar perfil na user_profiles
    console.log('1. Criando perfil na user_profiles...')
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: adminId,
        email: adminEmail,
        name: adminName,
        role: 'admin_master',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
    
    if (profileError) {
      console.log('❌ Erro ao criar perfil:', profileError.message)
      console.log('Detalhes:', profileError)
      return
    }
    
    console.log('✅ Perfil criado/atualizado com sucesso!')
    
    // Verificar criação
    console.log('\n2. Verificando perfil criado...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', adminEmail)
      .single()
    
    if (verifyError) {
      console.log('❌ Erro na verificação:', verifyError.message)
      return
    }
    
    console.log('✅ Verificação OK:')
    console.log('📧 Email:', verifyData.email)
    console.log('👤 Nome:', verifyData.name)
    console.log('🔑 Role:', verifyData.role)
    console.log('🆔 ID:', verifyData.id)
    
    console.log('\n==================================================')
    console.log('🎉 Perfil Admin Master criado com sucesso!')
    console.log('📧 Email: master@sistema.com')
    console.log('🔐 Senha: master123')
    console.log('🎭 Role: admin_master')
    console.log('🌐 Acesso: http://localhost:5173/login')
    console.log('\n⚠️  IMPORTANTE: Você precisa criar o usuário na auth.users manualmente via Supabase Dashboard')
    console.log('   ou usar o comando SQL direto no banco de dados.')
    
  } catch (error) {
    console.log('❌ Erro geral:', error)
  }
}

simpleCreateAdmin()