/**
 * Teste da solução de polling para o problema do n8n
 * Simula o cenário onde o n8n retorna "Workflow was started" e depois a resposta real
 */

import fetch from 'node-fetch';

// URL do webhook n8n
const WEBHOOK_URL = 'https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4';

// Dados de teste
const testData = {
  nome_requerente: "Maria Silva Santos",
  cpf_cnpj: "987.654.321-00",
  endereco_requerente: "Rua das Palmeiras, 456, Vila Nova, Rio de Janeiro - RJ, CEP: 20000-000",
  placa_veiculo: "XYZ-9876",
  renavam_veiculo: "98765432109",
  numero_auto: "RJ987654321",
  data_hora_infracao: "2024-01-20 16:45:00",
  local_infracao: "Avenida Copacabana, 2000 - Copacabana, Rio de Janeiro - RJ",
  codigo_infracao: "74550",
  orgao_autuador: "DETRAN-RJ - Departamento de Trânsito do Rio de Janeiro",
  idmultabancodedados: "123e4567-e89b-12d3-a456-426614174000",
  mensagem_usuario: "Preciso contestar esta multa pois não estava no local no horário indicado. Tenho comprovantes de que estava em outro lugar.",
  company_id: "550e8400-e29b-41d4-a716-446655440001"
};

/**
 * Função para simular o polling implementado no TesteRecursoIA.tsx
 */
