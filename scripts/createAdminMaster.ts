import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Usar SERVICE_ROLE_KEY para bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdminMaster() {
  console.log('🚀 Criando usuário admin_master...')
  console.log('==================================================')
  
  const adminId = '00000000-0000-0000-0000-000000000002'
  const adminEmail = 'master@sistema.com'
  const adminPassword = 'master123'
  const adminName = 'Admin Master'
  
  try {
    // 1. Verificar se usuário já existe na auth.users
    console.log('1. Verificando usuário na auth.users...')
    const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserById(adminId)
    
    if (!existingUser.user) {
      console.log('Criando novo usuário na auth.users...')
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        id: adminId,
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          name: adminName
        }
      })
      
      if (authError) {
        console.log('❌ Erro ao criar usuário auth:', authError.message)
        return
      }
      console.log('✅ Usuário auth criado')
    } else {
      console.log('✅ Usuário auth já existe')
    }
    
    // 2. Criar perfil na user_profiles
    console.log('\n2. Criando perfil na user_profiles...')
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
      return
    }
    
    console.log('✅ Perfil criado com sucesso!')
    
    // 3. Verificar criação
    console.log('\n3. Verificando usuário criado...')
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
    
    // 4. Testar login
    console.log('\n4. Testando login...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    })
    
    if (loginError) {
      console.log('❌ Erro no login:', loginError.message)
      return
    }
    
    console.log('✅ Login OK!')
    console.log('🆔 User ID:', loginData.user?.id)
    
    // Fazer logout
    await supabase.auth.signOut()
    
    console.log('\n==================================================')
    console.log('🎉 Admin Master criado com sucesso!')
    console.log('📧 Email: master@sistema.com')
    console.log('🔐 Senha: master123')
    console.log('🎭 Role: admin_master')
    console.log('🌐 Acesso: http://localhost:5173/login')
    
  } catch (error) {
    console.log('❌ Erro geral:', error)
  }
}

createAdminMaster()