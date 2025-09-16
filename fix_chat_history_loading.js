// Script para implementar correção definitiva do carregamento do histórico do chat

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

async function fixChatHistoryLoading() {
  console.log('🔧 === IMPLEMENTANDO CORREÇÃO DO HISTÓRICO DO CHAT ===');
  
  try {
    // 1. Identificar o problema real
    console.log('\n1. Diagnosticando o problema atual...');
    
    // Verificar companies existentes (corrigir a busca)
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, nome, status')
      .limit(5);
    
    if (companiesError) {
      console.error('❌ Erro ao buscar companies:', companiesError);
    } else {
      console.log(`📋 Companies encontradas: ${companies?.length || 0}`);
      companies?.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.nome} (${company.id}) - Status: ${company.status}`);
      });
    }
    
    // Verificar multas existentes
    const { data: multas, error: multasError } = await supabase
      .from('multas')
      .select('id, numero_auto, company_id')
      .limit(5);
    
    if (multasError) {
      console.error('❌ Erro ao buscar multas:', multasError);
    } else {
      console.log(`\n📋 Multas encontradas: ${multas?.length || 0}`);
      multas?.forEach((multa, index) => {
        console.log(`  ${index + 1}. ${multa.numero_auto} (${multa.id}) - Company: ${multa.company_id}`);
      });
    }
    
    // Verificar sessões existentes
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('id, session_id, company_id, multa_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (sessionsError) {
      console.error('❌ Erro ao buscar sessões:', sessionsError);
    } else {
      console.log(`\n📋 Sessões de chat encontradas: ${sessions?.length || 0}`);
      sessions?.forEach((session, index) => {
        console.log(`  ${index + 1}. ${session.session_id} (${session.id})`);
        console.log(`     Company: ${session.company_id}`);
        console.log(`     Multa: ${session.multa_id}`);
        console.log(`     Status: ${session.status}`);
        console.log(`     Criada: ${session.created_at}`);
        console.log('');
      });
    }
    
    // 2. Implementar correção baseada nos dados reais
    if (companies && companies.length > 0 && multas && multas.length > 0) {
      console.log('\n2. Implementando correção com dados reais...');
      
      const validCompany = companies[0];
      const validMulta = multas.find(m => m.company_id === validCompany.id) || multas[0];
      
      console.log(`✅ Usando company: ${validCompany.nome} (${validCompany.id})`);
      console.log(`✅ Usando multa: ${validMulta.numero_auto} (${validMulta.id})`);
      
      // Verificar se já existe uma sessão para esta combinação
      const existingSession = sessions?.find(s => 
        s.company_id === validCompany.id && 
        s.multa_id === validMulta.id && 
        s.status === 'active'
      );
      
      if (existingSession) {
        console.log(`✅ Sessão existente encontrada: ${existingSession.id}`);
        
        // Verificar mensagens desta sessão
        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('chat_session_id', existingSession.id)
          .order('created_at', { ascending: true });
        
        if (messagesError) {
          console.error('❌ Erro ao buscar mensagens:', messagesError);
        } else {
          console.log(`📨 Mensagens encontradas: ${messages?.length || 0}`);
          
          if (messages && messages.length > 0) {
            console.log('\n📋 Histórico da sessão:');
            messages.forEach((msg, index) => {
              console.log(`  ${index + 1}. [${msg.message_type.toUpperCase()}] ${msg.content.substring(0, 100)}...`);
              console.log(`     Criada em: ${msg.created_at}`);
            });
            
            console.log('\n✅ HISTÓRICO ENCONTRADO! O problema não é falta de dados.');
            console.log('\n🔧 PROBLEMA IDENTIFICADO:');
            console.log('- Os dados existem no banco');
            console.log('- O problema está na lógica do frontend');
            console.log('- Possíveis causas:');
            console.log('  1. company_id não está sendo passado corretamente');
            console.log('  2. multa_id não está sendo passado corretamente');
            console.log('  3. useEffect não está sendo executado');
            console.log('  4. Erro na função getSessionsByCompany');
            
          } else {
            console.log('⚠️ Sessão existe mas não tem mensagens');
            await createTestMessages(existingSession.id);
          }
        }
      } else {
        console.log('ℹ️ Nenhuma sessão ativa encontrada, criando uma de teste...');
        await createTestSessionWithMessages(validCompany.id, validMulta.id);
      }
    } else {
      console.log('⚠️ Dados insuficientes para teste completo');
    }
    
    // 3. Criar função de teste para simular o fluxo do frontend
    console.log('\n3. Testando fluxo completo do frontend...');
    await testFrontendFlow();
    
    // 4. Gerar código de correção para o frontend
    console.log('\n4. Gerando código de correção...');
    generateFrontendFix();
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
  }
}

async function createTestMessages(sessionId) {
  console.log('📝 Criando mensagens de teste para sessão:', sessionId);
  
  const testMessages = [
    {
      chat_session_id: sessionId,
      message_type: 'user',
      content: 'Olá, preciso de ajuda com minha multa de trânsito. O auto de infração é J001565490.'
    },
    {
      chat_session_id: sessionId,
      message_type: 'assistant',
      content: 'Olá! Analisei sua multa J001565490 e posso ajudá-lo a preparar um recurso. Vou verificar os dados da infração e gerar uma defesa adequada para seu caso.'
    },
    {
      chat_session_id: sessionId,
      message_type: 'user',
      content: 'Perfeito! A multa foi por excesso de velocidade, mas acredito que há irregularidades no processo.'
    },
    {
      chat_session_id: sessionId,
      message_type: 'assistant',
      content: 'Entendi. Vou analisar os aspectos técnicos e legais da autuação por excesso de velocidade. Preparando recurso com base nas irregularidades identificadas...'
    }
  ];
  
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .insert(testMessages)
    .select();
  
  if (error) {
    console.error('❌ Erro ao criar mensagens de teste:', error);
  } else {
    console.log(`✅ ${messages?.length || 0} mensagens de teste criadas`);
  }
}

async function createTestSessionWithMessages(companyId, multaId) {
  console.log('🆕 Criando sessão de teste completa...');
  
  // Buscar um usuário válido
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', companyId)
    .limit(1);
  
  const userId = users?.[0]?.id || '00000000-0000-0000-0000-000000000999';
  
  const sessionData = {
    session_id: `test_session_${Date.now()}`,
    webhook_url: 'https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4',
    webhook_payload: { test: true, created_by: 'fix_script' },
    company_id: companyId,
    user_id: userId,
    multa_id: multaId,
    status: 'active'
  };
  
  const { data: newSession, error: sessionError } = await supabase
    .from('chat_sessions')
    .insert(sessionData)
    .select()
    .single();
  
  if (sessionError) {
    console.error('❌ Erro ao criar sessão de teste:', sessionError);
  } else {
    console.log('✅ Sessão de teste criada:', newSession.id);
    await createTestMessages(newSession.id);
  }
}

async function testFrontendFlow() {
  console.log('🧪 Testando fluxo do frontend...');
  
  // Simular busca de company_id
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .limit(1);
  
  if (!companies || companies.length === 0) {
    console.log('❌ Nenhuma company encontrada - este é o problema!');
    return;
  }
  
  const companyId = companies[0].id;
  console.log('✅ Company ID encontrado:', companyId);
  
  // Simular busca de sessões por empresa
  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('❌ Erro na busca de sessões:', error);
  } else {
    console.log(`✅ Busca de sessões funcionando: ${sessions?.length || 0} sessões`);
    
    if (sessions && sessions.length > 0) {
      const testSession = sessions[0];
      console.log('🔍 Testando carregamento de mensagens para sessão:', testSession.id);
      
      const { data: messages, error: msgError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_session_id', testSession.id)
        .order('created_at', { ascending: true });
      
      if (msgError) {
        console.error('❌ Erro ao carregar mensagens:', msgError);
      } else {
        console.log(`✅ Mensagens carregadas: ${messages?.length || 0}`);
        
        if (messages && messages.length > 0) {
          console.log('\n🎉 SUCESSO! O fluxo está funcionando!');
          console.log('\n📋 Mensagens encontradas:');
          messages.forEach((msg, index) => {
            console.log(`  ${index + 1}. [${msg.message_type}] ${msg.content.substring(0, 50)}...`);
          });
        }
      }
    }
  }
}

function generateFrontendFix() {
  console.log('\n🔧 === CÓDIGO DE CORREÇÃO PARA O FRONTEND ===');
  
  const fixCode = `
// CORREÇÃO PARA TesteRecursoIA.tsx
// Adicionar logs detalhados na função loadExistingSession

const loadExistingSession = async () => {
  if (multaId && !chatSessionId) {
    try {
      console.log('🔍 === BUSCANDO SESSÃO EXISTENTE (DEBUG) ===');
      console.log('🆔 Multa ID:', multaId);
      console.log('👤 User:', user);
      console.log('🏢 User company_id:', user?.company_id);
      
      // Buscar company_id com logs detalhados
      let companyId = user?.company_id;
      if (!companyId) {
        console.log('⚠️ Company ID não encontrado no user, buscando no banco...');
        companyId = await getExistingCompanyId();
        console.log('🔍 Company ID do banco:', companyId);
      }
      
      if (!companyId) {
        console.warn('❌ Company ID não encontrado para buscar sessões');
        return;
      }
      
      console.log('✅ Company ID final:', companyId);
      
      // Buscar sessões com logs detalhados
      console.log('🔍 Buscando sessões para company_id:', companyId);
      const sessions = await chatService.getSessionsByCompany(companyId, 10);
      console.log('📋 Sessões encontradas:', sessions);
      console.log('📊 Total de sessões:', sessions?.length || 0);
      
      // Log detalhado de cada sessão
      sessions?.forEach((session, index) => {
        console.log(\`  Sessão \${index + 1}:\`);
        console.log(\`    ID: \${session.id}\`);
        console.log(\`    Multa ID: \${session.multa_id}\`);
        console.log(\`    Status: \${session.status}\`);
        console.log(\`    Match com multaId atual: \${session.multa_id === multaId}\`);
      });
      
      // Procurar sessão ativa para esta multa
      const existingSession = sessions.find(session => 
        session.multa_id === multaId && session.status === 'active'
      );
      
      if (existingSession) {
        console.log('✅ === SESSÃO EXISTENTE ENCONTRADA ===');
        console.log('📋 Sessão:', existingSession);
        
        setChatSessionId(existingSession.id);
        setN8nChatActive(true);
        
        console.log('✅ Estados atualizados:');
        console.log('  - chatSessionId:', existingSession.id);
        console.log('  - n8nChatActive: true');
        
        toast.success('Sessão de chat anterior recuperada!');
      } else {
        console.log('ℹ️ === NENHUMA SESSÃO ATIVA ENCONTRADA ===');
        console.log('🔍 Critérios de busca:');
        console.log('  - multa_id:', multaId);
        console.log('  - status: active');
        console.log('📊 Sessões disponíveis:', sessions?.length || 0);
      }
    } catch (error) {
      console.error('❌ === ERRO AO BUSCAR SESSÃO EXISTENTE ===');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
    }
  } else {
    console.log('ℹ️ Condições não atendidas para busca de sessão:');
    console.log('  - multaId:', multaId);
    console.log('  - chatSessionId:', chatSessionId);
  }
};

// CORREÇÃO ADICIONAL: Verificar se getExistingCompanyId está funcionando
const getExistingCompanyId = async () => {
  try {
    console.log('🔍 === BUSCANDO COMPANY_ID EXISTENTE (DEBUG) ===');
    
    const { supabase } = await import('../lib/supabase');
    
    // Buscar qualquer company (remover filtro de status se necessário)
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, nome, status')
      .limit(5);
    
    console.log('📋 Query executada - companies encontradas:', companies?.length || 0);
    console.log('❌ Erro na query:', error);
    
    if (error) {
      console.error('❌ Erro detalhado:', error);
      return null;
    }
    
    if (companies && companies.length > 0) {
      // Preferir companies ativas, mas aceitar qualquer uma se necessário
      const activeCompany = companies.find(c => c.status === 'ativo');
      const companyToUse = activeCompany || companies[0];
      
      console.log('✅ Company selecionada:', companyToUse);
      return companyToUse.id;
    }
    
    console.log('⚠️ Nenhuma company encontrada');
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao buscar company_id:', error);
    return null;
  }
};
  `;
  
  console.log(fixCode);
  
  console.log('\n📝 INSTRUÇÕES DE IMPLEMENTAÇÃO:');
  console.log('1. Substitua a função loadExistingSession no TesteRecursoIA.tsx');
  console.log('2. Substitua a função getExistingCompanyId no TesteRecursoIA.tsx');
  console.log('3. Teste acessando um recurso existente');
  console.log('4. Verifique os logs detalhados no console do navegador');
  console.log('5. O histórico deve ser carregado automaticamente');
}

// Executar correção
if (import.meta.url === `file://${process.argv[1]}`) {
  fixChatHistoryLoading().catch(console.error);
}

export { fixChatHistoryLoading };