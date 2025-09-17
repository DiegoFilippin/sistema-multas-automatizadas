import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function testRLSPolicies() {
  try {
    console.log('🔍 Testando políticas RLS da tabela recursos_gerados...');
    
    // Dados de teste
    const testData = {
      company_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      titulo: 'Teste RLS',
      conteudo_recurso: 'Conteúdo de teste para verificar RLS',
      tipo_recurso: 'defesa_previa'
    };
    
    console.log('\n📋 Dados de teste:', testData);
    
    // Teste 1: Inserção com cliente anônimo (como no frontend)
    console.log('\n🧪 Teste 1: Inserção com cliente anônimo...');
    const { data: anonResult, error: anonError } = await supabaseAnon
      .from('recursos_gerados')
      .insert(testData)
      .select();
    
    if (anonError) {
      console.error('❌ Erro com cliente anônimo:', {
        code: anonError.code,
        message: anonError.message,
        details: anonError.details,
        hint: anonError.hint
      });
    } else {
      console.log('✅ Inserção anônima bem-sucedida:', anonResult[0]?.id);
      
      // Remove o registro de teste
      await supabaseService
        .from('recursos_gerados')
        .delete()
        .eq('id', anonResult[0].id);
    }
    
    // Teste 2: Inserção com service role (bypass RLS)
    console.log('\n🧪 Teste 2: Inserção com service role...');
    const { data: serviceResult, error: serviceError } = await supabaseService
      .from('recursos_gerados')
      .insert(testData)
      .select();
    
    if (serviceError) {
      console.error('❌ Erro com service role:', {
        code: serviceError.code,
        message: serviceError.message,
        details: serviceError.details,
        hint: serviceError.hint
      });
    } else {
      console.log('✅ Inserção com service role bem-sucedida:', serviceResult[0]?.id);
      
      // Remove o registro de teste
      await supabaseService
        .from('recursos_gerados')
        .delete()
        .eq('id', serviceResult[0].id);
      console.log('🗑️  Registro de teste removido');
    }
    
    // Teste 3: Verificar se existe algum usuário autenticado
    console.log('\n🧪 Teste 3: Verificando usuários existentes...');
    const { data: users, error: usersError } = await supabaseService
      .from('users')
      .select('id, email, company_id')
      .limit(3);
    
    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
    } else {
      console.log('👥 Usuários encontrados:', users?.length || 0);
      if (users && users.length > 0) {
        console.log('📋 Primeiro usuário:', {
          id: users[0].id,
          email: users[0].email,
          company_id: users[0].company_id
        });
        
        // Teste 4: Inserção com dados de usuário real
        console.log('\n🧪 Teste 4: Inserção com dados de usuário real...');
        const realUserData = {
          ...testData,
          user_id: users[0].id,
          company_id: users[0].company_id
        };
        
        const { data: realUserResult, error: realUserError } = await supabaseAnon
          .from('recursos_gerados')
          .insert(realUserData)
          .select();
        
        if (realUserError) {
          console.error('❌ Erro com dados de usuário real:', {
            code: realUserError.code,
            message: realUserError.message,
            details: realUserError.details,
            hint: realUserError.hint
          });
        } else {
          console.log('✅ Inserção com usuário real bem-sucedida:', realUserResult[0]?.id);
          
          // Remove o registro de teste
          await supabaseService
            .from('recursos_gerados')
            .delete()
            .eq('id', realUserResult[0].id);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

testRLSPolicies();