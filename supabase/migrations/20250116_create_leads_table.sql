-- Criar tabela de leads para formulário de contato
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  empresa VARCHAR(255),
  cnpj VARCHAR(18),
  cidade VARCHAR(100) NOT NULL,
  estado VARCHAR(2) NOT NULL,
  servico_interesse VARCHAR(50) NOT NULL CHECK (servico_interesse IN ('recurso_multa', 'consultoria', 'gestao_frotas', 'outros')),
  mensagem TEXT,
  origem VARCHAR(50) DEFAULT 'site' CHECK (origem IN ('site', 'google', 'indicacao', 'redes_sociais', 'outros')),
  
  -- Status do lead
  status VARCHAR(20) DEFAULT 'novo' CHECK (status IN ('novo', 'contatado', 'qualificado', 'convertido', 'perdido')),
  
  -- Dados de acompanhamento
  data_primeiro_contato TIMESTAMP WITH TIME ZONE,
  data_ultimo_contato TIMESTAMP WITH TIME ZONE,
  responsavel_id UUID REFERENCES users(id),
  observacoes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_servico_interesse ON leads(servico_interesse);
CREATE INDEX IF NOT EXISTS idx_leads_responsavel_id ON leads(responsavel_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- RLS (Row Level Security)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Política para administradores (acesso total)
CREATE POLICY "Administradores podem gerenciar todos os leads" ON leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('Superadmin', 'admin')
    )
  );

-- Política para inserção pública (formulário de contato)
CREATE POLICY "Permitir inserção pública de leads" ON leads
  FOR INSERT WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE leads IS 'Tabela para armazenar leads do formulário de contato';
COMMENT ON COLUMN leads.servico_interesse IS 'Tipo de serviço de interesse: recurso_multa, consultoria, gestao_frotas, outros';
COMMENT ON COLUMN leads.origem IS 'Como o lead conheceu a empresa: site, google, indicacao, redes_sociais, outros';
COMMENT ON COLUMN leads.status IS 'Status do lead no funil de vendas: novo, contatado, qualificado, convertido, perdido';