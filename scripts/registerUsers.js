import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Usuários de teste
const testUsers = [
  {
    email: 'admin@multastrae.com',
    password: 'Admin@123',
    nome: 'Administrador Sistema',
    company_id: '550e8400-e29b-41d4-a716-446655440001',
    role: 'admin'
  },
  {
    email: 'operador@multastrae.com',
    password: 'User@123',
    nome: 'João Silva',
    company_id: '550e8400-e29b-41d4-a716-446655440001',
    role: 'user'
  },
  {
    email: 'visualizador@multastrae.com',
    password: 'Viewer@123',
    nome: 'Maria Santos',
    company_id: '550e8400-e29b-41d4-a716-446655440001',
    role: 'viewer'
  },
  {
    email: 'gerente@outraempresa.com',
    password: 'Gerente@123',
    nome: 'Carlos Ferreira',
    company_id: '550e8400-e29b-41d4-a716-446655440001',
    role: 'user'
  },
  {
    email: 'cliente@multastrae.com',
    password: 'Cliente@123',
    nome: 'Ana Souza',
    company_id: '550e8400-e29b-41d4-a716-446655440001',
    role: 'user'
  }
];

// Função para registrar um usuário
async function registerUser(userData) {
  try {
    console.log(`🔄 Registrando usuário: ${userData.email}`);
    
    // 1. Registrar no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password
    });

    if (authError) {
      throw new Error(`Erro na autenticação: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Falha no registro - usuário não criado');
    }

    console.log(`   ✅ Usuário de autenticação criado: ${authData.user.id}`);

    // 2. Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Atualizar/inserir perfil na tabela users
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: userData.email,
        nome: userData.nome,
        company_id: userData.company_id,
        role: userData.role,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.warn(`   ⚠️ Aviso no perfil para ${userData.email}:`, profileError.message);
    } else {
      console.log(`   ✅ Perfil criado/atualizado para: ${userData.email}`);
    }

    return true;
  } catch (error) {
    console.error(`   ❌ Erro ao registrar ${userData.email}:`, error.message);
    return false;
  }
}

// Função principal
async function registerAllUsers() {
  console.log('🚀 Iniciando registro de usuários de teste...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of testUsers) {
    const success = await registerUser(user);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Aguardar entre registros
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(''); // Linha em branco
  }
  
  console.log('📊 Resumo Final:');
  console.log(`   ✅ Usuários registrados com sucesso: ${successCount}`);
  console.log(`   ❌ Erros: ${errorCount}`);
  console.log('\n🎉 Processo finalizado!');
  
  if (successCount > 0) {
    console.log('\n📝 Credenciais para teste:');
    testUsers.forEach(user => {
      console.log(`   ${user.email} / ${user.password} (${user.role})`);
    });
  }
}

// Executar o script
registerAllUsers()
  .catch(error => {
    console.error('💥 Erro na execução do script:', error);
    process.exit(1);
  });
