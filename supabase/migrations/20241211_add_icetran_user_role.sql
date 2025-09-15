-- Adicionar tipo de usuário ICETRAN ao sistema
-- Esta migração adiciona suporte para usuários do tipo ICETRAN
-- O tipo ICETRAN já está incluído na constraint da tabela users

-- Criar tabela para configurações específicas do ICETRAN
CREATE TABLE IF NOT EXISTS icetran_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  split_percentage DECIMAL(5,2) DEFAULT 0.00,
  fixed_amount DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_icetran_company_user UNIQUE(company_id, user_id),
  CONSTRAINT valid_split_percentage CHECK (split_percentage >= 0 AND split_percentage <= 100),
  CONSTRAINT valid_fixed_amount CHECK (fixed_amount >= 0)
);

-- Adicionar comentários
COMMENT ON TABLE icetran_configs IS 'Configurações específicas para usuários ICETRAN';
COMMENT ON COLUMN icetran_configs.company_id IS 'ID da empresa ICETRAN';
COMMENT ON COLUMN icetran_configs.user_id IS 'ID do usuário ICETRAN';
COMMENT ON COLUMN icetran_configs.service_id IS 'ID do serviço (NULL = configuração geral)';
COMMENT ON COLUMN icetran_configs.split_percentage IS 'Percentual do split para ICETRAN';
COMMENT ON COLUMN icetran_configs.fixed_amount IS 'Valor fixo para ICETRAN';

-- Criar índices
CREATE INDEX idx_icetran_configs_company_id ON icetran_configs(company_id);
CREATE INDEX idx_icetran_configs_user_id ON icetran_configs(user_id);
CREATE INDEX idx_icetran_configs_service_id ON icetran_configs(service_id);
CREATE INDEX idx_icetran_configs_active ON icetran_configs(is_active);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_icetran_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER trigger_update_icetran_configs_updated_at
  BEFORE UPDATE ON icetran_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_icetran_configs_updated_at();

-- RLS (Row Level Security)
ALTER TABLE icetran_configs ENABLE ROW LEVEL SECURITY;

-- Policy para usuários ICETRAN verem apenas suas próprias configurações
CREATE POLICY "ICETRAN users can view own configs" ON icetran_configs
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('Superadmin', 'ICETRAN')
    )
  );

-- Policy para admins gerenciarem configurações ICETRAN
CREATE POLICY "Admins can manage ICETRAN configs" ON icetran_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('Superadmin', 'ICETRAN')
    )
  );

-- Grants de permissão
GRANT SELECT ON icetran_configs TO anon, authenticated;
GRANT ALL ON icetran_configs TO authenticated;