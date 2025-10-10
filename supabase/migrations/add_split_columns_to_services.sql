-- Adicionar colunas de configuração de splits na tabela services
-- Esta migração adiciona as colunas necessárias para configurar valores de split

-- Adicionar colunas de valores de split na tabela services
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS acsm_value DECIMAL(10,2) DEFAULT 6.00,
ADD COLUMN IF NOT EXISTS icetran_value DECIMAL(10,2) DEFAULT 6.00,
ADD COLUMN IF NOT EXISTS taxa_cobranca DECIMAL(10,2) DEFAULT 3.50;

-- Atualizar serviços existentes com valores padrão
UPDATE services 
SET 
  acsm_value = 6.00,
  icetran_value = 6.00,
  taxa_cobranca = 3.50,
  updated_at = NOW()
WHERE name = 'Recurso de Multa' AND category = 'Trânsito';

-- Comentários para documentação
COMMENT ON COLUMN services.acsm_value IS 'Valor fixo em R$ para ACSM no split de pagamento';
COMMENT ON COLUMN services.icetran_value IS 'Valor fixo em R$ para ICETRAN no split de pagamento';
COMMENT ON COLUMN services.taxa_cobranca IS 'Taxa fixa em R$ da cobrança (custo operacional)';

-- Verificar se as colunas foram criadas corretamente
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'services' 
AND column_name IN ('acsm_value', 'icetran_value', 'taxa_cobranca')
ORDER BY column_name;