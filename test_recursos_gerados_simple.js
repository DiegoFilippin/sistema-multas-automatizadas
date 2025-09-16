/**
 * Teste simplificado do fluxo de recursos gerados
 * Este teste verifica se conseguimos salvar e recuperar recursos usando dados reais do banco
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para buscar dados existentes
async function buscarDadosExistentes() {
  console.log('🔍 === BUSCANDO DADOS EXISTENTES ===');
  
  try {
    // Buscar empresas
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, nome')
      .limit(5);
    
    if (companiesError) {
      console.error('❌ Erro ao buscar empresas:', companiesError);
    } else {
      console.log(`✅ Encontradas ${companies.length} empresas:`);
      companies.forEach(company => {
        console.log(`  - ${company.nome} (${company.id})`);
      });
    }
    
    // Buscar usuários
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, company_id')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
    } else {
      console.log(`\n✅ Encontrados ${users.length} usuários:`);
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.id}) - Company: ${user.company_id}`);
      });
    }
    
    // Buscar multas
    const { data: multas, error: multasError } = await supabase
      .from('multas')
      .select('id, numero_auto, company_id')
      .limit(5);
    
    if (multasError) {
      console.error('❌ Erro ao buscar multas:', multasError);
    } else {
      console.log(`\n✅ Encontradas ${multas.length} multas:`);
      multas.forEach(multa => {
        console.log(`  - ${multa.numero_auto} (${multa.id}) - Company: ${multa.company_id}`);
      });
    }
    
    // Buscar chat sessions
    const { data: chatSessions, error: chatError } = await supabase
      .from('chat_sessions')
      .select('id, multa_id, user_id')
      .limit(5);
    
    if (chatError) {
      console.error('❌ Erro ao buscar chat sessions:', chatError);
    } else {
      console.log(`\n✅ Encontradas ${chatSessions.length} sessões de chat:`);
      chatSessions.forEach(session => {
        console.log(`  - ${session.id} - Multa: ${session.multa_id} - User: ${session.user_id}`);
      });
    }
    
    return {
      companies,
      users,
      multas,
      chatSessions
    };
    
  } catch (error) {
    console.error('❌ Erro inesperado ao buscar dados:', error);
    return null;
  }
}

// Função para testar salvamento com dados reais
async function testarSalvamentoComDadosReais(dadosExistentes) {
  console.log('\n🧪 === TESTE: SALVAMENTO COM DADOS REAIS ===');
  
  if (!dadosExistentes || !dadosExistentes.companies.length || !dadosExistentes.users.length) {
    console.log('❌ Não há dados suficientes para o teste');
    return null;
  }
  
  const company = dadosExistentes.companies[0];
  const user = dadosExistentes.users.find(u => u.company_id === company.id) || dadosExistentes.users[0];
  const multa = dadosExistentes.multas.find(m => m.company_id === company.id) || dadosExistentes.multas[0];
  const chatSession = dadosExistentes.chatSessions.find(c => c.user_id === user.id) || dadosExistentes.chatSessions[0];
  
  console.log('📋 Usando dados:');
  console.log(`  - Company: ${company.nome} (${company.id})`);
  console.log(`  - User: ${user.email} (${user.id})`);
  console.log(`  - Multa: ${multa?.numero_auto || 'N/A'} (${multa?.id || 'N/A'})`);
  console.log(`  - Chat Session: ${chatSession?.id || 'N/A'}`);
  
  const recursoTeste = {
    company_id: company.id,
    user_id: user.id,
    multa_id: multa?.id || null,
    chat_session_id: chatSession?.id || null,
    titulo: 'Recurso de Teste - Fluxo Automatizado',
    conteudo_recurso: `RECURSO DE MULTA DE TRÂNSITO - TESTE

Auto de Infração: TESTE123456
Infração: Teste de funcionalidade
Local: RUA DE TESTE, 123 - CIDADE TESTE
Data: ${new Date().toLocaleDateString('pt-BR')}
Valor: R$ 100,00

EXCELENTÍSSIMO SENHOR DIRETOR DO DEPARTAMENTO DE TRÂNSITO,

Vem respeitosamente à presença de Vossa Excelência, o requerente abaixo qualificado, apresentar RECURSO contra o Auto de Infração de Trânsito acima identificado, pelos motivos que passa a expor:

I - DOS FATOS:

Este é um recurso de teste para verificar o funcionamento do sistema de salvamento de recursos gerados pela IA.

II - DOS ARGUMENTOS:

1. Este é um teste de funcionalidade do sistema.
2. O recurso deve ser salvo corretamente no banco de dados.
3. As políticas RLS devem permitir o acesso adequado.

III - DO DIREITO:

O presente recurso está sendo gerado para fins de teste do sistema automatizado.

IV - DOS PEDIDOS:

Diante do exposto, requer-se:
a) O reconhecimento de que este é um teste;
b) A validação do funcionamento do sistema;
c) O sucesso na operação de salvamento.

Termos em que pede deferimento.

${new Date().toLocaleDateString('pt-BR')}

_________________________
SISTEMA DE TESTE`,
    fundamentacao_legal: 'Código de Trânsito Brasileiro - Artigos de teste',
    argumentos_principais: [
      'Teste de funcionalidade',
      'Validação do sistema',
      'Verificação das políticas RLS'
    ],
    tipo_recurso: 'defesa_previa',
    status: 'gerado',
    metadata: {
      source: 'teste_automatizado',
      detectedAt: new Date().toISOString(),
      test: true,
      version: '1.0'
    }
  };
  
  try {
    console.log('\n💾 Tentando salvar recurso...');
    
    const { data, error } = await supabase
      .from('recursos_gerados')
      .insert(recursoTeste)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao salvar recurso:', error);
      return null;
    }
    
    console.log('✅ Recurso salvo com sucesso!');
    console.log('🆔 ID:', data.id);
    console.log('📋 Título:', data.titulo);
    console.log('📊 Status:', data.status);
    console.log('🕒 Criado em:', data.created_at);
    
    return data;
    
  } catch (error) {
    console.error('❌ Erro inesperado no salvamento:', error);
    return null;
  }
}

// Função para testar recuperação
async function testarRecuperacao(recursoSalvo) {
  console.log('\n🧪 === TESTE: RECUPERAÇÃO DE RECURSOS ===');
  
  if (!recursoSalvo) {
    console.log('❌ Nenhum recurso para recuperar');
    return;
  }
  
  try {
    // Buscar por ID
    console.log('🔍 Buscando recurso por ID...');
    const { data: recursoPorId, error: errorId } = await supabase
      .from('recursos_gerados')
      .select('*')
      .eq('id', recursoSalvo.id)
      .single();
    
    if (errorId) {
      console.error('❌ Erro ao buscar por ID:', errorId);
    } else {
      console.log('✅ Recurso encontrado por ID:', recursoPorId.titulo);
    }
    
    // Buscar por company_id
    console.log('\n🔍 Buscando recursos por company_id...');
    const { data: recursosPorCompany, error: errorCompany } = await supabase
      .from('recursos_gerados')
      .select('*')
      .eq('company_id', recursoSalvo.company_id)
      .eq('metadata->test', true)
      .order('created_at', { ascending: false });
    
    if (errorCompany) {
      console.error('❌ Erro ao buscar por company:', errorCompany);
    } else {
      console.log(`✅ Encontrados ${recursosPorCompany.length} recursos de teste para a empresa`);
    }
    
    // Buscar por multa_id (se existir)
    if (recursoSalvo.multa_id) {
      console.log('\n🔍 Buscando recursos por multa_id...');
      const { data: recursosPorMulta, error: errorMulta } = await supabase
        .from('recursos_gerados')
        .select('*')
        .eq('multa_id', recursoSalvo.multa_id)
        .order('created_at', { ascending: false });
      
      if (errorMulta) {
        console.error('❌ Erro ao buscar por multa:', errorMulta);
      } else {
        console.log(`✅ Encontrados ${recursosPorMulta.length} recursos para a multa`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado na recuperação:', error);
  }
}

// Função para limpar dados de teste
async function limparDadosTeste() {
  console.log('\n🧹 === LIMPEZA: REMOVENDO DADOS DE TESTE ===');
  
  try {
    const { data, error } = await supabase
      .from('recursos_gerados')
      .delete()
      .eq('metadata->test', true)
      .select();
    
    if (error) {
      console.error('❌ Erro ao limpar dados de teste:', error);
    } else {
      console.log(`✅ Removidos ${data.length} recursos de teste`);
    }
  } catch (error) {
    console.error('❌ Erro inesperado na limpeza:', error);
  }
}

// Função principal
async function executarTeste() {
  console.log('🚀 === TESTE SIMPLIFICADO DO FLUXO DE RECURSOS GERADOS ===\n');
  
  try {
    // 1. Buscar dados existentes
    const dadosExistentes = await buscarDadosExistentes();
    
    if (!dadosExistentes) {
      console.log('❌ Não foi possível obter dados existentes');
      return;
    }
    
    // 2. Testar salvamento
    const recursoSalvo = await testarSalvamentoComDadosReais(dadosExistentes);
    
    if (recursoSalvo) {
      // 3. Testar recuperação
      await testarRecuperacao(recursoSalvo);
    }
    
    // 4. Limpar dados de teste
    await limparDadosTeste();
    
    console.log('\n✅ === TESTE CONCLUÍDO ===');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

// Executar teste
executarTeste();