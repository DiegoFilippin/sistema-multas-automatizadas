import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Usar SERVICE_ROLE_KEY para admin operations
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function finalCreateAuthUser() {
  console.log('🚀 Criando usuário de autenticação admin_master...')
  console.log('==================================================')
  
  const adminId = '00000000-0000-0000-0000-000000000002'
  const adminEmail = 'master@sistema.com'
  const adminPassword = 'master123'
  
  try {
    // Tentar criar usuário usando admin API
    console.log('1. Criando usuário na auth.users usando admin API...')
    
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Admin Master'
      }
    })
    
    if (createError) {
      console.log('❌ Erro ao criar usuário:', createError.message)
      
      // Tentar buscar usuário existente
      console.log('\n2. Tentando buscar usuário existente...')
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        console.log('❌ Erro ao listar usuários:', listError.message)
        return
      }
      
      const existingUser = listData.users.find(user => user.email === adminEmail)
      
      if (existingUser) {
        console.log('✅ Usuário já existe na auth.users:')
        console.log('🆔 ID:', existingUser.id)
        console.log('📧 Email:', existingUser.email)
        
        // Testar login
        console.log('\n3. Testando login...')
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword
        })
        
        if (loginError) {
          console.log('❌ Erro no login:', loginError.message)
          console.log('\n⚠️  O usuário existe mas a senha pode estar incorreta.')
          console.log('   Tente redefinir a senha via Supabase Dashboard.')
        } else {
          console.log('✅ Login OK!')
          console.log('🆔 User ID:', loginData.user?.id)
          await supabase.auth.signOut()
        }
      } else {
        console.log('❌ Usuário não encontrado na auth.users')
      }
      
      return
    }
    
    console.log('✅ Usuário criado com sucesso!')
    console.log('🆔 ID:', createData.user?.id)
    console.log('📧 Email:', createData.user?.email)
    
    // Testar login
    console.log('\n2. Testando login...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    })
    
    if (loginError) {
      console.log('❌ Erro no login:', loginError.message)
    } else {
      console.log('✅ Login OK!')
      console.log('🆔 User ID:', loginData.user?.id)
      await supabase.auth.signOut()
    }
    
    console.log('\n==================================================')
    console.log('🎉 Usuário admin_master criado e testado com sucesso!')
    console.log('📧 Email: master@sistema.com')
    console.log('🔐 Senha: master123')
    console.log('🎭 Role: admin_master')
    console.log('🌐 Acesso: http://localhost:5173/login')
    
  } catch (error) {
    console.log('❌ Erro geral:', error)
  }
}

finalCreateAuthUser()