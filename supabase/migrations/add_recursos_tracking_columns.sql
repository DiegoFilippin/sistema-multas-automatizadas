-- Adicionar colunas para tracking de recursos iniciados na tabela recursos existente

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

-- Atualizar constraint de status para incluir novos status
ALTER TABLE recursos DROP CONSTRAINT IF EXISTS recursos_status_check;
ALTER TABLE recursos ADD CONSTRAINT recursos_status_check CHECK (status IN (
  'iniciado', 'em_andamento', 'aguardando_documentos', 
  'em_analise', 'protocolado', 'deferido', 'indeferido', 
  'cancelado', 'concluido'
));

-- Atualizar constraint de tipo_recurso
ALTER TABLE recursos DROP CONSTRAINT IF EXISTS recursos_tipo_recurso_check;
ALTER TABLE recursos ADD CONSTRAINT recursos_tipo_recurso_check CHECK (tipo_recurso IN (
  'defesa_previa', 'recurso_primeira_instancia', 
  'recurso_segunda_instancia', 'recurso_especial', 
  'recurso_extraordinario', 'advertencia_escrita'
));

-- Adicionar foreign keys para as novas colunas
ALTER TABLE recursos 
ADD CONSTRAINT recursos_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE recursos 
ADD CONSTRAINT recursos_chat_session_id_fkey 
FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_recursos_client_id ON recursos(client_id);
CREATE INDEX IF NOT EXISTS idx_recursos_chat_session_id ON recursos(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_recursos_data_inicio ON recursos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_recursos_numero_auto ON recursos(numero_auto);
CREATE INDEX IF NOT EXISTS idx_recursos_placa_veiculo ON recursos(placa_veiculo);

-- Atualizar registros existentes para ter status 'iniciado' se ainda não foram protocolados
UPDATE recursos 
SET 
  status = 'iniciado',
  data_inicio = COALESCE(created_at, NOW())
WHERE status = 'protocolado' 
AND data_protocolo > NOW() - INTERVAL '1 day';

-- Inserir alguns recursos de exemplo baseados em multas recentes
INSERT INTO recursos (
  company_id,
  client_id,
  multa_id,
  titulo,
  tipo_recurso,
  status,
  numero_auto,
  placa_veiculo,
  codigo_infracao,
  valor_multa,
  nome_requerente,
  cpf_cnpj_requerente,
  data_inicio,
  data_prazo,
  data_protocolo,
  fundamentacao,
  observacoes
) 
SELECT 
  m.company_id,
  m.client_id,
  m.id as multa_id,
  'Recurso de Defesa Prévia - Auto ' || m.numero_auto as titulo,
  'defesa_previa' as tipo_recurso,
  'iniciado' as status,
  m.numero_auto,
  m.placa_veiculo,
  m.codigo_infracao,
  m.valor_original,
  COALESCE(m.nome_proprietario, cl.nome) as nome_requerente,
  COALESCE(m.cpf_cnpj_proprietario, cl.cpf_cnpj) as cpf_cnpj_requerente,
  m.created_at as data_inicio,
  (m.created_at + INTERVAL '15 days')::date as data_prazo,
  (m.created_at + INTERVAL '1 day')::date as data_protocolo,
  'Recurso iniciado automaticamente após extração de dados. Aguardando análise detalhada.' as fundamentacao,
  'Recurso gerado pelo sistema de IA após análise do auto de infração' as observacoes
FROM multas m
LEFT JOIN clients cl ON m.client_id = cl.id
WHERE m.created_at >= NOW() - INTERVAL '7 days'
AND NOT EXISTS (
  SELECT 1 FROM recursos r WHERE r.multa_id = m.id
)
LIMIT 5
ON CONFLICT (id) DO NOTHING;

-- Comentários para as novas colunas
COMMENT ON COLUMN recursos.client_id IS 'ID do cliente relacionado ao recurso';
COMMENT ON COLUMN recursos.chat_session_id IS 'ID da sessão de chat que gerou o recurso';
COMMENT ON COLUMN recursos.titulo IS 'Título descritivo do recurso';
COMMENT ON COLUMN recursos.data_inicio IS 'Data de início do processo de recurso';
COMMENT ON COLUMN recursos.data_prazo IS 'Data limite para protocolar o recurso';
COMMENT ON COLUMN recursos.metadata IS 'Dados adicionais em formato JSON';

COMMIT;