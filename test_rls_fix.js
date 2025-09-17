import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

async function testRLSFix() {
  try {
    console.log('🧪 === TESTANDO CORREÇÃO DO ERRO RLS ===');
    
    // 1. Buscar usuário real existente
    console.log('\n👤 Buscando usuário real...');
    const { data: users, error: usersError } = await supabaseService
      .from('users')
      .select('id, email, company_id')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }
    
    const user = users[0];
    console.log('✅ Usuário encontrado:', {
      id: user.id,
      email: user.email,
      company_id: user.company_id
    });
    
    // 2. Fazer login com o usuário (simular autenticação)
    console.log('\n🔐 Simulando autenticação...');
    
    // Para testar RLS, vamos usar o cliente anônimo mas definir a sessão
    // Primeiro, vamos tentar fazer login com um usuário de teste
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: 'diego@despachante.com',
      password: 'Diego@123'
    });
    
    if (authError) {
      console.log('⚠️ Erro no login (esperado se usuário não existe):', authError.message);
      console.log('🔄 Continuando teste com dados simulados...');
    } else {
      console.log('✅ Login realizado com sucesso!');
      console.log('👤 Usuário autenticado:', authData.user?.email);
    }
    
    // 3. Testar inserção com dados reais do usuário
    console.log('\n🧪 Testando inserção com dados reais...');
    
    const testData = {
      company_id: user.company_id,
      user_id: user.id,
      titulo: 'Teste RLS Corrigido',
      conteudo_recurso: 'Este é um teste para verificar se a correção do RLS está funcionando corretamente.',
      tipo_recurso: 'defesa_previa',
      status: 'gerado',
      metadata: {
        source: 'teste_rls_fix',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('📋 Dados de teste:', testData);
    
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
      
      // Se ainda falhar, vamos verificar se é problema de autenticação
      if (insertError.code === '42501') {
        console.log('\n🔍 Ainda temos erro RLS. Verificando sessão...');
        const { data: session } = await supabaseAnon.auth.getSession();
        console.log('📋 Sessão atual:', {
          user: session.session?.user?.email || 'Não autenticado',
          expires_at: session.session?.expires_at
        });
        
        // Tentar com service role para confirmar que os dados estão corretos
        console.log('\n🔧 Testando com service role...');
        const { data: serviceResult, error: serviceError } = await supabaseService
          .from('recursos_gerados')
          .insert(testData)
          .select();
        
        if (serviceError) {
          console.error('❌ Erro mesmo com service role:', serviceError);
        } else {
          console.log('✅ Inserção com service role funcionou:', serviceResult[0]?.id);
          
          // Limpar teste
          await supabaseService
            .from('recursos_gerados')
            .delete()
            .eq('id', serviceResult[0].id);
          console.log('🗑️ Registro de teste removido');
        }
      }
    } else {
      console.log('✅ === CORREÇÃO FUNCIONOU! ===');
      console.log('🎉 Recurso inserido com sucesso:', insertResult[0]?.id);
      
      // Limpar teste
      await supabaseService
        .from('recursos_gerados')
        .delete()
        .eq('id', insertResult[0].id);
      console.log('🗑️ Registro de teste removido');
    }
    
    // 4. Verificar se há políticas RLS que precisam ser ajustadas
    console.log('\n🔍 Verificando necessidade de ajustes nas políticas RLS...');
    
    // Tentar buscar recursos existentes para ver se RLS está funcionando para SELECT
    const { data: existingRecursos, error: selectError } = await supabaseAnon
      .from('recursos_gerados')
      .select('id, titulo, company_id, user_id')
      .limit(3);
    
    if (selectError) {
      console.log('⚠️ Erro ao buscar recursos (pode ser normal se não há dados):', selectError.message);
    } else {
      console.log('✅ Busca de recursos funcionou:', existingRecursos?.length || 0, 'recursos encontrados');
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado no teste:', error);
  }
}

testRLSFix();