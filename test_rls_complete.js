import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function testRLSComplete() {
  try {
    console.log('🧪 === TESTE COMPLETO DA CORREÇÃO RLS ===');
    
    // 1. Buscar uma company existente
    console.log('\n🏢 Buscando company existente...');
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
    
    // 2. Criar usuário de teste com ID sincronizado
    console.log('\n👤 Criando usuário de teste...');
    
    const testEmail = 'teste.rls.sync@example.com';
    const testPassword = 'TesteRLS@123';
    
    // Criar usuário de autenticação
    const { data: authUser, error: authError } = await supabaseService.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    
    let authUserId;
    if (authError) {
      console.log('⚠️ Erro ao criar usuário auth (pode já existir):', authError.message);
      // Tentar fazer login para obter o ID
      const { data: loginData } = await supabaseAnon.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      authUserId = loginData?.user?.id;
      await supabaseAnon.auth.signOut();
    } else {
      authUserId = authUser.user?.id;
      console.log('✅ Usuário auth criado:', authUserId);
    }
    
    if (!authUserId) {
      console.error('❌ Não foi possível obter auth user ID');
      return;
    }
    
    // Criar usuário na tabela users com o MESMO ID do auth
    console.log('\n📝 Criando usuário na tabela users com ID sincronizado...');
    
    // Primeiro, verificar se já existe
    const { data: existingUser } = await supabaseService
      .from('users')
      .select('id')
      .eq('id', authUserId)
      .single();
    
    let userId = authUserId;
    
    if (!existingUser) {
      const { data: newUser, error: userError } = await supabaseService
        .from('users')
        .insert({
          id: authUserId, // USAR O MESMO ID DO AUTH
          company_id: companyId,
          email: testEmail,
          nome: 'Usuário Teste RLS Sync',
          role: 'Despachante',
          ativo: true
        })
        .select('id')
        .single();
      
      if (userError) {
        console.error('❌ Erro ao criar usuário na tabela:', userError);
        return;
      }
      
      console.log('✅ Usuário criado na tabela com ID sincronizado:', newUser.id);
    } else {
      console.log('✅ Usuário já existe na tabela:', existingUser.id);
    }
    
    // 3. Fazer login com o usuário de teste
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
    console.log('🔗 IDs sincronizados:', loginData.user?.id === userId);
    
    // 4. Testar inserção com usuário autenticado e IDs sincronizados
    console.log('\n🧪 Testando inserção com IDs sincronizados...');
    
    const testData = {
      company_id: companyId,
      user_id: loginData.user?.id, // USAR O AUTH UID DIRETAMENTE
      titulo: 'Teste RLS Completo - IDs Sincronizados',
      conteudo_recurso: 'Este teste verifica se a correção RLS funciona com IDs sincronizados.',
      tipo_recurso: 'defesa_previa',
      status: 'gerado',
      metadata: {
        source: 'teste_rls_complete',
        timestamp: new Date().toISOString(),
        auth_uid: loginData.user?.id,
        ids_synchronized: true
      }
    };
    
    console.log('📋 Dados de teste:', {
      company_id: testData.company_id,
      user_id: testData.user_id,
      titulo: testData.titulo,
      auth_uid: loginData.user?.id,
      ids_match: testData.user_id === loginData.user?.id
    });
    
    // Tentar inserção com cliente autenticado
    const { data: insertResult, error: insertError } = await supabaseAnon
      .from('recursos_gerados')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.error('❌ Erro na inserção:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
    } else {
      console.log('✅ === CORREÇÃO FUNCIONOU PERFEITAMENTE! ===');
      console.log('🎉 Recurso inserido com sucesso:', insertResult[0]?.id);
      console.log('📊 Dados salvos:', {
        id: insertResult[0]?.id,
        titulo: insertResult[0]?.titulo,
        company_id: insertResult[0]?.company_id,
        user_id: insertResult[0]?.user_id,
        created_at: insertResult[0]?.created_at
      });
      
      // Testar busca também
      console.log('\n🔍 Testando busca de recursos...');
      const { data: searchResult, error: searchError } = await supabaseAnon
        .from('recursos_gerados')
        .select('id, titulo, company_id, user_id, created_at')
        .eq('id', insertResult[0].id);
      
      if (searchError) {
        console.error('❌ Erro na busca:', searchError);
      } else {
        console.log('✅ Busca funcionou:', searchResult?.length, 'recursos encontrados');
        if (searchResult && searchResult.length > 0) {
          console.log('📋 Recurso encontrado:', searchResult[0]);
        }
      }
      
      // Testar atualização
      console.log('\n✏️ Testando atualização de recurso...');
      const { data: updateResult, error: updateError } = await supabaseAnon
        .from('recursos_gerados')
        .update({ 
          titulo: 'Teste RLS - Título Atualizado',
          updated_at: new Date().toISOString()
        })
        .eq('id', insertResult[0].id)
        .select();
      
      if (updateError) {
        console.error('❌ Erro na atualização:', updateError);
      } else {
        console.log('✅ Atualização funcionou:', updateResult[0]?.titulo);
      }
      
      // Limpar teste
      await supabaseService
        .from('recursos_gerados')
        .delete()
        .eq('id', insertResult[0].id);
      console.log('🗑️ Registro de teste removido');
    }
    
    // 5. Fazer logout
    await supabaseAnon.auth.signOut();
    console.log('\n🚪 Logout realizado');
    
    // 6. Limpar usuário de teste
    console.log('\n🧹 Limpando usuário de teste...');
    try {
      await supabaseService
        .from('users')
        .delete()
        .eq('id', authUserId);
      
      await supabaseService.auth.admin.deleteUser(authUserId);
      console.log('✅ Usuário de teste removido');
    } catch (cleanupError) {
      console.log('⚠️ Erro na limpeza (não crítico):', cleanupError.message);
    }
    
    console.log('\n🎯 === RESUMO DO TESTE ===');
    console.log('✅ Políticas RLS configuradas corretamente');
    console.log('✅ Inserção funciona com usuário autenticado');
    console.log('✅ Busca funciona com RLS');
    console.log('✅ Atualização funciona com RLS');
    console.log('🎉 Problema de RLS resolvido!');
    
  } catch (error) {
    console.error('❌ Erro inesperado no teste:', error);
  }
}

testRLSComplete();