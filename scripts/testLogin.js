import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase com anon key (como no frontend)
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Credenciais para testar
const testCredentials = [
  {
    email: 'operador@icetran.com.br',
    password: 'User@123'
  },
  {
    email: 'admin@icetran.com.br',
    password: 'Admin@123'
  }
];

// Função para testar login
async function testLogin(email, password) {
  try {
    console.log(`\n🔐 Testando login: ${email}`);
    
    // 1. Tentar fazer login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (authError) {
      console.log(`❌ Erro de autenticação: ${authError.message}`);
      return { success: false, error: authError.message };
    }
    
    console.log(`✅ Login bem-sucedido! ID: ${authData.user.id}`);
    
    // 2. Verificar se o perfil existe
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, nome, role, company_id')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) {
      console.log(`❌ Erro ao buscar perfil: ${profileError.message}`);
      return { success: false, error: `Perfil não encontrado: ${profileError.message}` };
    }
    
    console.log(`✅ Perfil encontrado:`);
    console.log(`   Nome: ${profile.nome}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Company ID: ${profile.company_id}`);
    
    // 3. Fazer logout
    await supabase.auth.signOut();
    console.log(`🚪 Logout realizado`);
    
    return { success: true, profile };
    
  } catch (error) {
    console.log(`💥 Erro inesperado: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Função principal
async function runLoginTests() {
  console.log('🧪 Iniciando testes de login...');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const credentials of testCredentials) {
    const result = await testLogin(credentials.email, credentials.password);
    
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    console.log('-'.repeat(30));
  }
  
  // Resumo final
  console.log('\n' + '=' .repeat(50));
  console.log('📊 RESUMO DOS TESTES:');
  console.log(`✅ Logins bem-sucedidos: ${successCount}`);
  console.log(`❌ Logins com erro: ${errorCount}`);
  console.log(`📈 Total testado: ${testCredentials.length}`);
  
  if (successCount === testCredentials.length) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('✨ O problema "Invalid login credentials" foi resolvido!');
    console.log('\n🔑 CREDENCIAIS FUNCIONAIS:');
    testCredentials.forEach(cred => {
      console.log(`   • ${cred.email} / ${cred.password}`);
    });
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os erros acima.');
  }
}

// Executar testes
runLoginTests()
  .catch(error => {
    console.error('💥 Erro na execução dos testes:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('\n🏁 Testes finalizados.');
    process.exit(0);
  });