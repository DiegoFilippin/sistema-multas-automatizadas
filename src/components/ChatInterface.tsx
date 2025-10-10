import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Bot, User, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface MultaData {
  numero?: string;
  infracao?: string;
  local?: string;
  data?: string;
  valor?: string;
  veiculo?: string;
  condutor?: string;
  orgaoAutuador?: string;
  codigoInfracao?: string;
  pontos?: string;
  observacoes?: string;
}

interface ChatInterfaceProps {
  multaData: MultaData;
  onGenerateRecurso: (chatHistory: ChatMessage[]) => void;
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  multaData,
  onGenerateRecurso,
  className = ''
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationStage, setConversationStage] = useState<'initial' | 'gathering' | 'analyzing' | 'ready'>('initial');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Inicializar conversa
    if (messages.length === 0) {
      initializeChat();
    }
  }, []);

  const initializeChat = () => {
    const initialMessage: ChatMessage = {
      id: '1',
      type: 'ai',
      content: `Olá! Sou sua assistente de IA especializada em recursos de multa de trânsito. \n\nAnalisei sua multa:\n• **Infração:** ${multaData.infracao}\n• **Local:** ${multaData.local}\n• **Data:** ${multaData.data}\n• **Valor:** ${multaData.valor}\n\nPara te ajudar a construir um recurso eficaz, preciso entender os motivos pelos quais você não concorda com esta autuação. \n\n**Você pode me contar:**\n- O que aconteceu no momento da infração?\n- Por que você acredita que a multa foi aplicada incorretamente?\n- Há alguma circunstância especial que deveria ser considerada?`,
      timestamp: new Date()
    };
    setMessages([initialMessage]);
    setConversationStage('gathering');
  };

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simular resposta da IA baseada no contexto
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    const responses = {
      initial: [
        "Entendo sua situação. Pode me dar mais detalhes sobre as circunstâncias específicas?",
        "Interessante. Isso pode ser um ponto importante para o recurso. Me conte mais sobre...",
        "Vejo que há questões procedimentais envolvidas. Vamos analisar isso mais profundamente."
      ],
      gathering: [
        "Baseado no que você me contou, identifiquei alguns pontos que podem fortalecer seu recurso. Há mais algum detalhe que considera relevante?",
        "Essa informação é muito importante. No manual de aplicação desta infração, há requisitos específicos que podem não ter sido cumpridos. Você notou algo irregular no procedimento?",
        "Perfeito! Estou compilando os argumentos. Há testemunhas ou evidências adicionais que possam apoiar sua versão dos fatos?"
      ],
      analyzing: [
        "Excelente! Com base em tudo que me contou, identifiquei várias irregularidades que podem anular esta multa. Vou preparar um recurso fundamentado para você.",
        "Tenho informações suficientes para construir um recurso sólido. Os pontos que você levantou são muito relevantes segundo o manual de aplicação."
      ]
    };

    const stageResponses = responses[conversationStage] || responses.gathering;
    return stageResponses[Math.floor(Math.random() * stageResponses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Adicionar mensagem de "digitando"
      const typingMessage: ChatMessage = {
        id: `typing-${Date.now()}`,
        type: 'ai',
        content: '',
        timestamp: new Date(),
        isTyping: true
      };
      setMessages(prev => [...prev, typingMessage]);

      const aiResponse = await generateAIResponse(userMessage.content);

      // Remover mensagem de "digitando" e adicionar resposta real
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => !msg.isTyping);
        return [...withoutTyping, {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: aiResponse,
          timestamp: new Date()
        }];
      });

      // Avançar estágio da conversa
      if (conversationStage === 'gathering' && messages.length > 4) {
        setConversationStage('analyzing');
      } else if (conversationStage === 'analyzing' && messages.length > 6) {
        setConversationStage('ready');
      }

    } catch (error) {
      console.error('Erro ao gerar resposta da IA:', error);
      toast.error('Erro ao processar mensagem. Tente novamente.');
      setMessages(prev => prev.filter(msg => !msg.isTyping));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('• **') && line.includes('**')) {
        const parts = line.split('**');
        return (
          <div key={index} className="mb-1">
            • <strong>{parts[1]}</strong> {parts[2]}
          </div>
        );
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <strong key={index} className="block mb-2">{line.slice(2, -2)}</strong>;
      }
      return line ? <div key={index} className="mb-1">{line}</div> : <br key={index} />;
    });
  };

  if (messages.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Complete a extração de dados para iniciar o chat</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-2 p-4 border-b border-gray-200 bg-gray-50">
        <Bot className="w-5 h-5 text-blue-600" />
        <div>
          <h3 className="font-medium text-gray-900">Assistente de Recursos IA</h3>
          <p className="text-xs text-gray-500">
            {conversationStage === 'gathering' && 'Coletando informações...'}
            {conversationStage === 'analyzing' && 'Analisando argumentos...'}
            {conversationStage === 'ready' && 'Pronto para gerar recurso'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-80">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md`}>
              {message.type === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
              )}
              
              <div
                className={`px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.isTyping ? (
                  <div className="flex items-center space-x-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Digitando...</span>
                  </div>
                ) : (
                  <div className="text-sm">
                    {formatMessageContent(message.content)}
                  </div>
                )}
                
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
              
              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua resposta..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={`p-2 rounded-lg transition-colors ${
              !inputValue.trim() || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {/* Generate Recurso Button */}
        {messages.length >= 6 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => onGenerateRecurso(messages)}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Gerar Recurso Baseado na Conversa
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;