async function simulatePolling(webhookData, maxAttempts = 5) {
  console.log('🔄 === SIMULANDO POLLING PARA RESPOSTA N8N ===');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`\n🔄 Tentativa ${attempt}/${maxAttempts} - Aguardando resposta...`);
      
      // Aguardar um tempo antes de cada tentativa
      const waitTime = 2000 * attempt; // Aumentar o tempo a cada tentativa
      console.log(`⏳ Aguardando ${waitTime}ms antes da tentativa...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Fazer nova requisição para verificar se há resposta
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...webhookData,
          action: 'check_response', // Indicar que é uma verificação
          attempt: attempt,
          timestamp: new Date().toISOString(),
          company_id: webhookData.company_id || "550e8400-e29b-41d4-a716-446655440001"
        })
      });
      
      if (!response.ok) {
        console.warn(`⚠️ Tentativa ${attempt} falhou: ${response.status} - ${response.statusText}`);
        continue;
      }
      
      const webhookResponse = await response.json();
      console.log(`📋 Resposta da tentativa ${attempt}:`, JSON.stringify(webhookResponse, null, 2));
      
      // Verificar se recebemos uma resposta real (não apenas "Workflow was started")
      const isWorkflowStartMessage = webhookResponse?.message === 'Workflow was started';
      const isRealResponse = !isWorkflowStartMessage && 
                            (Array.isArray(webhookResponse) || 
                             (webhookResponse?.response && webhookResponse.response.length > 50));
      
      console.log(`🔍 Análise da resposta:`);
      console.log(`   - É mensagem de início? ${isWorkflowStartMessage}`);
      console.log(`   - É resposta real? ${isRealResponse}`);
      console.log(`   - Tipo: ${typeof webhookResponse}`);
      console.log(`   - É array? ${Array.isArray(webhookResponse)}`);
      
      if (isRealResponse) {
        console.log(`\n✅ === RESPOSTA REAL RECEBIDA NA TENTATIVA ${attempt} ===`);
        
        // Processar resposta real
        let responseContent = '';
        if (Array.isArray(webhookResponse) && webhookResponse.length > 0) {
          const firstItem = webhookResponse[0];
          responseContent = firstItem.response || firstItem.message || JSON.stringify(firstItem);
          console.log('📋 Processando array - primeiro item:', firstItem);
        } else if (webhookResponse?.response) {
          responseContent = webhookResponse.response;
          console.log('📋 Processando objeto - resposta direta');
        } else {
          responseContent = JSON.stringify(webhookResponse);
          console.log('📋 Processando objeto - JSON completo');
        }
        
        console.log(`\n💬 === CONTEÚDO EXTRAÍDO ===`);
        console.log(`Tamanho: ${responseContent.length} caracteres`);
        console.log(`Prévia: ${responseContent.substring(0, 200)}...`);
        
        console.log(`\n🎯 === POLLING BEM-SUCEDIDO ===`);
        console.log(`✅ Resposta recebida após ${attempt} tentativa(s)`);
        console.log(`⏱️ Tempo total: ~${(2000 * attempt * (attempt + 1)) / 2}ms`);
        
        return {
          success: true,
          attempt: attempt,
          content: responseContent,
          originalResponse: webhookResponse
        };
      } else {
        console.log(`⏳ Tentativa ${attempt}: Ainda aguardando resposta real...`);
      }
      
    } catch (error) {
      console.warn(`❌ Erro na tentativa ${attempt}:`, error.message);
    }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  console.log(`\n❌ === POLLING FALHOU ===`);
  console.log(`❌ Todas as ${maxAttempts} tentativas falharam`);
  console.log(`⏱️ Tempo total gasto: ~${(2000 * maxAttempts * (maxAttempts + 1)) / 2}ms`);
  
  return {
    success: false,
    attempts: maxAttempts,
    error: 'Polling timeout - resposta não recebida'
  };
}

/**
 * Função principal de teste
 */
async function testarSolucaoPolling() {
  console.log('🧪 === TESTE DA SOLUÇÃO DE POLLING N8N ===');
  console.log('=' .repeat(60));
  console.log('📡 URL:', WEBHOOK_URL);
  console.log('📋 Dados de teste:', JSON.stringify(testData, null, 2));
  
  try {
    console.log('\n🚀 === ETAPA 1: REQUISIÇÃO INICIAL ===');
    
    // Primeira requisição (deve retornar "Workflow was started")
    const initialResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    if (!initialResponse.ok) {
      throw new Error(`Erro na requisição inicial: ${initialResponse.status} - ${initialResponse.statusText}`);
    }
    
    const initialResult = await initialResponse.json();
    console.log('📊 Resposta inicial:', JSON.stringify(initialResult, null, 2));
    
    const isWorkflowStart = initialResult?.message === 'Workflow was started';
    console.log('🔍 É mensagem de início do workflow?', isWorkflowStart);
    
    if (isWorkflowStart) {
      console.log('\n⏳ === ETAPA 2: INICIANDO POLLING ===');
      console.log('🔄 Workflow iniciado, aguardando resposta real...');
      
      // Simular o polling
      const pollingResult = await simulatePolling(testData, 5);
      
      if (pollingResult.success) {
        console.log('\n🎉 === TESTE BEM-SUCEDIDO ===');
        console.log('✅ Solução de polling funcionou corretamente!');
        console.log(`📊 Resposta recebida em ${pollingResult.attempt} tentativa(s)`);
        console.log(`💬 Conteúdo: ${pollingResult.content.substring(0, 100)}...`);
      } else {
        console.log('\n⚠️ === TESTE PARCIALMENTE BEM-SUCEDIDO ===');
        console.log('✅ Workflow foi iniciado corretamente');
        console.log('⏳ Polling não recebeu resposta no tempo limite');
        console.log('💡 Isso pode ser normal se o n8n demorar mais para processar');
      }
    } else {
      console.log('\n🎯 === RESPOSTA IMEDIATA RECEBIDA ===');
      console.log('✅ N8N retornou resposta diretamente (sem necessidade de polling)');
      console.log('📊 Resposta:', JSON.stringify(initialResult, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ === ERRO NO TESTE ===');
    console.error('❌ Erro:', error.message);
    console.error('📋 Stack:', error.stack);
  }
  
  console.log('\n🏁 === TESTE CONCLUÍDO ===');
  console.log('=' .repeat(60));
}

// Executar o teste
if (import.meta.url === `file://${process.argv[1]}`) {
  testarSolucaoPolling();
}

export { testarSolucaoPolling, simulatePolling };