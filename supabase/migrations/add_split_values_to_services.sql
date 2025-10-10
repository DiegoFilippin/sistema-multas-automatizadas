-- Adicionar colunas de valores fixos para splits na tabela services
-- Estas colunas armazenarão valores em R$ (não percentuais)

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS acsm_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS icetran_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS despachante_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS company_id UUID;

-- Adicionar comentários para documentar as colunas
COMMENT ON COLUMN services.acsm_value IS 'Valor fixo em R$ para ACSM no split de pagamento';
COMMENT ON COLUMN services.icetran_value IS 'Valor fixo em R$ para ICETRAN no split de pagamento';
COMMENT ON COLUMN services.despachante_value IS 'Valor fixo em R$ para despachante no split de pagamento';
COMMENT ON COLUMN services.base_price IS 'Preço base do serviço em R$';
COMMENT ON COLUMN services.active IS 'Indica se o serviço está ativo';
COMMENT ON COLUMN services.company_id IS 'ID da empresa proprietária do serviço';

-- Atualizar serviços existentes com valores padrão
UPDATE services 
SET 
  acsm_value = 15.00,
  icetran_value = 15.00,
  base_price = CASE 
    WHEN name = 'Recurso de Multa' THEN 60.00
    ELSE COALESCE(fixed_value, 60.00)
  END,
  active = COALESCE(is_active, true)
WHERE acsm_value IS NULL OR icetran_value IS NULL;

-- Calcular despachante_value como resto do valor base
UPDATE services 
SET despachante_value = GREATEST(base_price - acsm_value - icetran_value, 0)
WHERE despachante_value IS NULL OR despachante_value = 0;

-- Adicionar constraint para garantir que os valores sejam positivos
ALTER TABLE services 
ADD CONSTRAINT check_acsm_value_positive CHECK (acsm_value >= 0),
ADD CONSTRAINT check_icetran_value_positive CHECK (icetran_value >= 0),
ADD CONSTRAINT check_despachante_value_positive CHECK (despachante_value >= 0),
ADD CONSTRAINT check_base_price_positive CHECK (base_price >= 0);

-- Adicionar constraint para garantir que a soma dos splits não exceda o preço base
ALTER TABLE services 
ADD CONSTRAINT check_split_sum_valid CHECK (
  (acsm_value + icetran_value + despachante_value) <= (base_price + 0.01)
);

-- Criar índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_services_company_active ON services(company_id, active);
CREATE INDEX IF NOT EXISTS idx_services_category_active ON services(category, active);

-- Atualizar timestamp
UPDATE services SET updated_at = NOW() WHERE updated_at < NOW() - INTERVAL '1 minute';