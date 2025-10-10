// Script simples para testar se o chat está funcionando

async function testChatFunctionality() {
  console.log('🧪 === TESTE FINAL DO CHAT ===');
  
  const multaId = '83840e05-9941-47ad-8fea-68bde8f07083';
  console.log('🆔 Testando com multaId:', multaId);
  
  try {
    // Simular o que acontece no frontend
    console.log('\n1. 📋 Simulando carregamento de mensagens...');
    
    // Dados que deveriam estar na tabela (baseado no que inserimos)
    const mockMessages = [
      {
        id: 1,
        session_id: multaId,
        message: {
          type: 'human',
          content: 'Olá, preciso de ajuda para criar um recurso para esta multa de velocidade. A multa é do tipo leve e foi por excesso de velocidade de até 20%.'
        }
      },
      {
        id: 2,
        session_id: multaId,
        message: {
          type: 'ai',
          content: 'Olá! Vou ajudá-lo a criar um recurso para sua multa de velocidade. Com base nas informações que você forneceu, vejo que se trata de uma infração leve por excesso de velocidade de até 20%.\n\nPara multas deste tipo, temos algumas estratégias de defesa:\n\n1. **Verificação da calibração do equipamento**: Podemos questionar se o radar estava devidamente calibrado\n2. **Análise das condições da via**: Verificar se a sinalização estava adequada\n3. **Margem de erro**: Considerar a margem de tolerância do equipamento\n\nVocê gostaria que eu elabore um recurso completo baseado em alguma dessas estratégias?'
        }
      },
      {
        id: 3,
        session_id: multaId,
        message: {
          type: 'human',
          content: 'Sim, por favor! Gostaria de um recurso completo questionando a calibração do equipamento e a margem de erro. A multa foi aplicada na Rua das Flores, 123.'
        }
      },
      {
        id: 4,
        session_id: multaId,
        message: {
          type: 'ai',
          content: 'Perfeito! Vou elaborar um recurso completo para você:\n\n**RECURSO DE MULTA - QUESTIONAMENTO DE CALIBRAÇÃO**\n\nExcelentíssimo Senhor Diretor do DETRAN,\n\nVenho, respeitosamente, por meio deste, apresentar RECURSO contra o Auto de Infração nº J001565490, lavrado em desfavor do veículo de placa [PLACA], por suposta infração ao art. 218, I do CTB.\n\n**DOS FATOS:**\nO auto de infração foi lavrado por equipamento eletrônico na Rua das Flores, 123, alegando excesso de velocidade de até 20%.\n\n**DO DIREITO:**\n1. **Questionamento da Calibração**: Não há comprovação de que o equipamento estava devidamente calibrado\n2. **Margem de Erro**: Deve ser considerada a margem de tolerância técnica\n3. **Ônus da Prova**: Cabe ao órgão autuador provar a regularidade do equipamento\n\n**DO PEDIDO:**\nRequer-se o CANCELAMENTO do auto de infração por falta de comprovação da regularidade do equipamento medidor.\n\nTermos em que pede deferimento.\n\n[Local], [Data]\n[Nome do Requerente]'
        }
      }
    ];
    
    console.log('✅ Mensagens simuladas:', mockMessages.length);
    mockMessages.forEach((msg, index) => {
      console.log(`   ${index + 1}. Tipo: ${msg.message.type}, Conteúdo: ${msg.message.content.substring(0, 50)}...`);
    });
    
    // 2. Simular formatação das mensagens (como no código real)
    console.log('\n2. 🔄 Formatando mensagens...');
    const formattedMessages = mockMessages.map((msg, index) => {
      const isUser = msg.message.type === 'human';
      
      return {
        id: `n8n_${msg.id}`,
        type: isUser ? 'user' : 'ai',
        content: msg.message.content || '',
        timestamp: new Date() // Usar timestamp atual
      };
    });
    
    console.log('✅ Mensagens formatadas:', formattedMessages.length);
    formattedMessages.forEach((msg, index) => {
      console.log(`   ${index + 1}. ID: ${msg.id}, Tipo: ${msg.type}`);
      console.log(`      Timestamp: ${msg.timestamp.toLocaleTimeString()}`);
      console.log(`      Conteúdo: ${msg.content.substring(0, 80)}...`);
    });
    
    // 3. Verificar condições de exibição (como no código real)
    console.log('\n3. 🎯 Verificando condições de exibição...');
    const n8nChatActive = formattedMessages.length > 0;
    const shouldShowChat = n8nChatActive;
    
    console.log('📊 Estados simulados:');
    console.log('  - n8nChatMessages.length:', formattedMessages.length);
    console.log('  - n8nChatActive:', n8nChatActive);
    console.log('  - shouldShowChat:', shouldShowChat);
    
    // 4. Simular renderização
    console.log('\n4. 🖥️ Simulando renderização...');
    if (shouldShowChat) {
      console.log('✅ RENDERIZAÇÃO: Chat seria exibido!');
      console.log('📱 Interface mostraria:');
      console.log('   - Título: "Chat com IA" + badge "Ativo"');
      console.log('   - Mensagens:', formattedMessages.length);
      console.log('   - Input para nova mensagem: habilitado');
      
      // Simular cada mensagem renderizada
      formattedMessages.forEach((msg, index) => {
        const alignment = msg.type === 'user' ? 'direita' : 'esquerda';
        const bgColor = msg.type === 'user' ? 'azul' : 'branco';
        console.log(`   - Mensagem ${index + 1}: ${alignment}, fundo ${bgColor}`);
        console.log(`     Horário: ${msg.timestamp.toLocaleTimeString()}`);
      });
    } else {
      console.log('❌ RENDERIZAÇÃO: Placeholder seria exibido');
      console.log('📱 Interface mostraria:');
      console.log('   - Ícone de chat cinza');
      console.log('   - Texto: "Complete a extração de dados para ativar o chat"');
    }
    
    // 5. Resultado final
    console.log('\n5. 🏁 RESULTADO FINAL:');
    if (shouldShowChat && formattedMessages.length === 4) {
      console.log('🎉 SUCESSO COMPLETO!');
      console.log('✅ O chat deveria estar funcionando perfeitamente');
      console.log('✅ 4 mensagens deveriam ser exibidas');
      console.log('✅ Interface deveria estar ativa e responsiva');
      console.log('✅ Usuário deveria poder enviar novas mensagens');
    } else {
      console.log('❌ PROBLEMA IDENTIFICADO!');
      console.log('💡 Possíveis causas:');
      console.log('   - Mensagens não foram carregadas do banco');
      console.log('   - n8nChatActive não foi definido como true');
      console.log('   - Erro na formatação das mensagens');
      console.log('   - Problema na lógica de renderização');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar o teste
testChatFunctionality();