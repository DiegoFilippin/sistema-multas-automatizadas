/**
 * Teste para debug do fluxo de chat n8n
 * Simula o processo de extração → salvamento → início do chat
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Dados de teste simulando uma extração
const dadosExtraidos = {
  numero: '12345678901',
  infracao: 'Excesso de velocidade',
  codigoInfracao: '74550',
  local: 'Rua das Flores, 123',
  data: '15/12/2024',
  valor: 'R$ 195,23',
  veiculo: 'ABC-1234',
  orgaoAutuador: 'DETRAN-SP',
  pontos: '5'
};

const clienteData = {
  nome: 'João da Silva',
  cpf_cnpj: '123.456.789-00',
  endereco: 'Rua das Palmeiras, 456',
  email: 'joao@email.com',
  telefone: '(11) 99999-9999',
  payment_id: 'pay_test_123',
  amount_paid: '50.00',
  multa_type: 'velocidade'
};

async function testarFluxoCompleto() {
  console.log('🧪 === TESTE: FLUXO COMPLETO DE CHAT N8N ===\n');
  
  try {
    // 1. Simular salvamento da multa
    console.log('📝 1. SALVANDO MULTA NO BANCO...');
    const multaSalva = await salvarMultaTeste();
    
    if (!multaSalva) {
      console.error('❌ Falha ao salvar multa - interrompendo teste');
      return;
    }
    
    console.log('✅ Multa salva com ID:', multaSalva.id);
    
    // 2. Simular início do chat n8n
    console.log('\n🚀 2. INICIANDO CHAT N8N...');
    const chatIniciado = await iniciarChatN8n(multaSalva.id);
    
    if (!chatIniciado) {
      console.error('❌ Falha ao iniciar chat n8n');
      return;
    }
    
    console.log('✅ Chat n8n iniciado com sucesso!');
    
    // 3. Verificar se dados foram salvos corretamente
    console.log('\n🔍 3. VERIFICANDO DADOS SALVOS...');
    await verificarDadosSalvos(multaSalva.id, chatIniciado.sessionId);
    
    console.log('\n✅ === TESTE CONCLUÍDO COM SUCESSO ===');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

async function salvarMultaTeste() {
  try {
    // Buscar ou criar company
    let companyId = await getExistingCompanyId();
    if (!companyId) {
      companyId = await createTestCompany();
    }
    
    // Buscar ou criar client
    let clientId = await getExistingClientId();
    if (!clientId) {
      clientId = await createTestClient(companyId);
    }
    
    console.log('🏢 Company ID:', companyId);
    console.log('👤 Client ID:', clientId);
    
    // Preparar dados da multa
    const multaInsert = {
      company_id: companyId,
      client_id: clientId,
      numero_auto: dadosExtraidos.numero,
      placa_veiculo: dadosExtraidos.veiculo,
      data_infracao: '2024-12-15',
      data_vencimento: '2025-01-15',
      valor_original: 195.23,
      valor_final: 195.23,
      codigo_infracao: dadosExtraidos.codigoInfracao,
      local_infracao: dadosExtraidos.local,
      descricao_infracao: dadosExtraidos.infracao,
      orgao_autuador: dadosExtraidos.orgaoAutuador,
      pontos: parseInt(dadosExtraidos.pontos),
      status: 'pendente'
    };
    
    console.log('💾 Dados da multa a serem salvos:', multaInsert);
    
    const { data, error } = await supabase
      .from('multas')
      .insert([multaInsert])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao salvar multa:', error);
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Erro no salvamento da multa:', error);
    return null;
  }
}

async function iniciarChatN8n(multaId) {
  try {
    const mensagemInicial = "Analise o auto de infração e verifique inconsistências conforme regras do MBFT e a justificativa minha justificativa para anular a autuação.";
    
    // Preparar dados para o webhook
    const webhookData = {
      nome_requerente: clienteData.nome,
      cpf_cnpj: clienteData.cpf_cnpj,
      endereco_requerente: clienteData.endereco,
      placa_veiculo: dadosExtraidos.veiculo,
      renavam_veiculo: '',
      numero_auto: dadosExtraidos.numero,
      data_hora_infracao: dadosExtraidos.data,
      local_infracao: dadosExtraidos.local,
      codigo_infracao: dadosExtraidos.codigoInfracao,
      orgao_autuador: dadosExtraidos.orgaoAutuador,
      idmultabancodedados: multaId,
      mensagem_usuario: mensagemInicial
    };
    
    console.log('📤 Dados enviados para webhook:', webhookData);
    
    // Enviar para webhook n8n
    const response = await fetch('https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });
    
    if (!response.ok) {
      console.error('❌ Erro no webhook:', response.status, response.statusText);
      return null;
    }
    
    const webhookResponse = await response.json();
    console.log('📥 Resposta do webhook:', webhookResponse);
    
    // Criar sessão de chat no banco
    const sessionId = `chat_test_${Date.now()}`;
    const chatSession = await criarSessaoChat(sessionId, multaId, webhookData);
    
    if (!chatSession) {
      console.error('❌ Falha ao criar sessão de chat');
      return null;
    }
    
    return {
      sessionId: chatSession.id,
      webhookResponse
    };
    
  } catch (error) {
    console.error('❌ Erro ao iniciar chat n8n:', error);
    return null;
  }
}

async function criarSessaoChat(sessionId, multaId, webhookData) {
  try {
    const companyId = await getExistingCompanyId();
    const userId = await getExistingUserId();
    
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert([{
        session_id: sessionId,
        company_id: companyId,
        user_id: userId,
        multa_id: multaId,
        webhook_url: 'https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4',
        webhook_payload: webhookData,
        status: 'active'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar sessão de chat:', error);
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Erro ao criar sessão de chat:', error);
    return null;
  }
}

async function verificarDadosSalvos(multaId, sessionId) {
  try {
    // Verificar multa
    const { data: multa, error: multaError } = await supabase
      .from('multas')
      .select('*')
      .eq('id', multaId)
      .single();
    
    if (multaError) {
      console.error('❌ Erro ao buscar multa:', multaError);
    } else {
      console.log('✅ Multa encontrada:', {
        id: multa.id,
        numero_auto: multa.numero_auto,
        placa_veiculo: multa.placa_veiculo,
        status: multa.status
      });
    }
    
    // Verificar sessão de chat
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) {
      console.error('❌ Erro ao buscar sessão:', sessionError);
    } else {
      console.log('✅ Sessão encontrada:', {
        id: session.id,
        session_id: session.session_id,
        status: session.status,
        multa_id: session.multa_id
      });
    }
    
    // Verificar mensagens
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_session_id', sessionId);
    
    if (messagesError) {
      console.error('❌ Erro ao buscar mensagens:', messagesError);
    } else {
      console.log('✅ Mensagens encontradas:', messages.length);
      messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg.message_type}: ${msg.content.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }
}

// Funções auxiliares
async function getExistingCompanyId() {
  const { data } = await supabase
    .from('companies')
    .select('id')
    .limit(1)
    .single();
  return data?.id || null;
}

async function getExistingClientId() {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .limit(1)
    .single();
  return data?.id || null;
}

async function getExistingUserId() {
  const { data } = await supabase
    .from('users')
    .select('id')
    .limit(1)
    .single();
  return data?.id || null;
}

async function createTestCompany() {
  const { data, error } = await supabase
    .from('companies')
    .insert([{
      name: 'Empresa Teste Chat',
      email: 'teste@empresa.com',
      phone: '(11) 99999-9999'
    }])
    .select('id')
    .single();
  
  if (error) {
    console.error('❌ Erro ao criar empresa teste:', error);
    return null;
  }
  
  return data.id;
}

async function createTestClient(companyId) {
  const { data, error } = await supabase
    .from('clients')
    .insert([{
      company_id: companyId,
      name: clienteData.nome,
      email: clienteData.email,
      phone: clienteData.telefone,
      cpf_cnpj: clienteData.cpf_cnpj,
      address: clienteData.endereco
    }])
    .select('id')
    .single();
  
  if (error) {
    console.error('❌ Erro ao criar cliente teste:', error);
    return null;
  }
  
  return data.id;
}

// Executar teste
testarFluxoCompleto()
  .then(() => {
    console.log('\n🏁 Teste finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal no teste:', error);
    process.exit(1);
  });

export {
  testarFluxoCompleto,
  salvarMultaTeste,
  iniciarChatN8n
};