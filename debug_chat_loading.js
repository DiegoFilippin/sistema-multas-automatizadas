// Script para debugar o carregamento do histórico do chat
// Este script simula o fluxo de carregamento de um recurso existente

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugChatLoading() {
  console.log('🔍 === DEBUG DO CARREGAMENTO DO HISTÓRICO ===');
  console.log('🌐 Supabase URL:', supabaseUrl);
  console.log('🔑 Supabase Key:', supabaseKey.substring(0, 20) + '...');
  
  try {
    // 1. Verificar se conseguimos conectar ao Supabase
    console.log('\n1. Testando conexão com Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('chat_sessions')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erro de conexão:', testError);
      return;
    }
    console.log('✅ Conexão com Supabase funcionando');
    
    // 2. Verificar se existem companies válidas
    console.log('\n2. Verificando companies existentes...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(5);
    
    if (companiesError) {
      console.error('❌ Erro ao buscar companies:', companiesError);
    } else {
      console.log(`📋 Encontradas ${companies?.length || 0} companies:`);
      companies?.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.name} (${company.id})`);
      });
    }
    
    // 3. Verificar se existem multas
    console.log('\n3. Verificando multas existentes...');
    const { data: multas, error: multasError } = await supabase
      .from('multas')
      .select('id, numero_auto, company_id')
      .limit(5);
    
    if (multasError) {
      console.error('❌ Erro ao buscar multas:', multasError);
    } else {
      console.log(`📋 Encontradas ${multas?.length || 0} multas:`);
      multas?.forEach((multa, index) => {
        console.log(`  ${index + 1}. ${multa.numero_auto} (${multa.id}) - Company: ${multa.company_id}`);
      });
    }
    
    // 4. Criar uma sessão de teste com dados válidos
    if (companies && companies.length > 0 && multas && multas.length > 0) {
      console.log('\n4. Criando sessão de teste com dados válidos...');
      
      const testCompany = companies[0];
      const testMulta = multas[0];
      
      // Buscar ou criar um usuário de teste
      let testUser = null;
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', testCompany.id)
        .limit(1);
      
      if (users && users.length > 0) {
        testUser = users[0];
        console.log('✅ Usuário existente encontrado:', testUser.id);
      } else {
        console.log('ℹ️ Nenhum usuário encontrado para esta company');
        // Usar um UUID genérico para teste
        testUser = { id: '00000000-0000-0000-0000-000000000999' };
      }
      
      const sessionData = {
        session_id: `debug_session_${Date.now()}`,
        webhook_url: 'https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4',
        webhook_payload: { debug: true, timestamp: new Date().toISOString() },
        company_id: testCompany.id,
        user_id: testUser.id,
        multa_id: testMulta.id,
        status: 'active'
      };
      
      console.log('📝 Dados da sessão de teste:', sessionData);
      
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert(sessionData)
        .select()
        .single();
      
      if (sessionError) {
        console.error('❌ Erro ao criar sessão de teste:', sessionError);
      } else {
        console.log('✅ Sessão de teste criada:', newSession.id);
        
        // 5. Criar mensagens de teste
        console.log('\n5. Criando mensagens de teste...');
        const testMessages = [
          {
            chat_session_id: newSession.id,
            message_type: 'user',
            content: 'Olá, preciso de ajuda com minha multa de trânsito.'
          },
          {
            chat_session_id: newSession.id,
            message_type: 'assistant',
            content: 'Olá! Posso ajudá-lo com sua multa de trânsito. Vou analisar os dados e gerar um recurso para você.'
          },
          {
            chat_session_id: newSession.id,
            message_type: 'user',
            content: 'Obrigado! A multa foi por excesso de velocidade.'
          },
          {
            chat_session_id: newSession.id,
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
        } else {
          console.log(`✅ ${messages?.length || 0} mensagens de teste criadas`);
          
          // 6. Simular o fluxo de carregamento do histórico
          console.log('\n6. Simulando carregamento do histórico...');
          
          // Simular busca de sessão por multa_id
          console.log('🔍 Buscando sessões para multa_id:', testMulta.id);
          const { data: foundSessions, error: searchError } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('company_id', testCompany.id)
            .eq('multa_id', testMulta.id)
            .eq('status', 'active');
          
          if (searchError) {
            console.error('❌ Erro na busca de sessões:', searchError);
          } else {
            console.log(`✅ Encontradas ${foundSessions?.length || 0} sessões ativas`);
            
            if (foundSessions && foundSessions.length > 0) {
              const sessionToLoad = foundSessions[0];
              console.log('📋 Sessão a ser carregada:', sessionToLoad.id);
              
              // Simular carregamento de mensagens
              const { data: loadedMessages, error: loadError } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('chat_session_id', sessionToLoad.id)
                .order('created_at', { ascending: true });
              
              if (loadError) {
                console.error('❌ Erro ao carregar mensagens:', loadError);
              } else {
                console.log(`✅ Histórico carregado: ${loadedMessages?.length || 0} mensagens`);
                console.log('\n📨 Mensagens do histórico:');
                loadedMessages?.forEach((msg, index) => {
                  console.log(`  ${index + 1}. [${msg.message_type.toUpperCase()}] ${msg.content}`);
                  console.log(`     Criada em: ${msg.created_at}`);
                });
                
                // 7. Testar conversão para formato do chat
                console.log('\n7. Testando conversão para formato do chat...');
                const chatMessages = loadedMessages?.map(msg => ({
                  id: msg.id,
                  type: msg.message_type === 'user' ? 'user' : 'ai',
                  content: msg.content,
                  timestamp: new Date(msg.created_at)
                }));
                
                console.log('✅ Mensagens convertidas para formato do chat:');
                chatMessages?.forEach((msg, index) => {
                  console.log(`  ${index + 1}. [${msg.type.toUpperCase()}] ${msg.content}`);
                });
              }
            }
          }
        }
      }
    } else {
      console.log('⚠️ Não há dados suficientes (companies/multas) para criar sessão de teste');
    }
    
    // 8. Verificar sessões existentes após os testes
    console.log('\n8. Verificando todas as sessões após os testes...');
    const { data: allSessions, error: allSessionsError } = await supabase
      .from('chat_sessions')
      .select(`
        id,
        session_id,
        multa_id,
        status,
        created_at,
        chat_messages(count)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allSessionsError) {
      console.error('❌ Erro ao buscar todas as sessões:', allSessionsError);
    } else {
      console.log(`📋 Total de sessões no banco: ${allSessions?.length || 0}`);
      allSessions?.forEach((session, index) => {
        console.log(`  ${index + 1}. ${session.session_id} (${session.id})`);
        console.log(`     Multa: ${session.multa_id}`);
        console.log(`     Status: ${session.status}`);
        console.log(`     Criada: ${session.created_at}`);
        console.log('');
      });
    }
    
    console.log('\n✅ Debug concluído!');
    console.log('\n📋 RESUMO DOS PROBLEMAS IDENTIFICADOS:');
    
    if (!companies || companies.length === 0) {
      console.log('❌ Não há companies no banco - isso impede a criação de sessões');
    }
    
    if (!multas || multas.length === 0) {
      console.log('❌ Não há multas no banco - isso impede a associação de sessões');
    }
    
    console.log('\n🔧 SOLUÇÕES RECOMENDADAS:');
    console.log('1. Verificar se o usuário está logado e tem company_id válido');
    console.log('2. Verificar se a multa foi salva corretamente no banco');
    console.log('3. Verificar se as políticas RLS estão permitindo acesso');
    console.log('4. Adicionar logs detalhados no frontend para debug');
    
  } catch (error) {
    console.error('❌ Erro geral no debug:', error);
  }
}

// Executar debug
if (import.meta.url === `file://${process.argv[1]}`) {
  debugChatLoading().catch(console.error);
}

export { debugChatLoading };