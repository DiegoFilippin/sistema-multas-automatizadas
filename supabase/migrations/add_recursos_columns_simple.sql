-- Adicionar apenas as colunas necessárias para tracking de recursos iniciados
-- Sem alterar constraints existentes para evitar conflitos

-- Adicionar colunas que faltam para o tracking completo
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS chat_session_id UUID;
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS titulo VARCHAR(255);
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS numero_auto VARCHAR(100);
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS placa_veiculo VARCHAR(20);
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS codigo_infracao VARCHAR(20);
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS valor_multa DECIMAL(10,2);
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS nome_requerente VARCHAR(255);
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS cpf_cnpj_requerente VARCHAR(20);
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS endereco_requerente TEXT;
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS data_prazo DATE;
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMP WITH TIME ZONE;
ALTER TABLE recursos ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Adicionar foreign keys para as novas colunas (se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'recursos_client_id_fkey'
    ) THEN
        ALTER TABLE recursos 
        ADD CONSTRAINT recursos_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'recursos_chat_session_id_fkey'
    ) THEN
        ALTER TABLE recursos 
        ADD CONSTRAINT recursos_chat_session_id_fkey 
        FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_recursos_client_id ON recursos(client_id);
CREATE INDEX IF NOT EXISTS idx_recursos_chat_session_id ON recursos(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_recursos_data_inicio ON recursos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_recursos_numero_auto ON recursos(numero_auto);
CREATE INDEX IF NOT EXISTS idx_recursos_placa_veiculo ON recursos(placa_veiculo);

-- Comentários para as novas colunas
COMMENT ON COLUMN recursos.client_id IS 'ID do cliente relacionado ao recurso';
COMMENT ON COLUMN recursos.chat_session_id IS 'ID da sessão de chat que gerou o recurso';
COMMENT ON COLUMN recursos.titulo IS 'Título descritivo do recurso';
COMMENT ON COLUMN recursos.data_inicio IS 'Data de início do processo de recurso';
COMMENT ON COLUMN recursos.data_prazo IS 'Data limite para protocolar o recurso';
COMMENT ON COLUMN recursos.metadata IS 'Dados adicionais em formato JSON';

COMMIT;