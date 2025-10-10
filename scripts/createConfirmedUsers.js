import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase com service_role_key para permissões administrativas
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Usuários de teste com confirmação automática
const testUsers = [
  {
    email: 'admin@test.com',
    password: 'Admin@123',
    profile: {
      nome: 'Administrador Sistema',
      role: 'admin'
    }
  },
  {
    email: 'user@test.com',
    password: 'User@123',
    profile: {
      nome: 'Usuário Padrão',
      role: 'user'
    }
  },
  {
    email: 'viewer@test.com',
    password: 'Viewer@123',
    profile: {
      nome: 'Visualizador',
      role: 'viewer'
    }
  }
];

async function createConfirmedUser(userData) {
  try {
    console.log(`🔄 Criando usuário confirmado: ${userData.email}`);
    
    // 1. Criar usuário com confirmação automática usando admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true // Confirma automaticamente o email
    });

    if (authError) {
      console.error(`❌ Erro na autenticação para ${userData.email}:`, authError.message);
      return false;
    }

    if (!authData.user) {
      console.error(`❌ Usuário não foi criado: ${userData.email}`);
      return false;
    }

    console.log(`✅ Usuário de autenticação criado e confirmado: ${userData.email}`);
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Email confirmado: ${authData.user.email_confirmed_at ? 'Sim' : 'Não'}`);

    // 2. Criar perfil na tabela users
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

async function createAllConfirmedUsers() {
  console.log('🚀 Criando usuários com confirmação automática...');
  console.log('=' .repeat(60));
  
  let successCount = 0;
  
  for (const user of testUsers) {
    const success = await createConfirmedUser(user);
    if (success) {
      successCount++;
    }
    console.log('-'.repeat(40));
  }
  
  console.log('=' .repeat(60));
  console.log(`📊 Resultado: ${successCount}/${testUsers.length} usuários criados com sucesso`);
  
  if (successCount > 0) {
    console.log('\n🎉 Credenciais de acesso (LOGIN IMEDIATO):');
    console.log('=' .repeat(50));
    testUsers.forEach(user => {
      console.log(`👤 ${user.profile.nome}:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔑 Senha: ${user.password}`);
      console.log(`   🏷️  Role: ${user.profile.role}`);
      console.log('');
    });
    console.log('✅ Todos os usuários podem fazer login IMEDIATAMENTE!');
    console.log('🌐 Acesse: http://localhost:5173/login');
  }
}

// Executar
createAllConfirmedUsers()
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('\n🏁 Script finalizado.');
    process.exit(0);
  });