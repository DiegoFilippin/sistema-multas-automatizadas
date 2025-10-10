-- Adicionar campo multa_id na tabela service_orders para relacionar com a tabela multas
-- Este campo será preenchido quando os dados da multa forem extraídos e salvos

-- Adicionar coluna multa_id
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS multa_id UUID REFERENCES multas(id) ON DELETE SET NULL;

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_orders_multa_id 
ON service_orders(multa_id) 
WHERE multa_id IS NOT NULL;

-- Adicionar comentário na coluna
COMMENT ON COLUMN service_orders.multa_id IS 'ID da multa relacionada (preenchido após extração dos dados)';

-- Verificar se a coluna foi criada corretamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'service_orders' 
AND column_name = 'multa_id';