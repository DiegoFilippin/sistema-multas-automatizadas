import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase com service_role_key
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugUsers() {
  console.log('🔍 Listando todos os usuários da autenticação...');
  
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Erro ao listar usuários:', error);
      return;
    }
    
    console.log(`\n📊 Total de usuários na autenticação: ${data.users.length}`);
    console.log('\n👥 Lista de usuários:');
    
    data.users.forEach((user, index) => {
      console.log(`\n${index + 1}. ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Confirmado: ${user.email_confirmed_at ? 'Sim' : 'Não'}`);
      console.log(`   Criado em: ${user.created_at}`);
    });
    
    // Verificar perfis na tabela users
    console.log('\n\n🗃️  Verificando perfis na tabela users...');
    const { data: profiles, error: profilesError } = await supabase
      .from('users')
      .select('id, email, nome, role');
    
    if (profilesError) {
      console.error('❌ Erro ao buscar perfis:', profilesError);
      return;
    }
    
    console.log(`\n📊 Total de perfis na tabela users: ${profiles.length}`);
    console.log('\n👤 Lista de perfis:');
    
    profiles.forEach((profile, index) => {
      console.log(`\n${index + 1}. ID: ${profile.id}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Nome: ${profile.nome}`);
      console.log(`   Role: ${profile.role}`);
    });
    
    // Verificar incompatibilidades
    console.log('\n\n🔍 Verificando incompatibilidades...');
    
    const authEmails = data.users.map(u => u.email);
    const profileEmails = profiles.map(p => p.email);
    
    const authOnly = authEmails.filter(email => !profileEmails.includes(email));
    const profileOnly = profileEmails.filter(email => !authEmails.includes(email));
    
    if (authOnly.length > 0) {
      console.log('\n⚠️  Usuários apenas na autenticação (sem perfil):');
      authOnly.forEach(email => console.log(`   - ${email}`));
    }
    
    if (profileOnly.length > 0) {
      console.log('\n⚠️  Perfis sem usuário na autenticação:');
      profileOnly.forEach(email => console.log(`   - ${email}`));
    }
    
    if (authOnly.length === 0 && profileOnly.length === 0) {
      console.log('\n✅ Todos os usuários estão sincronizados!');
    }
    
  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

debugUsers()
  .catch(error => {
    console.error('💥 Erro na execução:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('\n🏁 Debug finalizado.');
    process.exit(0);
  });