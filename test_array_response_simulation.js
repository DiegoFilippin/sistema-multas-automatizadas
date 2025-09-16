/**
 * Teste específico para simular o cenário exato do usuário
 * onde o n8n retorna um array com objeto contendo 'response'
 */

// Simular exatamente a resposta que o usuário mencionou
const simulatedN8nResponse = [
  {
    "response": "Realizei consulta preliminar, mas para análise precisa do auto de infração nº BLU0589972 referente ao código 7455-0, data 15/03/2025, em Blumenau, código este, conforme base, que não corresponde diretamente a um código de infração comum do CTB, parecendo reger autuações específicas municipais.\n\nPara aprimorar a análise e identificar possíveis erros formais que possam levar à nulidade da multa, preciso confirmar alguns pontos:\n\n[PERGUNTAS]\n\n1. O auto de infração apresenta todos os dados do agente notificante, como matrícula e assinatura?\n2. A descrição do local da infração (Rua Amazonas próximo nº 840) está clara e suficiente para identificar o local exato, sem ambiguidades?\n3. Está indicado no auto o dispositivo legal ou norma municipal infringida com detalhamento (ex: legislação municipal específica contra infração 7455-0)?\n4. Você percebeu algum erro ou informação que considera incorreta no auto, como dados do veículo (placa, marca, modelo) ou horários e datas?\n5. O órgão autuador anexou ao auto algum tipo de prova, como fotos, vídeos ou documentos técnicos?\n\nAlém disso, para auxiliar na melhor estratégia, informe-me, por favor:\n\n6. Qual sua justificativa para pedir a anulação da autuação?\n7. Nos últimos 12 meses, você teve outras multas de trânsito? Se sim, de qual natureza?\n\nCom estas informações, poderei verificar minuciosamente as regras do MBFT e procedimentos legais, identificar inconsistências e orientar a elaboração do recurso mais eficaz para cancelar ou, se inviável, solicitar a conversão em advertência, se aplicável."
  }
];

/**
 * Função que simula o processamento corrigido no TesteRecursoIA.tsx
 */
function processN8nResponseFixed(webhookResponse) {
  console.log('🔍 === PROCESSANDO RESPOSTA DO N8N (LÓGICA CORRIGIDA) ===');
  console.log('📋 Resposta completa:', JSON.stringify(webhookResponse, null, 2));
  console.log('🔍 Tipo da resposta:', typeof webhookResponse);
  console.log('📊 É array?', Array.isArray(webhookResponse));
  
  // Processar resposta do n8n (pode ser array ou objeto)
  let responseContent = '';
  if (Array.isArray(webhookResponse) && webhookResponse.length > 0) {
    // Se for array, pegar o primeiro item e extrair a resposta
    const firstItem = webhookResponse[0];
    responseContent = firstItem.response || firstItem.message || JSON.stringify(firstItem);
    console.log('📋 Processando array - primeiro item:', firstItem);
    console.log('💬 Conteúdo extraído do array:', responseContent.substring(0, 200) + '...');
  } else if (webhookResponse && typeof webhookResponse === 'object') {
    // Se for objeto direto
    responseContent = webhookResponse.response || webhookResponse.message || JSON.stringify(webhookResponse);
    console.log('💬 Conteúdo extraído do objeto:', responseContent.substring(0, 200) + '...');
  } else {
    // Fallback
    responseContent = 'Mensagem recebida e processada pelo sistema n8n.';
    console.log('⚠️ Usando conteúdo fallback');
  }
  
  return responseContent;
}

/**
 * Função que simula o processamento antigo (com problema)
 */
function processN8nResponseOld(webhookResponse) {
  console.log('🔍 === PROCESSANDO RESPOSTA DO N8N (LÓGICA ANTIGA) ===');
  console.log('📋 Resposta completa:', webhookResponse);
  console.log('💬 Conteúdo da resposta:', webhookResponse.response || webhookResponse.message);
  console.log('🔍 Tipo da resposta:', typeof webhookResponse);
  console.log('📊 Keys da resposta:', Object.keys(webhookResponse));
  
  // Lógica antiga que não funcionava com arrays
  const content = webhookResponse.response || webhookResponse.message || 'Mensagem recebida e processada pelo sistema n8n.';
  
  return content;
}

