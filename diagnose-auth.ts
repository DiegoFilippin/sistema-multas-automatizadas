import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

// Cliente com chave anônima para testes de login
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Cliente com service role (acesso total)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testConnection() {
  console.log('1. Testando conexão com Supabase...');
  
  try {
    const { data, error } = await supabaseClient.from('users').select('count').limit(1);
    
    if (error) {
      console.log('❌ Erro de conexão:', error.message);
    } else {
      console.log('✅ Conexão com Supabase estabelecida com sucesso');
      console.log('📊 Dados retornados:', data);
    }
  } catch (error) {
    console.log('❌ Erro na conexão:', error);
  }
}

async function checkSuperAdminUser() {
  console.log('\n2. Verificando usuário superadmin...');
  
  try {
    // Verificar na tabela public.users
    const { data: publicUser, error: publicError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('email', 'master@sistema.com')
      .single();
    
    if (publicError) {
      console.log('❌ Erro ao buscar na tabela public.users:', publicError.message);
    } else {
      console.log('✅ Usuário encontrado na tabela public.users:', publicUser);
    }
    
    // Para verificar auth.users, usar o service role client
    const { data: authUsers, error: authError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, created_at, email_confirmed_at, is_super_admin')
      .eq('email', 'master@sistema.com')
      .limit(10);
    
    if (authError) {
      console.log('❌ Erro ao buscar na tabela auth.users:', authError.message);
      
      // Tentar listar todos os usuários auth
      const { data: allAuthUsers, error: listError } = await supabaseAdmin
        .from('auth.users')
        .select('id, email, created_at, email_confirmed_at, is_super_admin')
        .limit(10);
      
      if (listError) {
        console.log('❌ Erro ao listar usuários auth:', listError.message);
      } else {
        console.log('📋 Primeiros 10 usuários na tabela auth.users:', allAuthUsers);
        const masterUser = allAuthUsers?.find(u => u.email === 'master@sistema.com');
        if (masterUser) {
          console.log('✅ Usuário master encontrado:', masterUser);
        } else {
          console.log('❌ Usuário master@sistema.com não encontrado na auth.users');
        }
      }
    } else {
      console.log('✅ Usuário encontrado na tabela auth.users:', authUsers);
    }
    
  } catch (error) {
    console.log('❌ Erro geral na verificação do usuário:', error);
  }
}

async function testLogin() {
  console.log('\n3. Testando login programático...');
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: 'master@sistema.com',
      password: 'Master@2024!'
    });
    
    if (error) {
      console.log('❌ Erro no login:', error.message);
    } else {
      console.log('✅ Login realizado com sucesso:', data);
    }
  } catch (error) {
    console.log('❌ Erro no teste de login:', error);
  }
}

async function checkRLSPolicies() {
  console.log('\n4. Verificando políticas RLS...');
  
  try {
    // Verificar se RLS está habilitado na tabela users
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'users');
    
    if (tableError) {
      console.log('❌ Erro ao verificar informações da tabela:', tableError.message);
    } else {
      console.log('📋 Informações da tabela users:', tableInfo);
    }
  } catch (error) {
    console.log('❌ Erro na verificação de políticas:', error);
  }
}

async function diagnoseAuth() {
  console.log('🔍 Iniciando diagnóstico de autenticação...\n');
  
  try {
    console.log('📋 Configurações do Supabase:');
    console.log(`   - URL do Supabase: ${supabaseUrl}`);
    console.log(`   - Anon Key configurada: ${supabaseAnonKey ? 'Sim' : 'Não'}`);
    console.log(`   - Service Role Key configurada: ${supabaseServiceRoleKey ? 'Sim' : 'Não'}`);

  } catch (error) {
    console.log('❌ Erro no diagnóstico:', error);
  }

  await testConnection();
  await checkSuperAdminUser();
  await testLogin();
  await checkRLSPolicies();
  
  console.log('\n✅ Diagnóstico concluído!');
}

// Executar o diagnóstico
diagnoseAuth().catch(console.error);