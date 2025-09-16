/**
 * Teste do fluxo completo de salvamento e recuperação de recursos gerados
 * Este script testa a funcionalidade implementada para salvar recursos do n8n
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabase = createClient(supabaseUrl, supabaseKey);

// Dados de teste
const testData = {
  recursoGerado: {
    company_id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: '123e4567-e89b-12d3-a456-426614174001',
    multa_id: '123e4567-e89b-12d3-a456-426614174002',
    chat_session_id: '123e4567-e89b-12d3-a456-426614174003',
    titulo: 'Recurso de Teste - Auto BLU0589972',
    conteudo_recurso: `RECURSO DE MULTA DE TRÂNSITO

Auto de Infração: BLU0589972
Infração: Excesso de velocidade
Local: RUA AMAZONAS PRÓX N° 840, BLUMENAU - SANTA CATARINA
Data: 15/03/2025
Valor: R$ 195,23

EXCELENTÍSSIMO SENHOR DIRETOR DO DEPARTAMENTO DE TRÂNSITO,

Vem respeitosamente à presença de Vossa Excelência, ANA PAULA CARVALHO ZORZZI, abaixo qualificada, apresentar RECURSO contra o Auto de Infração de Trânsito acima identificado, pelos motivos que passa a expor:

I - DOS FATOS:

A recorrente foi autuada pela suposta prática da infração prevista no código 7455-0 do Código de Trânsito Brasileiro. Contudo, conforme será demonstrado, a autuação apresenta vícios que a tornam nula de pleno direito.

II - DOS ARGUMENTOS:

1. O código de infração 7455-0 não corresponde diretamente a um código comum do CTB, parecendo reger autuações específicas municipais.
2. A descrição do local da infração apresenta ambiguidades que comprometem a identificação precisa.
3. Não foram apresentadas provas técnicas suficientes para comprovar a infração.

III - DO DIREITO:

A autuação em questão não observou os requisitos legais estabelecidos no Manual Brasileiro de Fiscalização de Trânsito (MBFT), apresentando vícios que comprometem sua validade.

IV - DOS PEDIDOS:

Diante do exposto, requer-se:
a) O deferimento do presente recurso;
b) A anulação do Auto de Infração nº BLU0589972;
c) O arquivamento definitivo do processo.

Termos em que pede deferimento.

${new Date().toLocaleDateString('pt-BR')}

_________________________
ANA PAULA CARVALHO ZORZZI`,
    fundamentacao_legal: 'Código de Trânsito Brasileiro - Art. 280 e seguintes; Manual Brasileiro de Fiscalização de Trânsito (MBFT)',
    argumentos_principais: [
      'Código de infração 7455-0 não corresponde a código comum do CTB',
      'Descrição do local apresenta ambiguidades',
      'Ausência de provas técnicas suficientes',
      'Não observância dos requisitos do MBFT'
    ],
    tipo_recurso: 'defesa_previa',
    status: 'gerado',
    metadata: {
      source: 'n8n_webhook',
      detectedAt: new Date().toISOString(),
      test: true
    }
  }
};

// Função para testar salvamento de recurso
async function testarSalvamentoRecurso() {
  console.log('🧪 === TESTE: SALVAMENTO DE RECURSO ===');
  
  try {
    const { data, error } = await supabase
      .from('recursos_gerados')
      .insert(testData.recursoGerado)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao salvar recurso de teste:', error);
      return null;
    }
    
    console.log('✅ Recurso de teste salvo com sucesso!');
    console.log('🆔 ID:', data.id);
    console.log('📋 Título:', data.titulo);
    console.log('📊 Status:', data.status);
    
    return data;
  } catch (error) {
    console.error('❌ Erro inesperado no teste de salvamento:', error);
    return null;
  }
}

// Função para testar recuperação de recursos
async function testarRecuperacaoRecursos(multaId, chatSessionId) {
  console.log('🧪 === TESTE: RECUPERAÇÃO DE RECURSOS ===');
  
  try {
    // Testar busca por multa
    if (multaId) {
      console.log('🔍 Buscando recursos por multa ID:', multaId);
      const { data: recursosPorMulta, error: errorMulta } = await supabase
        .from('recursos_gerados')
        .select('*')
        .eq('multa_id', multaId)
        .order('created_at', { ascending: false });
      
      if (errorMulta) {
        console.error('❌ Erro ao buscar por multa:', errorMulta);
      } else {
        console.log(`✅ Encontrados ${recursosPorMulta.length} recursos para a multa`);
      }
    }
    
    // Testar busca por chat session
    if (chatSessionId) {
      console.log('🔍 Buscando recursos por chat session ID:', chatSessionId);
      const { data: recursosPorChat, error: errorChat } = await supabase
        .from('recursos_gerados')
        .select('*')
        .eq('chat_session_id', chatSessionId)
        .order('created_at', { ascending: false });
      
      if (errorChat) {
        console.error('❌ Erro ao buscar por chat:', errorChat);
      } else {
        console.log(`✅ Encontrados ${recursosPorChat.length} recursos para o chat`);
      }
    }
    
    // Testar busca geral
    console.log('🔍 Buscando todos os recursos de teste...');
    const { data: todosRecursos, error: errorTodos } = await supabase
      .from('recursos_gerados')
      .select('*')
      .eq('metadata->test', true)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (errorTodos) {
      console.error('❌ Erro ao buscar todos os recursos:', errorTodos);
    } else {
      console.log(`✅ Encontrados ${todosRecursos.length} recursos de teste no total`);
      todosRecursos.forEach(recurso => {
        console.log(`  - ${recurso.titulo} (${recurso.status}) - ${recurso.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado no teste de recuperação:', error);
  }
}

// Função para testar atualização de status
async function testarAtualizacaoStatus(recursoId) {
  console.log('🧪 === TESTE: ATUALIZAÇÃO DE STATUS ===');
  
  try {
    const novosStatus = ['revisado', 'aprovado', 'protocolado'];
    
    for (const status of novosStatus) {
      console.log(`🔄 Atualizando status para: ${status}`);
      
      const { data, error } = await supabase
        .from('recursos_gerados')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', recursoId)
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Erro ao atualizar para ${status}:`, error);
      } else {
        console.log(`✅ Status atualizado para ${status}`);
      }
      
      // Aguardar um pouco entre as atualizações
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado no teste de atualização:', error);
  }
}

// Função para testar detecção de recursos
function testarDeteccaoRecurso() {
  console.log('🧪 === TESTE: DETECÇÃO DE RECURSOS ===');
  
  const testCases = [
    {
      name: 'Recurso completo',
      content: testData.recursoGerado.conteudo_recurso,
      shouldDetect: true
    },
    {
      name: 'Mensagem simples',
      content: 'Olá, como posso ajudar com sua multa?',
      shouldDetect: false
    },
    {
      name: 'Resposta com RECURSO',
      content: 'Baseado na análise, sugiro apresentar RECURSO contra esta autuação devido às inconsistências encontradas.',
      shouldDetect: false // Muito curto
    },
    {
      name: 'Defesa prévia longa',
      content: `DEFESA PRÉVIA

Excelentíssimo Senhor,

Venho por meio desta apresentar defesa prévia contra o auto de infração, pelos seguintes motivos:

1. Erro na identificação do local
2. Ausência de fundamentação legal adequada
3. Vício na notificação

Requer-se o deferimento da presente defesa e consequente arquivamento do processo.

Respeitosamente,
Defensor`,
      shouldDetect: true
    }
  ];
  
  const indicadoresRecurso = [
    'RECURSO',
    'DEFESA',
    'EXCELENTÍSSIMO',
    'PEDIDO',
    'FUNDAMENTAÇÃO',
    'REQUER',
    'DEFERIMENTO',
    'ANULAÇÃO',
    'AUTO DE INFRAÇÃO'
  ];
  
  testCases.forEach(testCase => {
    console.log(`\n🔍 Testando: ${testCase.name}`);
    
    const contemRecurso = indicadoresRecurso.some(indicador => 
      testCase.content.toUpperCase().includes(indicador)
    );
    
    const isRecurso = contemRecurso && testCase.content.length > 200;
    
    console.log(`  - Contém indicadores: ${contemRecurso}`);
    console.log(`  - Tamanho suficiente: ${testCase.content.length > 200} (${testCase.content.length} chars)`);
    console.log(`  - Detectado como recurso: ${isRecurso}`);
    console.log(`  - Esperado: ${testCase.shouldDetect}`);
    console.log(`  - Resultado: ${isRecurso === testCase.shouldDetect ? '✅ CORRETO' : '❌ INCORRETO'}`);
  });
}

// Função para limpar dados de teste
async function limparDadosTeste() {
  console.log('🧹 === LIMPEZA: REMOVENDO DADOS DE TESTE ===');
  
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

// Função principal de teste
async function executarTestes() {
  console.log('🚀 === INICIANDO TESTES DO FLUXO DE RECURSOS GERADOS ===\n');
  
  try {
    // 1. Testar detecção de recursos
    testarDeteccaoRecurso();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 2. Testar salvamento
    const recursoSalvo = await testarSalvamentoRecurso();
    
    if (recursoSalvo) {
      console.log('\n' + '='.repeat(60) + '\n');
      
      // 3. Testar recuperação
      await testarRecuperacaoRecursos(recursoSalvo.multa_id, recursoSalvo.chat_session_id);
      
      console.log('\n' + '='.repeat(60) + '\n');
      
      // 4. Testar atualização de status
      await testarAtualizacaoStatus(recursoSalvo.id);
      
      console.log('\n' + '='.repeat(60) + '\n');
    }
    
    // 5. Limpar dados de teste
    await limparDadosTeste();
    
    console.log('\n✅ === TODOS OS TESTES CONCLUÍDOS ===');
    
  } catch (error) {
    console.error('❌ Erro geral nos testes:', error);
  }
}

// Executar testes se o arquivo for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executarTestes();
}

export {
  testarSalvamentoRecurso,
  testarRecuperacaoRecursos,
  testarAtualizacaoStatus,
  testarDeteccaoRecurso,
  limparDadosTeste,
  executarTestes
};