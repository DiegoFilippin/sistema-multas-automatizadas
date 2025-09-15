import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Usar SERVICE_ROLE_KEY para bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugUserProfiles() {
  console.log('🔍 Debugando tabela user_profiles...')
  console.log('==================================================')
  
  try {
    // Testar conexão básica
    console.log('1. Testando conexão com Supabase...')
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.log('❌ Erro na conexão:', testError.message)
      return
    }
    console.log('✅ Conexão OK')
    
    // Testar estrutura da tabela
    console.log('\n2. Testando estrutura da tabela...')
    const { data: structureData, error: structureError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
    
    if (structureError) {
      console.log('❌ Erro na estrutura:', structureError.message)
      return
    }
    console.log('✅ Estrutura OK')
    
    // Listar todos os usuários
    console.log('\n3. Listando todos os usuários...')
    const { data: allUsers, error: allUsersError } = await supabase
      .from('user_profiles')
      .select('*')
    
    if (allUsersError) {
      console.log('❌ Erro ao listar usuários:', allUsersError.message)
      return
    }
    
    console.log('📋 Total de usuários:', allUsers?.length || 0)
    allUsers?.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}, Nome: ${user.name}, Role: ${user.role}, ID: ${user.id}`)
    })
    
    // Buscar usuário específico
    console.log('\n4. Buscando usuário admin_master...')
    const adminUser = allUsers?.find(user => user.email === 'master@sistema.com')
    
    if (!adminUser) {
      console.log('❌ Usuário admin_master não encontrado!')
      return
    }
    
    console.log('✅ Usuário encontrado:')
    console.log('📧 Email:', adminUser.email)
    console.log('👤 Nome:', adminUser.name)
    console.log('🔑 Role:', adminUser.role)
    console.log('🆔 ID:', adminUser.id)
    console.log('📅 Criado em:', adminUser.created_at)
    
    // Testar autenticação
    console.log('\n5. Testando autenticação...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'master@sistema.com',
      password: 'master123'
    })
    
    if (authError) {
      console.log('❌ Erro na autenticação:', authError.message)
      return
    }
    
    console.log('✅ Autenticação OK')
    console.log('🆔 User ID:', authData.user?.id)
    
    // Testar busca após autenticação
    console.log('\n6. Testando busca após autenticação...')
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user?.id)
      .single()
    
    if (profileError) {
      console.log('❌ Erro ao buscar perfil após auth:', profileError.message)
      console.log('Detalhes do erro:', profileError)
      return
    }
    
    console.log('✅ Perfil encontrado após auth:')
    console.log('📧 Email:', profileData.email)
    console.log('👤 Nome:', profileData.name)
    console.log('🔑 Role:', profileData.role)
    
    // Fazer logout
    await supabase.auth.signOut()
    
  } catch (error) {
    console.log('❌ Erro geral:', error)
  }
}

debugUserProfiles()