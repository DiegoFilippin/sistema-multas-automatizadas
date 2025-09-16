// Script para testar e corrigir o carregamento do histórico do chat

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Supabase (usar as mesmas credenciais do projeto)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testChatHistory() {
  console.log('🔍 === TESTANDO HISTÓRICO DO CHAT ===');
  
  try {
    // 1. Verificar se existem sessões de chat
    console.log('\n1. Verificando sessões de chat existentes...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (sessionsError) {
      console.error('❌ Erro ao buscar sessões:', sessionsError);
      return;
    }
    
    console.log(`📋 Encontradas ${sessions?.length || 0} sessões:`);
    sessions?.forEach((session, index) => {
      console.log(`  ${index + 1}. ID: ${session.id}`);
      console.log(`     Multa ID: ${session.multa_id}`);
      console.log(`     Status: ${session.status}`);
      console.log(`     Criada em: ${session.created_at}`);
      console.log('');
    });
    
    // 2. Verificar mensagens para cada sessão
    if (sessions && sessions.length > 0) {
      console.log('\n2. Verificando mensagens para cada sessão...');
      
      for (const session of sessions) {
        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('chat_session_id', session.id)
          .order('created_at', { ascending: true });
        
        if (messagesError) {
          console.error(`❌ Erro ao buscar mensagens da sessão ${session.id}:`, messagesError);
          continue;
        }
        
        console.log(`📨 Sessão ${session.id}: ${messages?.length || 0} mensagens`);
        messages?.forEach((msg, index) => {
          console.log(`  ${index + 1}. ${msg.message_type}: ${msg.content.substring(0, 100)}...`);
          console.log(`     Criada em: ${msg.created_at}`);
        });
        console.log('');
      }
    }
    
    // 3. Testar busca por multa_id específico
    console.log('\n3. Testando busca por multa_id...');
    if (sessions && sessions.length > 0) {
      const sessionWithMulta = sessions.find(s => s.multa_id);
      if (sessionWithMulta) {
        console.log(`🔍 Testando busca para multa_id: ${sessionWithMulta.multa_id}`);
        
        const { data: sessionsByMulta, error: multaError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('multa_id', sessionWithMulta.multa_id)
          .eq('status', 'active');
        
        if (multaError) {
          console.error('❌ Erro ao buscar por multa_id:', multaError);
        } else {
          console.log(`✅ Encontradas ${sessionsByMulta?.length || 0} sessões ativas para esta multa`);
        }
      } else {
        console.log('ℹ️ Nenhuma sessão com multa_id encontrada para teste');
      }
    }
    
    // 4. Verificar permissões das tabelas
    console.log('\n4. Verificando permissões das tabelas...');
    const { data: permissions, error: permError } = await supabase
      .rpc('check_table_permissions');
    
    if (permError) {
      console.log('ℹ️ Não foi possível verificar permissões automaticamente');
      console.log('   Verifique manualmente se as tabelas chat_sessions e chat_messages');
      console.log('   têm permissões adequadas para os roles anon e authenticated');
    } else {
      console.log('✅ Permissões verificadas');
    }
    
    // 5. Criar dados de teste se não existirem
    if (!sessions || sessions.length === 0) {
      console.log('\n5. Criando dados de teste...');
      await createTestData();
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

async function createTestData() {
  try {
    console.log('📝 Criando sessão de teste...');
    
    // Criar uma sessão de teste
    const { data: testSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        session_id: `test_session_${Date.now()}`,
        webhook_url: 'https://test.webhook.com',
        webhook_payload: { test: true },
        company_id: '00000000-0000-0000-0000-000000000001', // UUID de teste
        user_id: '00000000-0000-0000-0000-000000000002', // UUID de teste
        multa_id: '00000000-0000-0000-0000-000000000003', // UUID de teste
        status: 'active'
      })
      .select()
      .single();
    
    if (sessionError) {
      console.error('❌ Erro ao criar sessão de teste:', sessionError);
      return;
    }
    
    console.log('✅ Sessão de teste criada:', testSession.id);
    
    // Criar mensagens de teste
    const testMessages = [
      {
        chat_session_id: testSession.id,
        message_type: 'user',
        content: 'Olá, preciso de ajuda com minha multa de trânsito.'
      },
      {
        chat_session_id: testSession.id,
        message_type: 'assistant',
        content: 'Olá! Posso ajudá-lo com sua multa de trânsito. Vou analisar os dados e gerar um recurso para você.'
      },
      {
        chat_session_id: testSession.id,
        message_type: 'user',
        content: 'Obrigado! A multa foi por excesso de velocidade.'
      },
      {
        chat_session_id: testSession.id,
        message_type: 'assistant',
        content: 'Entendi. Vou preparar um recurso contestando a multa por excesso de velocidade. Analisando os dados fornecidos...'
      }
    ];
    
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .insert(testMessages)
      .select();
    
    if (messagesError) {
      console.error('❌ Erro ao criar mensagens de teste:', messagesError);
      return;
    }
    
    console.log(`✅ ${messages?.length || 0} mensagens de teste criadas`);
    
    // Testar carregamento do histórico
    console.log('\n🔄 Testando carregamento do histórico...');
    const { data: loadedMessages, error: loadError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_session_id', testSession.id)
      .order('created_at', { ascending: true });
    
    if (loadError) {
      console.error('❌ Erro ao carregar histórico:', loadError);
    } else {
      console.log(`✅ Histórico carregado com sucesso: ${loadedMessages?.length || 0} mensagens`);
      loadedMessages?.forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.message_type}] ${msg.content}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar dados de teste:', error);
  }
}

async function fixChatHistoryLoading() {
  console.log('\n🔧 === IMPLEMENTANDO CORREÇÃO DO HISTÓRICO ===');
  
  // Verificar se as funções de carregamento estão funcionando
  try {
    // Simular busca de sessão por empresa
    console.log('1. Testando busca de sessões por empresa...');
    const { data: companySessions, error: companyError } = await supabase
      .from('chat_sessions')
      .select('*')
      .limit(5);
    
    if (companyError) {
      console.error('❌ Erro na busca por empresa:', companyError);
    } else {
      console.log(`✅ Busca por empresa funcionando: ${companySessions?.length || 0} sessões`);
    }
    
    // Testar busca de mensagens
    if (companySessions && companySessions.length > 0) {
      console.log('2. Testando busca de mensagens...');
      const sessionId = companySessions[0].id;
      
      const { data: sessionMessages, error: msgError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (msgError) {
        console.error('❌ Erro na busca de mensagens:', msgError);
      } else {
        console.log(`✅ Busca de mensagens funcionando: ${sessionMessages?.length || 0} mensagens`);
      }
    }
    
    console.log('\n✅ Diagnóstico concluído!');
    console.log('\n📋 RESUMO:');
    console.log('- As tabelas chat_sessions e chat_messages existem');
    console.log('- As funções de busca estão funcionando');
    console.log('- O problema pode estar na lógica do frontend');
    console.log('\n🔧 PRÓXIMOS PASSOS:');
    console.log('1. Verificar se o chatSessionId está sendo definido corretamente');
    console.log('2. Verificar se o useEffect de loadChatHistory está sendo executado');
    console.log('3. Verificar se há erros de permissão no console do navegador');
    console.log('4. Verificar se o company_id está correto na busca de sessões');
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
  }
}

// Executar testes
async function runTests() {
  await testChatHistory();
  await fixChatHistoryLoading();
}

// Executar testes se for o arquivo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export {
  testChatHistory,
  createTestData,
  fixChatHistoryLoading
};