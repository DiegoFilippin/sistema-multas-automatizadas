/**
 * Script para testar e debugar a detecção de recursos '[RECURSO GERADO]'
 * Simula o problema reportado pelo usuário
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Conteúdo da mensagem recebida pelo usuário
const mensagemRecebida = `[RECURSO GERADO]

À
PREFEITURA MUNICIPAL DE BLUMENAU – SETERB
Ref.: Auto de Infração nº BLU0589972
Autuado: DISK CAR LOCACAO DE VEICULOS SA
Veículo: VW/GOL 1.6L MB5 – Placa RDW0H45
Data da Infração: 15/03/2025
Código da Infração: 7455-0

DOS FATOS E FUNDAMENTOS

O presente recurso visa a anulação do Auto de Infração nº BLU0589972, que imputa ao veículo VW/GOL 1.6L MB5, placa RDW0H45, a infração de transitar em velocidade superior à máxima permitida em até 20%, conforme auto lavrado em 15 de março de 2025.

Em análise ao auto de infração e aos normativos do Manual Brasileiro de Fiscalização de Trânsito (MBFT), verifica-se que o documento apresenta falhas que comprometem sua validade jurídica, a saber:

1. Ausência da indicação expressa da velocidade máxima permitida no local da infração e da velocidade aferida pelo equipamento eletrônico, dado essencial para caracterização da infração de trânsito, conforme exigido pela Resolução nº 900/CONTRAN/2022 e pelo MBFT.

2. O auto refere fiscalização por equipamento fixo, mas não comprova a data da última aferição ou validade do equipamento utilizado para medição da velocidade, requisito indispensável para assegurar confiabilidade e regularidade da fiscalização.

3. A descrição do endereço do local da infração é genérica ("Rua Amazonas próximo número 840, Blumenau - Santa Catarina"), o que pode causar ambiguidade na identificação precisa do ponto da infração, dificultando o exercício pleno do direito de defesa.

Esses vícios formalmente qualificáveis violam os princípios constitucionais da legalidade e do devido processo legal (art. 5º, inciso LIV da Constituição Federal), bem como o artigo 281 do Código de Trânsito Brasileiro, que impõe requisitos para a validade do auto de infração.

Diante disso, requer-se o cancelamento do referido auto de infração.

Alternativamente, caso não seja este o entendimento, requer-se a conversão da penalidade em advertência por escrito, considerando a natureza leve da infração e ausência de reincidência do autuado no período legal, em atendimento ao artigo 267 do CTB.

Por fim, reitera-se o compromisso com o cumprimento das normas de trânsito e a preservação dos direitos fundamentais do cidadão.

Termos em que,
Pede deferimento.

Blumenau, 16 de setembro de 2025.

---

Fundamentação Legal:
- Art. 281, Código de Trânsito Brasileiro
- Art. 267, Código de Trânsito Brasileiro
- Resolução nº 900/CONTRAN/2022
- Manual Brasileiro de Fiscalização de Trânsito (MBFT)
- Art. 5º, inciso LIV, Constituição Federal

---

Solicito a gravação deste recurso para acompanhamento dos trâmites processuais.`;

// Função de detecção (copiada do código atual)
function testarDeteccaoRecurso(responseContent) {
  console.log('🔍 === INICIANDO TESTE DE DETECÇÃO DE RECURSO ===');
  console.log('📝 Conteúdo recebido (primeiros 100 chars):', responseContent.substring(0, 100));
  
  // Verificar se a resposta contém um recurso (indicadores comuns)
  const indicadoresRecurso = [
    '[RECURSO GERADO]',
    'RECURSO GERADO',
    '[RECURSO]',
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
  
  const responseUpper = responseContent.toUpperCase();
  const indicadoresEncontrados = indicadoresRecurso.filter(indicador => 
    responseUpper.includes(indicador.toUpperCase())
  );
  
  console.log('🔍 Indicadores encontrados:', indicadoresEncontrados);
  
  const contemRecurso = indicadoresEncontrados.length > 0;
  
  // Verificar se tem estrutura de recurso (mais de 200 caracteres e contém indicadores)
  const isRecurso = contemRecurso && responseContent.length > 200;
  
  console.log('📊 Resultado da detecção:', {
    contemRecurso,
    tamanhoConteudo: responseContent.length,
    isRecurso,
    indicadoresEncontrados
  });
  
  if (isRecurso) {
    console.log('🎯 === RECURSO DETECTADO ===');
    console.log('📝 Conteúdo:', responseContent.substring(0, 200) + '...');
    console.log('🏷️ Indicadores que ativaram a detecção:', indicadoresEncontrados);
    return true;
  } else {
    console.log('ℹ️ === RECURSO NÃO DETECTADO ===');
    console.log('❌ Motivos possíveis:');
    if (!contemRecurso) {
      console.log('  - Nenhum indicador encontrado no conteúdo');
      console.log('  - Indicadores procurados:', indicadoresRecurso);
    }
    if (responseContent.length <= 200) {
      console.log('  - Conteúdo muito curto:', responseContent.length, 'caracteres (mínimo: 200)');
    }
    return false;
  }
}

// Função para verificar recursos salvos no banco
async function verificarRecursosSalvos() {
  try {
    console.log('\n🔍 === VERIFICANDO RECURSOS SALVOS NO BANCO ===');
    
    const { data: recursos, error } = await supabase
      .from('recursos_gerados')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Erro ao buscar recursos:', error);
      return;
    }
    
    console.log('📋 Recursos encontrados:', recursos?.length || 0);
    
    if (recursos && recursos.length > 0) {
      recursos.forEach((recurso, index) => {
        console.log(`\n📄 Recurso ${index + 1}:`);
        console.log('  - ID:', recurso.id);
        console.log('  - Título:', recurso.titulo);
        console.log('  - Tipo:', recurso.tipo_recurso);
        console.log('  - Status:', recurso.status);
        console.log('  - Criado em:', recurso.created_at);
        console.log('  - Conteúdo (100 chars):', recurso.conteudo_recurso?.substring(0, 100) + '...');
        console.log('  - Metadata:', recurso.metadata);
      });
    } else {
      console.log('⚠️ Nenhum recurso encontrado no banco');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar recursos salvos:', error);
  }
}

// Função para verificar sessões de chat ativas
async function verificarSessoesChat() {
  try {
    console.log('\n🔍 === VERIFICANDO SESSÕES DE CHAT ===');
    
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Erro ao buscar sessões:', error);
      return;
    }
    
    console.log('💬 Sessões ativas encontradas:', sessions?.length || 0);
    
    if (sessions && sessions.length > 0) {
      sessions.forEach((session, index) => {
        console.log(`\n💬 Sessão ${index + 1}:`);
        console.log('  - ID:', session.id);
        console.log('  - Company ID:', session.company_id);
        console.log('  - Multa ID:', session.multa_id);
        console.log('  - Status:', session.status);
        console.log('  - Criada em:', session.created_at);
      });
    } else {
      console.log('⚠️ Nenhuma sessão ativa encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar sessões de chat:', error);
  }
}

// Função principal de teste
async function executarTeste() {
  console.log('🚀 === TESTE DE DEBUG DA DETECÇÃO DE RECURSOS ===\n');
  
  try {
    // 1. Testar a detecção com a mensagem recebida
    console.log('1️⃣ Testando detecção com mensagem real do usuário:');
    const detectado = testarDeteccaoRecurso(mensagemRecebida);
    
    if (detectado) {
      console.log('✅ A detecção DEVERIA funcionar com esta mensagem!');
    } else {
      console.log('❌ A detecção NÃO funcionou - há um problema!');
    }
    
    // 2. Verificar recursos salvos no banco
    await verificarRecursosSalvos();
    
    // 3. Verificar sessões de chat ativas
    await verificarSessoesChat();
    
    // 4. Análise detalhada
    console.log('\n🔍 === ANÁLISE DETALHADA ===');
    console.log('📏 Tamanho da mensagem:', mensagemRecebida.length, 'caracteres');
    console.log('🎯 Começa com [RECURSO GERADO]:', mensagemRecebida.startsWith('[RECURSO GERADO]'));
    console.log('📝 Contém indicadores suficientes:', mensagemRecebida.includes('RECURSO') && mensagemRecebida.includes('FUNDAMENTAÇÃO'));
    
    // 5. Possíveis causas do problema
    console.log('\n🔧 === POSSÍVEIS CAUSAS DO PROBLEMA ===');
    console.log('1. A função detectarESalvarRecurso() não está sendo chamada');
    console.log('2. Erro no salvamento no banco de dados (RLS, permissões)');
    console.log('3. Componente RecursosGerados não está atualizando');
    console.log('4. Problema na condição de renderização do componente');
    console.log('5. Erro silencioso não capturado nos logs');
    
    console.log('\n✅ Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
executarTeste();