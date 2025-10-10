import { createClient } from '@supabase/supabase-js';

// Usar as credenciais do .env
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Usuários de teste simples
const testUsers = [
  {
    email: 'admin@icetran.com.br',
    password: 'Admin@123',
    profile: {
      nome: 'Administrador Teste',
      role: 'admin'
    }
  },
  {
    email: 'operador@icetran.com.br',
    password: 'User@123',
    profile: {
      nome: 'Usuário Teste',
      role: 'user'
    }
  },
  {
    email: 'visualizador@icetran.com.br',
    password: 'Viewer@123',
    profile: {
      nome: 'Visualizador Teste',
      role: 'viewer'
    }
  }
];

async function createUser(userData) {
  try {
    console.log(`🔄 Criando usuário: ${userData.email}`);
    
    // 1. Registrar usuário usando signUp (cria automaticamente na auth)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password
    });

    if (authError) {
      console.error(`❌ Erro na autenticação para ${userData.email}:`, authError.message);
      return false;
    }

    if (!authData.user) {
      console.error(`❌ Usuário não foi criado: ${userData.email}`);
      return false;
    }

    console.log(`✅ Usuário de autenticação criado: ${userData.email}`);
    console.log(`   User ID: ${authData.user.id}`);

    // 2. Aguardar um pouco para garantir que o usuário foi criado
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Criar perfil na tabela users
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: userData.email,
        nome: userData.profile.nome,
        role: userData.profile.role,
        ativo: true,
        ultimo_login: new Date().toISOString()
      });

    if (profileError) {
      console.error(`❌ Erro ao criar perfil para ${userData.email}:`, profileError.message);
      return false;
    }

    console.log(`✅ Perfil criado com sucesso: ${userData.email}`);
    return true;

  } catch (error) {
    console.error(`💥 Erro inesperado para ${userData.email}:`, error.message);
    return false;
  }
}

async function createAllUsers() {
  console.log('🚀 Iniciando criação de usuários funcionais...');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  
  for (const user of testUsers) {
    const success = await createUser(user);
    if (success) {
      successCount++;
    }
    console.log('-'.repeat(30));
  }
  
  console.log('=' .repeat(50));
  console.log(`📊 Resultado: ${successCount}/${testUsers.length} usuários criados com sucesso`);
  
  if (successCount > 0) {
    console.log('\n🎉 Credenciais de acesso:');
    testUsers.forEach(user => {
      console.log(`   ${user.profile.nome}: ${user.email} / ${user.password}`);
    });
  }
}

// Executar
createAllUsers()
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('\n🏁 Script finalizado.');
    process.exit(0);
  });