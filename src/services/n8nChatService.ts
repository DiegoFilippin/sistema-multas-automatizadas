import { supabase } from '../lib/supabase';

export interface N8nChatMessage {
  id: number;
  session_id: string;
  message: {
    type: 'human' | 'ai';
    content: string;
    additional_kwargs?: any;
    response_metadata?: any;
    tool_calls?: any[];
    invalid_tool_calls?: any[];
  };
}

export interface ChatHistoryResult {
  messages: Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }>;
  sessionId: string | null;
}

/**
 * Busca o histórico de mensagens do chat n8n usando o multaId
 * @param multaId - ID da multa para buscar as mensagens
 * @returns Histórico de mensagens formatado para o chat
 */
export const loadN8nChatHistory = async (multaId: string): Promise<{ messages: Array<{
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}>, sessionId: string | null }> => {
  try {
    console.log('🔍 === BUSCANDO HISTÓRICO DO CHAT N8N ===');
    console.log('🆔 Multa ID:', multaId);

    let sessionId: string | null = null;
    let messages: any[] | null = null;
    let error: any = null;

    // Estratégia 1: Buscar se existe uma sessão de chat para esta multa
    console.log('🔍 Estratégia 1: Buscando sessão de chat para esta multa...');
    const { data: chatSessions, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('session_id')
      .eq('multa_id', multaId)
      .limit(1);

    if (sessionError) {
      console.error('❌ Erro ao buscar sessão de chat:', sessionError);
    } else if (chatSessions && chatSessions.length > 0) {
      sessionId = chatSessions[0].session_id;
      console.log('✅ Sessão encontrada via chat_sessions:', sessionId);
    }

    // Estratégia 2: Se não encontrou via chat_sessions, tentar buscar diretamente por session_id
    if (!sessionId) {
      console.log('🔍 Estratégia 2: Tentando usar multaId como session_id diretamente...');
      sessionId = multaId;
    }

    // Buscar mensagens usando o session_id
    console.log('📋 Buscando mensagens n8n por session_id:', sessionId);
    const messagesResult = await supabase
      .from('n8n_chat_recurso_de_multas')
      .select('*')
      .eq('session_id', sessionId)
      .order('id', { ascending: true });

    messages = messagesResult.data;
    error = messagesResult.error;
    
    if (error) {
      console.error('❌ Erro na busca de mensagens:', error);
      return { messages: [], sessionId: null };
    }
    
    if (messages && messages.length > 0) {
      console.log('✅ Mensagens encontradas:', messages.length);
      console.log('📊 Primeira mensagem:', messages[0]);
      
      // Processar cada linha como uma mensagem individual
      const formattedMessages = messages.map((row, index) => {
        const messageData = row.message || {};
        const messageType = messageData.type || 'unknown';
        const messageContent = messageData.content || 'Mensagem sem conteúdo';
        
        console.log(`📝 Mensagem ${index + 1}:`, {
          id: row.id,
          type: messageType,
          content: messageContent.substring(0, 100) + '...'
        });
        
        return {
          id: row.id || `msg-${index}`,
          type: messageType === 'human' ? 'user' as const : 'ai' as const,
          content: messageContent,
          timestamp: new Date() // Usar timestamp atual já que não há created_at na tabela
        };
      });
      
      console.log('✅ Mensagens formatadas:', formattedMessages.length);
      return {
        messages: formattedMessages,
        sessionId: sessionId
      };
    }
    
    console.log('ℹ️ Nenhuma mensagem n8n encontrada para esta sessão');
    return { messages: [], sessionId: sessionId };
    
  } catch (error) {
    console.error('❌ Erro ao buscar histórico do chat n8n:', error);
    return { messages: [], sessionId: null };
  }
}

/**
 * Formata mensagens do n8n para o formato esperado pelo chat
 * @param n8nMessages - Mensagens brutas do n8n
 * @returns Mensagens formatadas
 */
function formatN8nMessages(n8nMessages: N8nChatMessage[]): Array<{
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}> {
  return n8nMessages.map((msg, index) => {
    const isUser = msg.message.type === 'human';
    
    return {
      id: `n8n_${msg.id}`,
      type: isUser ? 'user' as const : 'ai' as const,
      content: msg.message.content || '',
      timestamp: new Date() // Usar timestamp atual já que não temos created_at
    };
  });
}

/**
 * Salva uma mensagem no chat n8n
 * @param sessionId - ID da sessão
 * @param messageType - Tipo da mensagem ('human' ou 'ai')
 * @param content - Conteúdo da mensagem
 */
export async function saveN8nMessage(
  sessionId: string,
  messageType: 'human' | 'ai',
  content: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('n8n_chat_recurso_de_multas')
      .insert({
        session_id: sessionId,
        message: {
          type: messageType,
          content: content,
          additional_kwargs: {},
          response_metadata: {}
        }
      });
    
    if (error) {
      console.error('❌ Erro ao salvar mensagem n8n:', error);
      throw error;
    }
    
    console.log('✅ Mensagem n8n salva com sucesso');
  } catch (error) {
    console.error('❌ Erro ao salvar mensagem n8n:', error);
    throw error;
  }
}