-- Criar tabela para armazenar sessões de chat com IA
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  multa_id UUID REFERENCES multas(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  webhook_url TEXT NOT NULL,
  webhook_payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Criar tabela para armazenar mensagens do chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_chat_sessions_company_id ON chat_sessions(company_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_multa_id ON chat_sessions(multa_id);
CREATE INDEX idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(chat_session_id);
CREATE INDEX idx_chat_messages_type ON chat_messages(message_type);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Trigger para updated_at
CREATE TRIGGER update_chat_sessions_updated_at 
  BEFORE UPDATE ON chat_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chat_sessions
CREATE POLICY "Users can view company chat sessions" ON chat_sessions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company chat sessions" ON chat_sessions
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Políticas RLS para chat_messages
CREATE POLICY "Users can view company chat messages" ON chat_messages
  FOR SELECT USING (
    chat_session_id IN (
      SELECT id FROM chat_sessions cs
      WHERE cs.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage company chat messages" ON chat_messages
  FOR ALL USING (
    chat_session_id IN (
      SELECT id FROM chat_sessions cs
      WHERE cs.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Comentários
COMMENT ON TABLE chat_sessions IS 'Sessões de chat com IA para geração de recursos';
COMMENT ON TABLE chat_messages IS 'Mensagens das sessões de chat';
COMMENT ON COLUMN chat_sessions.session_id IS 'ID único da sessão de chat';
COMMENT ON COLUMN chat_sessions.webhook_url IS 'URL do webhook n8n utilizado';
COMMENT ON COLUMN chat_sessions.webhook_payload IS 'Dados enviados para o webhook';
COMMENT ON COLUMN chat_messages.message_type IS 'Tipo da mensagem: user, assistant ou system';
COMMENT ON COLUMN chat_messages.metadata IS 'Metadados adicionais da mensagem';