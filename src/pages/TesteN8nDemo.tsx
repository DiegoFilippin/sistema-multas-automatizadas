import React, { useState, useEffect } from 'react';
import { loadN8nChatHistory } from '../services/n8nChatService';

const TesteN8nDemo: React.FC = () => {
  const [messages, setMessages] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [testSessionId, setTestSessionId] = useState('cbc7588d-e8b1-49f6-b069-48babd2aa1ad');

  const loadMessages = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testando carregamento de mensagens n8n...');
      const result = await loadN8nChatHistory(testSessionId);
      console.log('📋 Resultado:', result);
      
      setMessages(result.messages);
      setSessionId(result.sessionId);
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [testSessionId]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            🧪 Teste de Carregamento N8N Chat
          </h1>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session ID para teste:
            </label>
            <input
              type="text"
              value={testSessionId}
              onChange={(e) => setTestSessionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite o session_id para testar"
            />
            <button
              onClick={loadMessages}
              disabled={loading}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Carregando...' : 'Testar Carregamento'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                📊 Informações da Sessão
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Session ID usado:</span>
                  <span className="ml-2 text-gray-600">{testSessionId}</span>
                </div>
                <div>
                  <span className="font-medium">Session ID retornado:</span>
                  <span className="ml-2 text-gray-600">{sessionId || 'Nenhum'}</span>
                </div>
                <div>
                  <span className="font-medium">Total de mensagens:</span>
                  <span className="ml-2 text-gray-600">{messages.length}</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-2 ${loading ? 'text-yellow-600' : messages.length > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {loading ? 'Carregando...' : messages.length > 0 ? 'Sucesso' : 'Nenhuma mensagem encontrada'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                🔧 Session IDs Conhecidos
              </h2>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium">N8N Messages:</span>
                  <div className="ml-2 text-gray-600 break-all">
                    cbc7588d-e8b1-49f6-b069-48babd2aa1ad
                  </div>
                </div>
                <div>
                  <span className="font-medium">Chat Sessions:</span>
                  <div className="ml-2 text-gray-600 break-all">
                    chat_test_1758058211802<br/>
                    test_session_1758061384707
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTestSessionId('cbc7588d-e8b1-49f6-b069-48babd2aa1ad')}
                className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
              >
                Usar Session ID com Mensagens
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              💬 Mensagens Carregadas
            </h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Carregando mensagens...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma mensagem encontrada para este session_id.</p>
                <p className="text-sm mt-1">Verifique se o session_id está correto.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-100 border-l-4 border-blue-500'
                        : 'bg-green-100 border-l-4 border-green-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">
                        {message.type === 'user' ? '👤 Usuário' : '🤖 IA'}
                      </span>
                      <span className="text-xs text-gray-500">
                        ID: {message.id}
                      </span>
                    </div>
                    <div className="text-gray-800">
                      {message.content.length > 500 ? (
                        <>
                          {message.content.substring(0, 500)}
                          <span className="text-gray-500">... (truncado)</span>
                        </>
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TesteN8nDemo;