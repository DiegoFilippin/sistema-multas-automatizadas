/**
 * Script para verificar se há mensagens para o multaId específico
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pktmkpkfqgzewqyaelxe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdG1rcGtmcWd6ZXdxeWFlbHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MzY5NzAsImV4cCI6MjA1MDIxMjk3MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

const checkSpecificMultaMessages = async () => {
  console.log('🔍 === VERIFICANDO MENSAGENS PARA MULTA ESPECÍFICA ===');
  
  const multaId = '83840e05-9941-47ad-8fea-68bde8f07083';
  console.log('🆔 Multa ID:', multaId);
  
  try {
    // 1. Verificar se há mensagens para este multaId
    console.log('\n1. 📋 Buscando mensagens por session_id...');
    
    const { data: messages, error } = await supabase
      .from('n8n_chat_recurso_de_multas')
      .select('*')
      .eq('session_id', multaId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      return;
    }
    
    console.log('📊 Mensagens encontradas:', messages?.length || 0);
    
    if (messages && messages.length > 0) {
      console.log('✅ MENSAGENS ENCONTRADAS!');
      messages.forEach((msg, index) => {
        console.log(`\n📝 Mensagem ${index + 1}:`);
        console.log('  - ID:', msg.id);
        console.log('  - Session ID:', msg.session_id);
        console.log('  - Tipo:', msg.message?.type);
        console.log('  - Conteúdo:', msg.message?.content?.substring(0, 100) + '...');
        console.log('  - Data:', msg.created_at);
      });
    } else {
      console.log('❌ NENHUMA MENSAGEM ENCONTRADA para este multaId');
      
      // 2. Verificar se há mensagens em geral na tabela
      console.log('\n2. 📋 Verificando se há mensagens em geral na tabela...');
      
      const { data: allMessages, error: allError } = await supabase
        .from('n8n_chat_recurso_de_multas')
        .select('session_id, message')
        .limit(10);
      
      if (allError) {
        console.error('❌ Erro ao buscar todas as mensagens:', allError);
      } else {
        console.log('📊 Total de mensagens na tabela:', allMessages?.length || 0);
        
        if (allMessages && allMessages.length > 0) {
          console.log('\n📋 Exemplos de session_ids disponíveis:');
          const uniqueSessionIds = [...new Set(allMessages.map(m => m.session_id))];
          uniqueSessionIds.forEach((sessionId, index) => {
            console.log(`  ${index + 1}. ${sessionId}`);
          });
          
          // 3. Testar com um session_id que existe
          const testSessionId = uniqueSessionIds[0];
          console.log('\n3. 🧪 Testando com session_id que existe:', testSessionId);
          
          const { data: testMessages, error: testError } = await supabase
            .from('n8n_chat_recurso_de_multas')
            .select('*')
            .eq('session_id', testSessionId)
            .order('created_at', { ascending: true });
          
          if (testError) {
            console.error('❌ Erro no teste:', testError);
          } else {
            console.log('✅ Mensagens do teste:', testMessages?.length || 0);
            
            if (testMessages && testMessages.length > 0) {
              console.log('\n📝 Exemplo de conversa:');
              testMessages.forEach((msg, index) => {
                console.log(`  ${index + 1}. [${msg.message?.type}] ${msg.message?.content?.substring(0, 80)}...`);
              });
              
              console.log('\n🎯 === SOLUÇÃO ===');
              console.log('Para testar o carregamento do histórico, use uma URL como:');
              console.log(`http://localhost:5173/teste-recurso-ia?serviceOrderId=${testSessionId}&nome=TESTE`);
              console.log('\nOu modifique o service_order para apontar para um multaId que tenha mensagens.');
            }
          }
        } else {
          console.log('❌ Tabela n8n_chat_recurso_de_multas está vazia');
        }
      }
    }
    
    // 4. Verificar se o service_order está correto
    console.log('\n4. 🔍 Verificando service_order...');
    
    const { data: serviceOrder, error: serviceError } = await supabase
      .from('service_orders')
      .select('*')
      .eq('asaas_payment_id', 'pay_m81v2ra7o7c9t2hh')
      .single();
    
    if (serviceError) {
      console.error('❌ Erro ao buscar service_order:', serviceError);
    } else {
      console.log('✅ Service_order encontrado:');
      console.log('  - ID:', serviceOrder.id);
      console.log('  - Multa ID:', serviceOrder.multa_id);
      console.log('  - Status:', serviceOrder.status);
      
      if (serviceOrder.multa_id !== multaId) {
        console.log('⚠️ ATENÇÃO: O multa_id do service_order é diferente do esperado!');
        console.log('  - Esperado:', multaId);
        console.log('  - Encontrado:', serviceOrder.multa_id);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
};

// Executar verificação
checkSpecificMultaMessages();