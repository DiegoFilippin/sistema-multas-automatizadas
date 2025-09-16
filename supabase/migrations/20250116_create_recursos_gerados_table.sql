-- Criar tabela para armazenar recursos gerados pela IA
CREATE TABLE IF NOT EXISTS recursos_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  multa_id UUID REFERENCES multas(id) ON DELETE CASCADE,
  chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  recurso_id UUID REFERENCES recursos(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  conteudo_recurso TEXT NOT NULL,
  fundamentacao_legal TEXT,
  argumentos_principais TEXT[],
  tipo_recurso VARCHAR(50) NOT NULL DEFAULT 'defesa_previa',
  status VARCHAR(20) DEFAULT 'gerado' CHECK (status IN ('gerado', 'revisado', 'aprovado', 'protocolado', 'rejeitado')),
  metadata JSONB,
  versao INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id)
);

-- Criar tabela para versionamento dos recursos
CREATE TABLE IF NOT EXISTS recursos_gerados_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_gerado_id UUID NOT NULL REFERENCES recursos_gerados(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  conteudo_recurso TEXT NOT NULL,
  fundamentacao_legal TEXT,
  argumentos_principais TEXT[],
  alteracoes_realizadas TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_recursos_gerados_company_id ON recursos_gerados(company_id);
CREATE INDEX idx_recursos_gerados_user_id ON recursos_gerados(user_id);
CREATE INDEX idx_recursos_gerados_multa_id ON recursos_gerados(multa_id);
CREATE INDEX idx_recursos_gerados_chat_session_id ON recursos_gerados(chat_session_id);
CREATE INDEX idx_recursos_gerados_recurso_id ON recursos_gerados(recurso_id);
CREATE INDEX idx_recursos_gerados_status ON recursos_gerados(status);
CREATE INDEX idx_recursos_gerados_tipo_recurso ON recursos_gerados(tipo_recurso);
CREATE INDEX idx_recursos_gerados_created_at ON recursos_gerados(created_at);

CREATE INDEX idx_recursos_gerados_versions_recurso_id ON recursos_gerados_versions(recurso_gerado_id);
CREATE INDEX idx_recursos_gerados_versions_versao ON recursos_gerados_versions(versao);
CREATE INDEX idx_recursos_gerados_versions_created_at ON recursos_gerados_versions(created_at);

-- Trigger para updated_at
CREATE TRIGGER update_recursos_gerados_updated_at 
  BEFORE UPDATE ON recursos_gerados 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para criar versão automaticamente
CREATE OR REPLACE FUNCTION create_recurso_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar nova versão quando o conteúdo for alterado
  IF OLD.conteudo_recurso IS DISTINCT FROM NEW.conteudo_recurso OR
     OLD.fundamentacao_legal IS DISTINCT FROM NEW.fundamentacao_legal OR
     OLD.argumentos_principais IS DISTINCT FROM NEW.argumentos_principais THEN
    
    -- Incrementar versão
    NEW.versao = OLD.versao + 1;
    
    -- Inserir versão anterior no histórico
    INSERT INTO recursos_gerados_versions (
      recurso_gerado_id,
      versao,
      conteudo_recurso,
      fundamentacao_legal,
      argumentos_principais,
      alteracoes_realizadas,
      created_by
    ) VALUES (
      OLD.id,
      OLD.versao,
      OLD.conteudo_recurso,
      OLD.fundamentacao_legal,
      OLD.argumentos_principais,
      'Versão anterior salva automaticamente',
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_recurso_version
  BEFORE UPDATE ON recursos_gerados
  FOR EACH ROW EXECUTE FUNCTION create_recurso_version();

-- Habilitar RLS
ALTER TABLE recursos_gerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos_gerados_versions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para recursos_gerados
CREATE POLICY "Users can view company recursos gerados" ON recursos_gerados
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company recursos gerados" ON recursos_gerados
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Políticas RLS para recursos_gerados_versions
CREATE POLICY "Users can view company recursos versions" ON recursos_gerados_versions
  FOR SELECT USING (
    recurso_gerado_id IN (
      SELECT id FROM recursos_gerados rg
      WHERE rg.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage company recursos versions" ON recursos_gerados_versions
  FOR ALL USING (
    recurso_gerado_id IN (
      SELECT id FROM recursos_gerados rg
      WHERE rg.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Comentários
COMMENT ON TABLE recursos_gerados IS 'Recursos de multa gerados pela IA via chat';
COMMENT ON TABLE recursos_gerados_versions IS 'Histórico de versões dos recursos gerados';
COMMENT ON COLUMN recursos_gerados.conteudo_recurso IS 'Texto completo do recurso gerado';
COMMENT ON COLUMN recursos_gerados.fundamentacao_legal IS 'Base legal utilizada no recurso';
COMMENT ON COLUMN recursos_gerados.argumentos_principais IS 'Lista dos principais argumentos utilizados';
COMMENT ON COLUMN recursos_gerados.tipo_recurso IS 'Tipo do recurso: defesa_previa, recurso_primeira_instancia, etc.';
COMMENT ON COLUMN recursos_gerados.metadata IS 'Metadados adicionais do processo de geração';
COMMENT ON COLUMN recursos_gerados.versao IS 'Versão atual do recurso';