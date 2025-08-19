import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Teste com um usuário simples primeiro
const testUser = {
  email: 'admin@test.com',
  password: 'Admin@123'
};

async function testRegister() {
  try {
    console.log('🔄 Testando registro simples...');
    
    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password
    });

    if (error) {
      console.error('❌ Erro:', error.message);
      return false;
    }

    console.log('✅ Registro bem-sucedido!');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);
    
    return true;
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
    return false;
  }
}

testRegister();
