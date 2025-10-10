-- Adicionar coluna suggested_price à tabela multa_types
ALTER TABLE multa_types 
ADD COLUMN suggested_price DECIMAL(10,2) DEFAULT 0.00;

-- Adicionar comentário para a nova coluna
COMMENT ON COLUMN multa_types.suggested_price IS 'Preço sugerido para cobrança do cliente';

-- Atualizar registros existentes com um valor padrão baseado no total_price + margem
UPDATE multa_types 
SET suggested_price = total_price + 10.00 
WHERE suggested_price = 0.00;