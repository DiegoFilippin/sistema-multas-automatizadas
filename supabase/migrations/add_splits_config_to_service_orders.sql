-- Adicionar colunas de configuração de splits na tabela service_orders
-- Estas colunas armazenarão as configurações de split usadas na criação da cobrança

-- Adicionar colunas para armazenar configurações de splits
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS asaas_payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS splits_config JSONB,
ADD COLUMN IF NOT EXISTS customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS multa_type_id UUID;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_orders_asaas_payment_id 
ON service_orders(asaas_payment_id) 
WHERE asaas_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_orders_customer_id 
ON service_orders(customer_id) 
WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_orders_multa_type_id 
ON service_orders(multa_type_id) 
WHERE multa_type_id IS NOT NULL;

-- Adicionar comentários nas colunas
COMMENT ON COLUMN service_orders.asaas_payment_id IS 'ID do pagamento no Asaas';
COMMENT ON COLUMN service_orders.splits_config IS 'Configuração JSON dos splits aplicados (acsm_value, icetran_value, taxa_cobranca, margem_despachante)';
COMMENT ON COLUMN service_orders.customer_id IS 'ID do cliente no Asaas';
COMMENT ON COLUMN service_orders.multa_type_id IS 'ID do tipo de multa selecionado';

-- Verificar se as colunas foram criadas corretamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'service_orders' 
AND column_name IN ('asaas_payment_id', 'splits_config', 'customer_id', 'multa_type_id')
ORDER BY column_name;