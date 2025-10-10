import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA'

// Cria cliente Supabase com chave de serviço
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Função para obter ou criar empresa de teste
async function getOrCreateTestCompany() {
  try {
    // Primeiro, tenta buscar uma empresa existente
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('cnpj', '12.345.678/0001-90')
      .single()

    if (existingCompany) {
      console.log('✅ Usando empresa existente:', existingCompany.id)
      return existingCompany.id
    }

    // Se não existe, cria uma nova
    const { data, error } = await supabase
      .from('companies')
      .insert({
        nome: 'Empresa Teste ICETRAN',
        cnpj: '12.345.678/0001-90',
        email: 'contato@empresateste.com',
        telefone: '(11) 99999-9999',
        endereco: 'Rua Teste, 123 - São Paulo/SP',
        status: 'ativo',
        data_inicio_assinatura: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    console.log('✅ Empresa de teste criada:', data.id)
    return data.id
  } catch (error) {
    console.error('❌ Erro ao obter/criar empresa:', error)
    return null
  }
}

// Usuários de teste simplificados
const testUsers = [
  {
    email: 'admin@multastrae.com',
    password: 'Admin@123',
    nome: 'Administrador Sistema',
    role: 'admin'
  },
  {
    email: 'operador@multastrae.com',
    password: 'User@123',
    nome: 'João Silva',
    role: 'user'
  },
  {
    email: 'visualizador@multastrae.com',
    password: 'Viewer@123',
    nome: 'Maria Santos',
    role: 'viewer'
  }
]

// Função para criar um usuário
async function createUser(userData: typeof testUsers[0], companyId: string) {
  try {
    // 1. Criar o usuário na autenticação do Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true
    })

    if (authError) {
      throw new Error(`Erro ao criar usuário de autenticação: ${authError.message}`)
    }

    console.log(`✅ Usuário de autenticação criado: ${userData.email}`)

    // 2. Criar o perfil do usuário na tabela users
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          nome: userData.nome,
          role: userData.role,
          company_id: companyId,
          ativo: true,
          ultimo_login: new Date().toISOString()
        })

      if (profileError) {
        throw new Error(`Erro ao criar perfil do usuário: ${profileError.message}`)
      }

      console.log(`✅ Perfil do usuário criado: ${userData.email}`)
    }

    return true
  } catch (error) {
    console.error(`❌ Falha ao criar usuário ${userData.email}:`, error)
    return false
  }
}

// Função principal
async function createAllTestData() {
  console.log('🚀 Iniciando criação de dados de teste...')
  
  // 1. Obter ou criar empresa de teste
  const companyId = await getOrCreateTestCompany()
  if (!companyId) {
    console.error('❌ Não foi possível criar empresa. Abortando.')
    return
  }
  
  // 2. Criar usuários de teste
  for (const user of testUsers) {
    console.log(`👤 Processando usuário: ${user.email}`)
    await createUser(user, companyId)
  }
  
  console.log('\n🎉 Processo finalizado!')
  console.log('\n📋 Usuários criados:')
  testUsers.forEach(user => {
    console.log(`   • ${user.email} (${user.role}) - Senha: ${user.password}`)
  })
}

// Executar o script
createAllTestData()
  .catch(error => {
    console.error('💥 Erro na execução do script:', error)
    process.exit(1)
  })
  .finally(() => {
    console.log('\n✨ Script finalizado.')
    process.exit(0)
  })