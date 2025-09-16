/**
 * Correção para o problema de inicialização do chat n8n
 * 
 * PROBLEMA IDENTIFICADO:
 * - O chat n8n não está sendo iniciado automaticamente após a extração
 * - A interface não mostra o chat mesmo quando n8nChatActive é true
 * - As mensagens não aparecem na tela
 * 
 * SOLUÇÃO:
 * - Garantir que startN8nChat seja chamado após salvamento bem-sucedido
 * - Adicionar logs detalhados para debug
 * - Verificar se o estado n8nChatActive está sendo definido corretamente
 * - Garantir que as mensagens sejam adicionadas ao estado n8nChatMessages
 */

const fs = require('fs');
const path = require('path');

// Caminho do arquivo principal
const filePath = path.join(__dirname, 'src', 'pages', 'TesteRecursoIA.tsx');

// Função para aplicar correções
function aplicarCorrecoes() {
  console.log('🔧 === APLICANDO CORREÇÕES NO CHAT N8N ===\n');
  
  try {
    // Ler o arquivo atual
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Adicionar log detalhado no início da função startN8nChat
    const startN8nChatPattern = /const startN8nChat = async \(mensagemInicial: string\) => {/;
    if (startN8nChatPattern.test(content)) {
      content = content.replace(
        startN8nChatPattern,
        `const startN8nChat = async (mensagemInicial: string) => {
    console.log('🚀 === INICIANDO CHAT N8N (DETALHADO) ===');
    console.log('📊 Estado antes do início:', {
      n8nChatActive,
      multaId,
      mensagemInicial,
      n8nChatMessagesLength: n8nChatMessages.length
    });`
      );
      console.log('✅ 1. Adicionado log detalhado no startN8nChat');
    }
    
    // 2. Garantir que setN8nChatActive(true) seja chamado no início
    const setN8nChatActivePattern = /setN8nChatActive\(true\);/;
    if (setN8nChatActivePattern.test(content)) {
      content = content.replace(
        /setN8nChatActive\(true\);/,
        `setN8nChatActive(true);
      console.log('✅ n8nChatActive definido como true');`
      );
      console.log('✅ 2. Adicionado log para setN8nChatActive');
    }
    
    // 3. Adicionar log quando as mensagens são definidas
    const setN8nChatMessagesPattern = /setN8nChatMessages\(\[initialUserMessage, initialAiMessage\]\);/;
    if (setN8nChatMessagesPattern.test(content)) {
      content = content.replace(
        /setN8nChatMessages\(\[initialUserMessage, initialAiMessage\]\);/,
        `setN8nChatMessages([initialUserMessage, initialAiMessage]);
      console.log('✅ Mensagens do chat definidas:', {
        userMessage: initialUserMessage.content.substring(0, 50) + '...',
        aiMessage: initialAiMessage.content.substring(0, 50) + '...',
        totalMessages: 2
      });`
      );
      console.log('✅ 3. Adicionado log para setN8nChatMessages');
    }
    
    // 4. Adicionar verificação de estado após inicialização
    const toastSuccessPattern = /toast\.success\('Chat n8n iniciado com sucesso! Dados enviados para o sistema de IA\.'\);/;
    if (toastSuccessPattern.test(content)) {
      content = content.replace(
        /toast\.success\('Chat n8n iniciado com sucesso! Dados enviados para o sistema de IA\.'\);/,
        `toast.success('Chat n8n iniciado com sucesso! Dados enviados para o sistema de IA.');
      
      // Verificação final do estado
      console.log('🔍 === ESTADO FINAL APÓS INICIALIZAÇÃO ===');
      console.log('📊 Estado do chat:', {
        n8nChatActive: true, // Deve ser true
        n8nChatMessagesCount: 2, // Deve ter 2 mensagens
        multaId,
        chatSessionId: sessionId
      });
      
      // Forçar re-render se necessário
      setTimeout(() => {
        console.log('🔄 Verificando estado após timeout...');
        console.log('n8nChatActive atual:', n8nChatActive);
        console.log('n8nChatMessages atual:', n8nChatMessages.length);
      }, 1000);`
      );
      console.log('✅ 4. Adicionado verificação de estado final');
    }
    
    // 5. Adicionar log no handleSaveMultaAutomatically quando o chat é iniciado
    const chatIniciadoPattern = /console\.log\('✅ Chat n8n iniciado automaticamente com sucesso!'\);/;
    if (chatIniciadoPattern.test(content)) {
      content = content.replace(
        /console\.log\('✅ Chat n8n iniciado automaticamente com sucesso!'\);/,
        `console.log('✅ Chat n8n iniciado automaticamente com sucesso!');
          console.log('🔍 Verificando estado após início automático:', {
            n8nChatActive,
            n8nChatMessagesLength: n8nChatMessages.length,
            multaId: multaSalva.id
          });`
      );
      console.log('✅ 5. Adicionado log no início automático do chat');
    }
    
    // 6. Adicionar debug na renderização do chat
    const chatRenderPattern = /{n8nChatActive \? \(/;
    if (chatRenderPattern.test(content)) {
      content = content.replace(
        /{n8nChatActive \? \(/,
        `{(() => {
                console.log('🖥️ Renderizando chat - Estado:', {
                  n8nChatActive,
                  messagesCount: n8nChatMessages.length,
                  shouldShowChat: n8nChatActive
                });
                return n8nChatActive;
              })() ? (`
      );
      console.log('✅ 6. Adicionado debug na renderização do chat');
    }
    
    // 7. Adicionar useEffect para monitorar mudanças de estado
    const useEffectPattern = /useEffect\(\(\) => {\s*const loadChatHistory/;
    if (useEffectPattern.test(content)) {
      content = content.replace(
        /useEffect\(\(\) => {\s*const loadChatHistory/,
        `// Debug: Monitor de estado do chat
  useEffect(() => {
    console.log('🔄 Estado do chat mudou:', {
      n8nChatActive,
      messagesCount: n8nChatMessages.length,
      multaId,
      chatSessionId
    });
  }, [n8nChatActive, n8nChatMessages.length, multaId, chatSessionId]);

  useEffect(() => {
    const loadChatHistory`
      );
      console.log('✅ 7. Adicionado useEffect para monitorar estado');
    }
    
    // Salvar o arquivo modificado
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('\n✅ === CORREÇÕES APLICADAS COM SUCESSO ===');
    console.log('📁 Arquivo modificado:', filePath);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao aplicar correções:', error);
    return false;
  }
}

// Função para reverter correções (se necessário)
function reverterCorrecoes() {
  console.log('🔄 === REVERTENDO CORREÇÕES ===\n');
  
  try {
    // Fazer backup antes de reverter
    const backupPath = filePath + '.backup';
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, filePath);
      console.log('✅ Correções revertidas com sucesso');
      return true;
    } else {
      console.log('⚠️ Arquivo de backup não encontrado');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao reverter correções:', error);
    return false;
  }
}

// Função principal
function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'apply';
  
  // Fazer backup do arquivo original
  const backupPath = filePath + '.backup';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log('📋 Backup criado:', backupPath);
  }
  
  switch (action) {
    case 'apply':
      const success = aplicarCorrecoes();
      if (success) {
        console.log('\n🎉 Correções aplicadas! Execute o projeto e teste o fluxo:');
        console.log('1. Faça upload de um documento');
        console.log('2. Aguarde a extração');
        console.log('3. Verifique se o chat aparece automaticamente');
        console.log('4. Observe os logs no console do navegador');
      }
      break;
      
    case 'revert':
      reverterCorrecoes();
      break;
      
    default:
      console.log('Uso: node fix_chat_initialization.js [apply|revert]');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  aplicarCorrecoes,
  reverterCorrecoes
};