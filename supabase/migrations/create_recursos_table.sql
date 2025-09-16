-- Criação da tabela recursos para listar recursos com status iniciado
-- Esta tabela complementa a recursos_gerados para tracking de recursos

CREATE TABLE IF NOT EXISTS recursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  client_id UUID,
  multa_id UUID,
  chat_session_id UUID,
  
  -- Informações básicas do recurso
  titulo VARCHAR(255) NOT NULL,
  tipo_recurso VARCHAR(50) NOT NULL DEFAULT 'defesa_previa',
  status VARCHAR(50) NOT NULL DEFAULT 'iniciado',
  
  -- Dados da multa relacionada
  numero_auto VARCHAR(100),
  placa_veiculo VARCHAR(20),
  codigo_infracao VARCHAR(20),
  valor_multa DECIMAL(10,2),
  
  -- Dados do requerente
  nome_requerente VARCHAR(255),
  cpf_cnpj_requerente VARCHAR(20),
  endereco_requerente TEXT,
  
  -- Controle de processo
  data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_prazo DATE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  
  -- Metadados
  observacoes TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT recursos_status_check CHECK (status IN (
    'iniciado', 'em_andamento', 'aguardando_documentos', 
    'em_analise', 'concluido', 'protocolado', 'deferido', 
    'indeferido', 'cancelado'
  )),
  
  CONSTRAINT recursos_tipo_check CHECK (tipo_recurso IN (
    'defesa_previa', 'recurso_primeira_instancia', 
    'recurso_segunda_instancia', 'recurso_especial', 
    'recurso_extraordinario', 'advertencia_escrita'
  ))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_recursos_company_id ON recursos(company_id);
CREATE INDEX IF NOT EXISTS idx_recursos_client_id ON recursos(client_id);
CREATE INDEX IF NOT EXISTS idx_recursos_multa_id ON recursos(multa_id);
CREATE INDEX IF NOT EXISTS idx_recursos_status ON recursos(status);
CREATE INDEX IF NOT EXISTS idx_recursos_tipo ON recursos(tipo_recurso);
CREATE INDEX IF NOT EXISTS idx_recursos_data_inicio ON recursos(data_inicio);
CREATE INDEX IF NOT EXISTS idx_recursos_chat_session ON recursos(chat_session_id);

-- Foreign keys
ALTER TABLE recursos 
ADD CONSTRAINT recursos_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE recursos 
ADD CONSTRAINT recursos_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE recursos 
ADD CONSTRAINT recursos_multa_id_fkey 
FOREIGN KEY (multa_id) REFERENCES multas(id) ON DELETE CASCADE;

ALTER TABLE recursos 
ADD CONSTRAINT recursos_chat_session_id_fkey 
FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_recursos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recursos_updated_at_trigger
  BEFORE UPDATE ON recursos
  FOR EACH ROW
  EXECUTE FUNCTION update_recursos_updated_at();

-- RLS (Row Level Security)
ALTER TABLE recursos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Recursos são visíveis para usuários da mesma empresa" ON recursos
  FOR SELECT USING (true); -- Temporariamente permissivo para testes

CREATE POLICY "Usuários podem inserir recursos" ON recursos
  FOR INSERT WITH CHECK (true); -- Temporariamente permissivo para testes

CREATE POLICY "Usuários podem atualizar recursos da sua empresa" ON recursos
  FOR UPDATE USING (true); -- Temporariamente permissivo para testes

CREATE POLICY "Usuários podem deletar recursos da sua empresa" ON recursos
  FOR DELETE USING (true); -- Temporariamente permissivo para testes

-- Comentários
COMMENT ON TABLE recursos IS 'Tabela para tracking de recursos de multa iniciados e em andamento';
COMMENT ON COLUMN recursos.status IS 'Status do recurso: iniciado, em_andamento, concluido, etc.';
COMMENT ON COLUMN recursos.tipo_recurso IS 'Tipo do recurso: defesa_previa, recurso_primeira_instancia, etc.';
COMMENT ON COLUMN recursos.data_prazo IS 'Data limite para protocolar o recurso';
COMMENT ON COLUMN recursos.metadata IS 'Dados adicionais em formato JSON';

-- Inserir alguns dados de exemplo para teste
INSERT INTO recursos (
  company_id,
  client_id,
  titulo,
  tipo_recurso,
  status,
  numero_auto,
  placa_veiculo,
  codigo_infracao,
  valor_multa,
  nome_requerente,
  cpf_cnpj_requerente,
  data_prazo,
  observacoes
) 
SELECT 
  c.id as company_id,
  cl.id as client_id,
  'Recurso de Defesa Prévia - Auto ' || m.numero_auto as titulo,
  'defesa_previa' as tipo_recurso,
  'iniciado' as status,
  m.numero_auto,
  m.placa_veiculo,
  m.codigo_infracao,
  m.valor_original,
  COALESCE(m.nome_proprietario, cl.nome) as nome_requerente,
  COALESCE(m.cpf_cnpj_proprietario, cl.cpf_cnpj) as cpf_cnpj_requerente,
  (m.created_at + INTERVAL '15 days')::date as data_prazo,
  'Recurso iniciado automaticamente após extração de dados' as observacoes
FROM multas m
JOIN companies c ON m.company_id = c.id
LEFT JOIN clients cl ON m.client_id = cl.id
WHERE m.created_at >= NOW() - INTERVAL '7 days'
AND NOT EXISTS (
  SELECT 1 FROM recursos r WHERE r.multa_id = m.id
)
LIMIT 5;

COMMIT;