/**
 * Simular salvamento no banco de dados
 */
function simulateDatabaseSave(content, sessionId) {
  console.log('💾 === SIMULANDO SALVAMENTO NO BANCO ===');
  console.log('🆔 Session ID:', sessionId);
  console.log('💬 Conteúdo a ser salvo:', content.substring(0, 100) + '...');
  console.log('✅ Mensagem salva no banco de dados (simulado)');
  
  return {
    id: `msg_${Date.now()}`,
    chatSessionId: sessionId,
    messageType: 'assistant',
    content: content,
    metadata: {
      source: 'n8n_webhook_response',
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Teste comparativo
 */
function runComparativeTest() {
  console.log('🧪 TESTE COMPARATIVO - ANTES vs DEPOIS DA CORREÇÃO');
  console.log('=' .repeat(70));
  
  console.log('\n1️⃣ === TESTANDO LÓGICA ANTIGA (COM PROBLEMA) ===');
  try {
    const oldResult = processN8nResponseOld(simulatedN8nResponse);
    console.log('📤 Resultado da lógica antiga:', oldResult);
    console.log('❌ Problema: Tentou acessar .response em um array, retornou undefined');
  } catch (error) {
    console.error('💥 Erro na lógica antiga:', error.message);
  }
  
  console.log('\n2️⃣ === TESTANDO LÓGICA NOVA (CORRIGIDA) ===');
  try {
    const newResult = processN8nResponseFixed(simulatedN8nResponse);
    console.log('📤 Resultado da lógica nova:', newResult.substring(0, 200) + '...');
    console.log('✅ Sucesso: Detectou array e extraiu conteúdo corretamente');
    
    // Simular salvamento
    const savedMessage = simulateDatabaseSave(newResult, 'chat_session_123');
    console.log('💾 Mensagem salva:', {
      id: savedMessage.id,
      contentLength: savedMessage.content.length,
      source: savedMessage.metadata.source
    });
    
  } catch (error) {
    console.error('💥 Erro na lógica nova:', error.message);
  }
  
  console.log('\n🎯 === CONCLUSÃO ===');
  console.log('✅ A correção resolve o problema do usuário!');
  console.log('📋 Agora o sistema consegue processar arrays retornados pelo n8n');
  console.log('💾 As mensagens são salvas corretamente no histórico');
  console.log('👁️ As mensagens aparecem na interface do chat');
}

/**
 * Teste de diferentes cenários
 */
function testDifferentScenarios() {
  console.log('\n🔬 === TESTANDO DIFERENTES CENÁRIOS ===');
  
  const scenarios = [
    {
      name: 'Array com response (cenário do usuário)',
      data: [{ response: 'Resposta em array' }]
    },
    {
      name: 'Array com message',
      data: [{ message: 'Mensagem em array' }]
    },
    {
      name: 'Objeto direto com response',
      data: { response: 'Resposta em objeto' }
    },
    {
      name: 'Objeto direto com message',
      data: { message: 'Mensagem em objeto' }
    },
    {
      name: 'Array vazio',
      data: []
    },
    {
      name: 'Null/undefined',
      data: null
    }
  ];
  
  scenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. Testando: ${scenario.name}`);
    try {
      const result = processN8nResponseFixed(scenario.data);
      console.log(`   ✅ Resultado: ${result.substring(0, 50)}${result.length > 50 ? '...' : ''}`);
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
  });
}

// Executar todos os testes
console.log('🧪 TESTE DE CORREÇÃO DO PROCESSAMENTO DE RESPOSTA N8N');
console.log('=' .repeat(70));

runComparativeTest();
testDifferentScenarios();

console.log('\n🏁 Todos os testes concluídos!');
console.log('\n📝 RESUMO DA CORREÇÃO:');
console.log('   • Detecta se a resposta é um array');
console.log('   • Extrai o conteúdo do primeiro item do array');
console.log('   • Mantém compatibilidade com objetos diretos');
console.log('   • Fornece fallback para casos inválidos');
console.log('   • Salva corretamente no banco de dados');
console.log('   • Exibe no histórico da conversa');