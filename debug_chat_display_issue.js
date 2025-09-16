/**
 * Script para debugar por que o chat não está sendo exibido
 * mesmo com o histórico sendo carregado corretamente
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pktmkpkfqgzewqyaelxe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdG1rcGtmcWd6ZXdxeWFlbHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MzY5NzAsImV4cCI6MjA1MDIxMjk3MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

const debugChatDisplayIssue = async () => {
  console.log('🔍 === DEBUG: PROBLEMA DE EXIBIÇÃO DO CHAT ===');
  
  try {
    // 1. Verificar se temos dados na tabela n8n_chat_recurso_de_multas
    console.log('\n1. 📋 Verificando dados na tabela n8n_chat_recurso_de_multas...');
    
    const { data: n8nMessages, error: n8nError } = await supabase
      .from('n8n_chat_recurso_de_multas')
      .select('*')
      .limit(5);
    
    if (n8nError) {
      console.error('❌ Erro ao buscar n8n_chat_recurso_de_multas:', n8nError);
    } else {
      console.log('✅ Dados encontrados na n8n_chat_recurso_de_multas:', n8nMessages?.length || 0);
      if (n8nMessages && n8nMessages.length > 0) {
        console.log('📋 Exemplo de mensagem:', {
          id: n8nMessages[0].id,
          session_id: n8nMessages[0].session_id,
          message_type: n8nMessages[0].message?.type,
          content_preview: n8nMessages[0].message?.content?.substring(0, 100)
        });
      }
    }
    
    // 2. Verificar service_order específico
    console.log('\n2. 🔍 Verificando service_order pay_m81v2ra7o7c9t2hh...');
    
    const { data: serviceOrder, error: serviceError } = await supabase
      .from('service_orders')
      .select('*')
      .eq('asaas_payment_id', 'pay_m81v2ra7o7c9t2hh')
      .single();
    
    if (serviceError) {
      console.error('❌ Erro ao buscar service_order:', serviceError);
    } else {
      console.log('✅ Service_order encontrado:', {
        id: serviceOrder.id,
        asaas_payment_id: serviceOrder.asaas_payment_id,
        multa_id: serviceOrder.multa_id,
        status: serviceOrder.status
      });
      
      // 3. Se temos multa_id, verificar se há mensagens para essa multa
      if (serviceOrder.multa_id) {
        console.log('\n3. 💬 Verificando mensagens para multa_id:', serviceOrder.multa_id);
        
        const { data: multaMessages, error: multaError } = await supabase
          .from('n8n_chat_recurso_de_multas')
          .select('*')
          .eq('session_id', serviceOrder.multa_id)
          .order('created_at', { ascending: true });
        
        if (multaError) {
          console.error('❌ Erro ao buscar mensagens da multa:', multaError);
        } else {
          console.log('✅ Mensagens encontradas para a multa:', multaMessages?.length || 0);
          
          if (multaMessages && multaMessages.length > 0) {
            console.log('📋 Mensagens da conversa:');
            multaMessages.forEach((msg, index) => {
              console.log(`  ${index + 1}. [${msg.message?.type}] ${msg.message?.content?.substring(0, 100)}...`);
            });
            
            // 4. Simular o que deveria acontecer no frontend
            console.log('\n4. 🖥️ Simulando carregamento no frontend...');
            
            const chatMessages = multaMessages.map(msg => ({
              id: msg.id,
              type: msg.message?.type === 'human' ? 'user' : 'ai',
              content: msg.message?.content || '',
              timestamp: new Date(msg.created_at)
            }));
            
            console.log('✅ Mensagens formatadas para o chat:', chatMessages.length);
            console.log('📊 Estados que deveriam ser definidos:');
            console.log('  - n8nChatMessages:', chatMessages.length, 'mensagens');
            console.log('  - n8nChatActive: true');
            console.log('  - chatSessionId:', serviceOrder.multa_id);
            
            // 5. Verificar se há problemas na lógica de renderização
            console.log('\n5. 🔍 Verificando lógica de renderização...');
            
            const n8nChatActive = true; // Deveria ser true após carregar histórico
            const shouldShowChat = n8nChatActive;
            
            console.log('📊 Condições de renderização:');
            console.log('  - n8nChatActive:', n8nChatActive);
            console.log('  - shouldShowChat:', shouldShowChat);
            console.log('  - Mensagens disponíveis:', chatMessages.length > 0);
            
            if (shouldShowChat && chatMessages.length > 0) {
              console.log('✅ CHAT DEVERIA SER EXIBIDO!');
              console.log('🎯 Possíveis problemas:');
              console.log('  1. Estado n8nChatActive não está sendo definido como true');
              console.log('  2. useEffect não está sendo executado');
              console.log('  3. Erro na função loadN8nChatHistory');
              console.log('  4. Problema na renderização condicional');
              console.log('  5. Conflito entre diferentes useEffects');
            } else {
              console.log('❌ Chat não seria exibido - verificar condições');
            }
          } else {
            console.log('ℹ️ Nenhuma mensagem encontrada para esta multa');
          }
        }
      } else {
        console.log('⚠️ Service_order não tem multa_id associado');
      }
    }
    
    // 6. Verificar se há sessões na tabela chat_sessions
    console.log('\n6. 📋 Verificando tabela chat_sessions...');
    
    const { data: chatSessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .limit(5);
    
    if (sessionsError) {
      console.error('❌ Erro ao buscar chat_sessions:', sessionsError);
    } else {
      console.log('✅ Sessões encontradas:', chatSessions?.length || 0);
      if (chatSessions && chatSessions.length > 0) {
        console.log('📋 Exemplo de sessão:', {
          id: chatSessions[0].id,
          session_id: chatSessions[0].session_id,
          multa_id: chatSessions[0].multa_id,
          status: chatSessions[0].status
        });
      }
    }
    
    console.log('\n🎯 === RESUMO DO DEBUG ===');
    console.log('1. Verificar se loadExistingSession está sendo chamado');
    console.log('2. Verificar se loadN8nChatHistory está retornando dados');
    console.log('3. Verificar se setN8nChatActive(true) está sendo executado');
    console.log('4. Verificar se não há conflitos entre useEffects');
    console.log('5. Adicionar logs detalhados no componente TesteRecursoIA');
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }
};

// Executar debug
debugChatDisplayIssue();