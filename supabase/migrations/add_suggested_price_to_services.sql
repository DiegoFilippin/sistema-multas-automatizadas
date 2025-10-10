-- Adicionar coluna suggested_price na tabela services
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS suggested_price DECIMAL(10,2);

-- Atualizar serviços existentes com valores sugeridos baseados no tipo de multa
UPDATE services 
SET suggested_price = CASE 
  WHEN tipo_multa = 'LEVE' THEN 60.00
  WHEN tipo_multa = 'MEDIA' THEN 90.00
  WHEN tipo_multa = 'GRAVE' THEN 120.00
  WHEN tipo_multa = 'GRAVISSIMA' THEN 149.96
  ELSE COALESCE(base_price, 50.00)
END
WHERE category = 'Trânsito' AND suggested_price IS NULL;

-- Garantir que suggested_price nunca seja menor que o custo mínimo
UPDATE services 
SET suggested_price = (acsm_value + icetran_value + COALESCE(taxa_cobranca, 3.50))
WHERE suggested_price < (acsm_value + icetran_value + COALESCE(taxa_cobranca, 3.50));

-- Adicionar comentário na coluna
COMMENT ON COLUMN services.suggested_price IS 'Valor sugerido para cobrança do serviço (configurável pelo superadmin)';