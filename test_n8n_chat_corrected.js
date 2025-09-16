import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Configuração do Supabase não encontrada!');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey ? 'Definida' : 'Não definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase configurado:', supabaseUrl);

/**
 * Função corrigida para buscar histórico do chat n8n
 * Agora usa session_id = multaId diretamente
 */
async function loadN8nChatHistoryCorrected(multaId) {
  console.log('🔍 === TESTANDO BUSCA CORRIGIDA ===');
  console.log('🆔 Multa ID:', multaId);
  
  try {
    // Buscar mensagens onde session_id = multaId
    console.log('📋 Buscando mensagens por session_id = multaId');
    const { data: messages, error } = await supabase
      .from('n8n_chat_recurso_de_multas')
      .select('*')
      .eq('session_id', multaId)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('❌ Erro na busca de mensagens:', error);
      return { messages: [], sessionId: null };
    }
    
    console.log('📊 Total de mensagens encontradas:', messages?.length || 0);
    
    if (messages && messages.length > 0) {
      console.log('\n📝 === DETALHES DAS MENSAGENS ===');
      
      // Processar cada linha como uma mensagem individual
      const formattedMessages = messages.map((row, index) => {
        const messageData = row.message || {};
        const messageType = messageData.type || 'unknown';
        const messageContent = messageData.content || 'Mensagem sem conteúdo';
        
        console.log(`\n📝 Mensagem ${index + 1}:`);
        console.log(`   ID: ${row.id}`);
        console.log(`   Tipo: ${messageType}`);
        console.log(`   Conteúdo: ${messageContent.substring(0, 200)}${messageContent.length > 200 ? '...' : ''}`);
        console.log(`   ID da linha: ${row.id}`);
        
        return {
          id: row.id || `msg-${index}`,
          content: messageContent,
          sender: messageType === 'human' ? 'user' : 'assistant',
          timestamp: new Date().toISOString() // Usar timestamp atual já que não há created_at
        };
      });
      
      console.log('\n✅ === RESULTADO FINAL ===');
      console.log('📊 Mensagens formatadas:', formattedMessages.length);
      console.log('🆔 Session ID:', multaId);
      
      return {
        messages: formattedMessages,
        sessionId: multaId
      };
    }
    
    console.log('ℹ️ Nenhuma mensagem encontrada para este multaId');
    return { messages: [], sessionId: null };
    
  } catch (error) {
    console.error('❌ Erro ao buscar histórico do chat n8n:', error);
    return { messages: [], sessionId: null };
  }
}

/**
 * Função para listar alguns multaIds disponíveis para teste
 */
async function listAvailableMultaIds() {
  console.log('\n🔍 === LISTANDO MULTAS DISPONÍVEIS ===');
  
  try {
    const { data: multas, error } = await supabase
      .from('multas')
      .select('id, numeroAuto, placa')
      .limit(5)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar multas:', error);
      return [];
    }
    
    if (multas && multas.length > 0) {
      console.log('📋 Multas encontradas:');
      multas.forEach((multa, index) => {
        console.log(`   ${index + 1}. ID: ${multa.id}`);
        console.log(`      Auto: ${multa.numeroAuto}`);
        console.log(`      Placa: ${multa.placa}`);
        console.log('');
      });
      return multas.map(m => m.id);
    }
    
    return [];
  } catch (error) {
    console.error('❌ Erro ao listar multas:', error);
    return [];
  }
}

/**
 * Função para verificar se existem mensagens na tabela n8n_chat_recurso_de_multas
 */
async function checkN8nChatTable() {
  console.log('\n🔍 === VERIFICANDO TABELA N8N_CHAT_RECURSO_DE_MULTAS ===');
  
  try {
    const { data: allMessages, error } = await supabase
      .from('n8n_chat_recurso_de_multas')
      .select('session_id, message')
      .limit(10);
    
    if (error) {
      console.error('❌ Erro ao verificar tabela:', error);
      return;
    }
    
    console.log('📊 Total de mensagens na tabela:', allMessages?.length || 0);
    
    if (allMessages && allMessages.length > 0) {
      console.log('\n📝 Primeiras mensagens:');
      allMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. Session ID: ${msg.session_id}`);
        console.log(`      Tipo: ${msg.message?.type || 'N/A'}`);
        console.log(`      Conteúdo: ${(msg.message?.content || 'N/A').substring(0, 100)}...`);
        console.log('');
      });
      
      // Extrair session_ids únicos
      const uniqueSessionIds = [...new Set(allMessages.map(m => m.session_id))];
      console.log('🆔 Session IDs únicos encontrados:', uniqueSessionIds.length);
      uniqueSessionIds.forEach((sessionId, index) => {
        console.log(`   ${index + 1}. ${sessionId}`);
      });
      
      return uniqueSessionIds;
    }
    
    console.log('ℹ️ Nenhuma mensagem encontrada na tabela');
    return [];
  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error);
    return [];
  }
}

/**
 * Função principal de teste
 */
async function runTest() {
  console.log('🧪 === TESTE DA IMPLEMENTAÇÃO CORRIGIDA ===\n');
  
  // 1. Verificar tabela n8n_chat_recurso_de_multas
  const sessionIds = await checkN8nChatTable();
  
  // 2. Listar multas disponíveis
  const multaIds = await listAvailableMultaIds();
  
  // 3. Testar com session_ids encontrados
  if (sessionIds && sessionIds.length > 0) {
    console.log('\n🧪 === TESTANDO COM SESSION_IDS ENCONTRADOS ===');
    
    for (let i = 0; i < Math.min(3, sessionIds.length); i++) {
      const sessionId = sessionIds[i];
      console.log(`\n--- Teste ${i + 1}: ${sessionId} ---`);
      
      const result = await loadN8nChatHistoryCorrected(sessionId);
      
      if (result.messages.length > 0) {
        console.log('✅ SUCESSO! Mensagens carregadas:', result.messages.length);
        break;
      } else {
        console.log('❌ Nenhuma mensagem encontrada para este session_id');
      }
    }
  }
  
  // 4. Testar com multaIds se não encontrou mensagens
  if (multaIds && multaIds.length > 0) {
    console.log('\n🧪 === TESTANDO COM MULTA_IDS ===');
    
    for (let i = 0; i < Math.min(3, multaIds.length); i++) {
      const multaId = multaIds[i];
      console.log(`\n--- Teste ${i + 1}: ${multaId} ---`);
      
      const result = await loadN8nChatHistoryCorrected(multaId);
      
      if (result.messages.length > 0) {
        console.log('✅ SUCESSO! Mensagens carregadas:', result.messages.length);
        break;
      } else {
        console.log('❌ Nenhuma mensagem encontrada para este multa_id');
      }
    }
  }
  
  console.log('\n🏁 === TESTE CONCLUÍDO ===');
}

// Executar teste
runTest().catch(console.error);