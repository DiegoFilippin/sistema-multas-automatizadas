-- Tornar customer_id nullable na tabela payments
-- Para permitir compras de créditos diretamente pela empresa (sem cliente específico)

ALTER TABLE payments 
ALTER COLUMN customer_id DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN payments.customer_id IS 'Cliente que está comprando os créditos (nullable para compras da empresa)';