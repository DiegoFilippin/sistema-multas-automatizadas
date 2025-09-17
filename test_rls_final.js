import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function testRLSFinal() {
  try {
    console.log('🧪 === TESTE FINAL DA CORREÇÃO RLS ===');
    
    // 1. Criar um usuário de teste com autenticação
    console.log('\n👤 Criando usuário de teste...');
    
    const testEmail = 'teste.rls@example.com';
    const testPassword = 'TesteRLS@123';
    
    // Primeiro, buscar uma company existente
    const { data: companies, error: companiesError } = await supabaseService
      .from('companies')
      .select('id')
      .limit(1);
    
    if (companiesError || !companies || companies.length === 0) {
      console.error('❌ Nenhuma company encontrada:', companiesError);
      return;
    }
    
    const companyId = companies[0].id;
    console.log('✅ Company ID encontrado:', companyId);
    
    // Criar usuário de autenticação
    const { data: authUser, error: authError } = await supabaseService.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    
    if (authError) {
      console.log('⚠️ Erro ao criar usuário auth (pode já existir):', authError.message);
    } else {
      console.log('✅ Usuário auth criado:', authUser.user?.id);
    }
    
    // Buscar ou criar usuário na tabela users
    let userId;
    const { data: existingUser } = await supabaseService
      .from('users')
      .select('id')
      .eq('email', testEmail)
      .single();
    
    if (existingUser) {
      userId = existingUser.id;
      console.log('✅ Usuário existente encontrado:', userId);
    } else {
      // Criar usuário na tabela users
      const { data: newUser, error: userError } = await supabaseService
        .from('users')
        .insert({
          id: authUser?.user?.id || crypto.randomUUID(),
          company_id: companyId,
          email: testEmail,
          nome: 'Usuário Teste RLS',
          role: 'Despachante',
          ativo: true
        })
        .select('id')
        .single();
      
      if (userError) {
        console.error('❌ Erro ao criar usuário na tabela:', userError);
        return;
      }
      
      userId = newUser.id;
      console.log('✅ Usuário criado na tabela:', userId);
    }
    
    // 2. Fazer login com o usuário de teste
    console.log('\n🔐 Fazendo login com usuário de teste...');
    
    const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (loginError) {
      console.error('❌ Erro no login:', loginError);
      return;
    }
    
    console.log('✅ Login realizado com sucesso!');
    console.log('👤 Usuário autenticado:', loginData.user?.email);
    console.log('🆔 Auth UID:', loginData.user?.id);
    
    // 3. Testar inserção com usuário autenticado
    console.log('\n🧪 Testando inserção com usuário autenticado...');
    
    const testData = {
      company_id: companyId,
      user_id: userId,
      titulo: 'Teste RLS Final - Autenticado',
      conteudo_recurso: 'Este teste verifica se a correção RLS funciona com usuário autenticado.',
      tipo_recurso: 'defesa_previa',
      status: 'gerado',
      metadata: {
        source: 'teste_rls_final',
        timestamp: new Date().toISOString(),
        auth_uid: loginData.user?.id
      }
    };
    
    console.log('📋 Dados de teste:', {
      company_id: testData.company_id,
      user_id: testData.user_id,
      titulo: testData.titulo,
      auth_uid: loginData.user?.id
    });
    
    // Tentar inserção com cliente autenticado
    const { data: insertResult, error: insertError } = await supabaseAnon
      .from('recursos_gerados')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.error('❌ Erro na inserção com usuário autenticado:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      
      // Verificar se o problema é de correspondência de IDs
      if (insertError.code === '42501') {
        console.log('\n🔍 Verificando correspondência de IDs...');
        console.log('Auth UID:', loginData.user?.id);
        console.log('User ID na tabela:', userId);
        
        if (loginData.user?.id !== userId) {
          console.log('⚠️ IDs não correspondem! Tentando com auth UID...');
          
          const correctedData = {
            ...testData,
            user_id: loginData.user?.id
          };
          
          const { data: correctedResult, error: correctedError } = await supabaseAnon
            .from('recursos_gerados')
            .insert(correctedData)
            .select();
          
          if (correctedError) {
            console.error('❌ Ainda com erro após correção:', correctedError);
          } else {
            console.log('✅ Sucesso com ID corrigido:', correctedResult[0]?.id);
            
            // Limpar teste
            await supabaseService
              .from('recursos_gerados')
              .delete()
              .eq('id', correctedResult[0].id);
          }
        }
      }
    } else {
      console.log('✅ === CORREÇÃO FUNCIONOU PERFEITAMENTE! ===');
      console.log('🎉 Recurso inserido com sucesso:', insertResult[0]?.id);
      console.log('📊 Dados salvos:', {
        id: insertResult[0]?.id,
        titulo: insertResult[0]?.titulo,
        company_id: insertResult[0]?.company_id,
        user_id: insertResult[0]?.user_id
      });
      
      // Testar busca também
      console.log('\n🔍 Testando busca de recursos...');
      const { data: searchResult, error: searchError } = await supabaseAnon
        .from('recursos_gerados')
        .select('id, titulo, company_id, user_id')
        .eq('id', insertResult[0].id);
      
      if (searchError) {
        console.error('❌ Erro na busca:', searchError);
      } else {
        console.log('✅ Busca funcionou:', searchResult?.length, 'recursos encontrados');
      }
      
      // Limpar teste
      await supabaseService
        .from('recursos_gerados')
        .delete()
        .eq('id', insertResult[0].id);
      console.log('🗑️ Registro de teste removido');
    }
    
    // 4. Fazer logout
    await supabaseAnon.auth.signOut();
    console.log('\n🚪 Logout realizado');
    
    // 5. Limpar usuário de teste (opcional)
    console.log('\n🧹 Limpando usuário de teste...');
    try {
      await supabaseService
        .from('users')
        .delete()
        .eq('email', testEmail);
      
      if (authUser?.user?.id) {
        await supabaseService.auth.admin.deleteUser(authUser.user.id);
      }
      console.log('✅ Usuário de teste removido');
    } catch (cleanupError) {
      console.log('⚠️ Erro na limpeza (não crítico):', cleanupError.message);
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado no teste:', error);
  }
}

testRLSFinal();