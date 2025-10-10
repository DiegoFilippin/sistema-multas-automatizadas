import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseUsers() {
  console.log('🔍 Diagnóstico de Usuários no Supabase');
  console.log('=' .repeat(50));
  
  try {
    // 1. Verificar usuários na autenticação
    console.log('\n📋 1. Verificando usuários na autenticação...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao buscar usuários de autenticação:', authError.message);
    } else {
      console.log(`✅ Encontrados ${authUsers.users.length} usuários na autenticação:`);
      authUsers.users.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'}`);
        console.log(`      Criado em: ${user.created_at}`);
        console.log('      ---');
      });
    }
    
    // 2. Verificar usuários na tabela users
    console.log('\n📋 2. Verificando usuários na tabela users...');
    const { data: dbUsers, error: dbError } = await supabase
      .from('users')
      .select('*');
    
    if (dbError) {
      console.error('❌ Erro ao buscar usuários da tabela:', dbError.message);
    } else {
      console.log(`✅ Encontrados ${dbUsers.length} usuários na tabela users:`);
      dbUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Nome: ${user.nome}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Ativo: ${user.ativo}`);
        console.log('      ---');
      });
    }
    
    // 3. Verificar correspondência entre auth e tabela users
    console.log('\n🔗 3. Verificando correspondência entre autenticação e tabela...');
    if (authUsers && dbUsers) {
      const authIds = authUsers.users.map(u => u.id);
      const dbIds = dbUsers.map(u => u.id);
      
      console.log('\n📊 Análise de correspondência:');
      console.log(`   Usuários só na autenticação: ${authIds.filter(id => !dbIds.includes(id)).length}`);
      console.log(`   Usuários só na tabela: ${dbIds.filter(id => !authIds.includes(id)).length}`);
      console.log(`   Usuários em ambos: ${authIds.filter(id => dbIds.includes(id)).length}`);
      
      // Mostrar IDs que não correspondem
      const onlyAuth = authIds.filter(id => !dbIds.includes(id));
      const onlyDb = dbIds.filter(id => !authIds.includes(id));
      
      if (onlyAuth.length > 0) {
        console.log('\n⚠️  IDs só na autenticação:');
        onlyAuth.forEach(id => console.log(`   - ${id}`));
      }
      
      if (onlyDb.length > 0) {
        console.log('\n⚠️  IDs só na tabela:');
        onlyDb.forEach(id => console.log(`   - ${id}`));
      }
    }
    
    // 4. Testar login com um usuário específico
    console.log('\n🧪 4. Testando login com admin@test.com...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@test.com',
      password: 'Admin@123'
    });
    
    if (loginError) {
      console.error('❌ Erro no login:', loginError.message);
    } else {
      console.log('✅ Login bem-sucedido!');
      console.log(`   User ID: ${loginData.user.id}`);
      console.log(`   Email: ${loginData.user.email}`);
      
      // Verificar se o perfil existe para este usuário
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', loginData.user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Erro ao buscar perfil:', profileError.message);
      } else {
        console.log('✅ Perfil encontrado:');
        console.log(`   Nome: ${profile.nome}`);
        console.log(`   Role: ${profile.role}`);
      }
    }
    
    // 5. Verificar políticas RLS
    console.log('\n🔒 5. Verificando políticas RLS na tabela users...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql: "SELECT * FROM pg_policies WHERE tablename = 'users'"
      });
    
    if (policiesError) {
      console.error('❌ Erro ao verificar políticas:', policiesError.message);
    } else {
      console.log(`✅ Encontradas ${policies?.length || 0} políticas RLS`);
      if (policies && policies.length > 0) {
        policies.forEach((policy, index) => {
          console.log(`   ${index + 1}. ${policy.policyname}: ${policy.cmd}`);
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Erro inesperado:', error.message);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 Diagnóstico concluído!');
}

// Executar diagnóstico
diagnoseUsers()
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });