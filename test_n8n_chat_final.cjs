require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase configurado:', supabaseUrl);

// Função corrigida de busca de histórico n8n
const loadN8nChatHistoryCorrected = async (multaId) => {
  try {
    console.log('🔍 === BUSCANDO HISTÓRICO DO CHAT N8N ===');
    console.log('🆔 Multa ID:', multaId);

    // Primeiro, buscar se existe uma sessão de chat para esta multa
    console.log('🔍 Buscando sessão de chat para esta multa...');
    const { data: chatSessions, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('session_id')
      .eq('multa_id', multaId)
      .limit(1);

    if (sessionError) {
      console.error('❌ Erro ao buscar sessão de chat:', sessionError);
      return { messages: [], sessionId: null };
    }

    if (!chatSessions || chatSessions.length === 0) {
      console.log('ℹ️ Nenhuma sessão de chat n8n encontrada para esta multa');
      return { messages: [], sessionId: null };
    }

    const sessionId = chatSessions[0].session_id;
    console.log('✅ Sessão encontrada:', sessionId);

    // Agora buscar mensagens usando o session_id correto
    console.log('📋 Buscando mensagens n8n por session_id...');
    const { data: messages, error } = await supabase
      .from('n8n_chat_recurso_de_multas')
      .select('*')
      .eq('session_id', sessionId)
      .order('id', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar mensagens n8n:', error);
      return { messages: [], sessionId: null };
    }

    if (!messages || messages.length === 0) {
      console.log('ℹ️ Nenhuma mensagem n8n encontrada para esta sessão');
      return { messages: [], sessionId: sessionId };
    }

    console.log(`📊 Total de mensagens encontradas: ${messages.length}`);

    // Processar mensagens
    const formattedMessages = messages
      .map((row, index) => {
        const messageData = row.message;
        const messageType = messageData?.type;
        const messageContent = messageData?.content;

        if (!messageType || !messageContent) {
          console.warn(`⚠️ Mensagem ${row.id} com formato inválido:`, messageData);
          return null;
        }

        console.log(`📝 Processando mensagem ${index + 1}:`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Tipo: ${messageType}`);
        console.log(`   Conteúdo: ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`);

        return {
          id: row.id || `msg-${index}`,
          content: messageContent,
          sender: messageType === 'human' ? 'user' : 'assistant',
          timestamp: new Date().toISOString()
        };
      })
      .filter(Boolean);

    console.log(`✅ Mensagens formatadas: ${formattedMessages.length}`);
    
    return {
      messages: formattedMessages,
      sessionId: sessionId
    };

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    return { messages: [], sessionId: null };
  }
};

const runTest = async () => {
  console.log('🧪 === TESTE DA IMPLEMENTAÇÃO FINAL ===\n');

  // Testar com multa que não tem sessão n8n
  console.log('--- Teste 1: Multa sem sessão n8n ---');
  const multaSemSessao = '83840e05-9941-47ad-8fea-68bde8f07083';
  const resultado1 = await loadN8nChatHistoryCorrected(multaSemSessao);
  console.log('Resultado:', {
    mensagens: resultado1.messages.length,
    sessionId: resultado1.sessionId
  });

  console.log('\n--- Teste 2: Multa com sessão n8n ---');
  const multaComSessao = '13e4e3ef-d955-46da-9ed8-ead9bc25ff16';
  const resultado2 = await loadN8nChatHistoryCorrected(multaComSessao);
  console.log('Resultado:', {
    mensagens: resultado2.messages.length,
    sessionId: resultado2.sessionId
  });

  console.log('\n🏁 === TESTE CONCLUÍDO ===');
};

runTest();