import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Busca o histórico de mensagens do chat n8n usando o multaId
 * @param multaId - ID da multa para buscar as mensagens
 * @returns Histórico de mensagens formatado para o chat
 */
async function loadN8nChatHistory(multaId) {
  console.log('🔍 === BUSCANDO HISTÓRICO DO CHAT N8N ===');
  console.log('🆔 Multa ID:', multaId);
  
  try {
    // Estratégia 1: Buscar por session_id que contenha o multaId
    console.log('📋 Estratégia 1: Buscar por session_id que contenha multaId');
    const { data: messagesBySessionId, error: error1 } = await supabase
      .from('n8n_chat_recurso_de_multas')
      .select('*')
      .ilike('session_id', `%${multaId}%`)
      .order('id', { ascending: true });
    
    if (error1) {
      console.error('❌ Erro na busca por session_id:', error1);
    } else {
      console.log('📊 Mensagens encontradas por session_id:', messagesBySessionId?.length || 0);
      
      if (messagesBySessionId && messagesBySessionId.length > 0) {
        const formattedMessages = formatN8nMessages(messagesBySessionId);
        return {
          messages: formattedMessages,
          sessionId: messagesBySessionId[0].session_id
        };
      }
    }
    
    // Estratégia 2: Buscar todas as mensagens e filtrar por conteúdo que contenha o multaId
    console.log('📋 Estratégia 2: Buscar no conteúdo das mensagens');
    const { data: allMessages, error: error2 } = await supabase
      .from('n8n_chat_recurso_de_multas')
      .select('*')
      .order('id', { ascending: true });
    
    if (error2) {
      console.error('❌ Erro na busca geral:', error2);
      return { messages: [], sessionId: null };
    }
    
    if (allMessages && allMessages.length > 0) {
      // Filtrar mensagens que contenham o multaId no conteúdo
      const messagesWithMultaId = allMessages.filter(msg => {
        const content = JSON.stringify(msg.message || {});
        return content.includes(multaId);
      });
      
      console.log('📊 Mensagens que contêm o multaId:', messagesWithMultaId.length);
      
      if (messagesWithMultaId.length > 0) {
        const formattedMessages = formatN8nMessages(messagesWithMultaId);
        return {
          messages: formattedMessages,
          sessionId: messagesWithMultaId[0].session_id
        };
      }
    }
    
    // Estratégia 3: Buscar na tabela chat_sessions usando multa_id
    console.log('📋 Estratégia 3: Buscar na tabela chat_sessions');
    const { data: chatSessions, error: error3 } = await supabase
      .from('chat_sessions')
      .select('id, session_id')
      .eq('multa_id', multaId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error3) {
      console.error('❌ Erro na busca por chat_sessions:', error3);
    } else if (chatSessions && chatSessions.length > 0) {
      const sessionId = chatSessions[0].session_id;
      console.log('✅ Sessão encontrada na chat_sessions:', sessionId);
      
      // Buscar mensagens usando o session_id encontrado
      const { data: sessionMessages, error: error4 } = await supabase
        .from('n8n_chat_recurso_de_multas')
        .select('*')
        .eq('session_id', sessionId)
        .order('id', { ascending: true });
      
      if (error4) {
        console.error('❌ Erro ao buscar mensagens da sessão:', error4);
      } else if (sessionMessages && sessionMessages.length > 0) {
        const formattedMessages = formatN8nMessages(sessionMessages);
        return {
          messages: formattedMessages,
          sessionId: sessionId
        };
      }
    }
    
    console.log('❌ Nenhuma mensagem encontrada para o multaId:', multaId);
    return { messages: [], sessionId: null };
    
  } catch (error) {
    console.error('❌ Erro geral ao buscar histórico do chat:', error);
    return { messages: [], sessionId: null };
  }
}

/**
 * Formata mensagens do n8n para o formato esperado pelo chat
 * @param n8nMessages - Mensagens brutas do n8n
 * @returns Mensagens formatadas
 */
function formatN8nMessages(n8nMessages) {
  return n8nMessages.map((msg, index) => {
    const isUser = msg.message.type === 'human';
    
    return {
      id: `n8n_${msg.id}`,
      type: isUser ? 'user' : 'ai',
      content: msg.message.content || '',
      timestamp: new Date() // Usar timestamp atual já que não temos created_at
    };
  });
}

async function testN8nChatHistory() {
  console.log('🧪 === TESTANDO CARREGAMENTO DO HISTÓRICO N8N ===');
  
  // Usar o multaId mais recente que encontramos
  const multaId = '83840e05-9941-47ad-8fea-68bde8f07083';
  console.log('🆔 Testando com Multa ID:', multaId);
  
  try {
    const chatHistory = await loadN8nChatHistory(multaId);
    
    console.log('\n📋 === RESULTADO DO TESTE ===');
    console.log('📊 Total de mensagens:', chatHistory.messages.length);
    console.log('🆔 Session ID:', chatHistory.sessionId);
    
    if (chatHistory.messages.length > 0) {
      console.log('\n✅ === HISTÓRICO ENCONTRADO ===');
      
      chatHistory.messages.forEach((msg, index) => {
        console.log(`\n--- Mensagem ${index + 1} ---`);
        console.log('ID:', msg.id);
        console.log('Tipo:', msg.type);
        console.log('Timestamp:', msg.timestamp);
        console.log('Conteúdo (primeiros 100 chars):', msg.content.substring(0, 100) + '...');
      });
      
      console.log('\n🎯 === TESTE CONCLUÍDO COM SUCESSO ===');
      console.log('✅ Função loadN8nChatHistory está funcionando corretamente');
      console.log('✅ Mensagens foram formatadas adequadamente');
      console.log('✅ Session ID foi recuperado');
      
    } else {
      console.log('\n⚠️ === NENHUM HISTÓRICO ENCONTRADO ===');
      console.log('ℹ️ Isso pode significar:');
      console.log('  1. Não há mensagens para este multaId');
      console.log('  2. O multaId não está associado a nenhuma sessão');
      console.log('  3. As mensagens estão em uma estrutura diferente');
      
      // Vamos tentar com outros multaIds
      const otherMultaIds = [
        'da6f049a-9fdf-458b-9104-a692c5195c63',
        '7ad08ba8-cc0b-4856-ac21-07fa5a513e07',
        '9d1387d8-0f41-4c32-bc6c-588fc11aa215'
      ];
      
      console.log('\n🔄 Testando com outros multaIds...');
      
      for (const testMultaId of otherMultaIds) {
        console.log(`\n🔍 Testando com: ${testMultaId}`);
        const testHistory = await loadN8nChatHistory(testMultaId);
        
        if (testHistory.messages.length > 0) {
          console.log(`✅ Histórico encontrado para ${testMultaId}!`);
          console.log(`📊 ${testHistory.messages.length} mensagens`);
          console.log(`🆔 Session ID: ${testHistory.sessionId}`);
          break;
        } else {
          console.log(`❌ Nenhum histórico para ${testMultaId}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ === ERRO NO TESTE ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar teste
testN8nChatHistory();