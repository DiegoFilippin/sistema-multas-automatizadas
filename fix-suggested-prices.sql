-- Corrigir preços sugeridos para os tipos de multa
-- Baseado nos custos totais + margem de lucro

UPDATE multa_types SET suggested_price = 
  CASE 
    WHEN type = 'leve' THEN 60.00    -- Custo: R$ 19,50 + margem
    WHEN type = 'media' THEN 90.00    -- Custo: R$ 33,50 + margem  
    WHEN type = 'grave' THEN 120.00   -- Custo: R$ 53,50 + margem
    WHEN type = 'gravissima' THEN 149.96 -- Custo: R$ 83,50 + margem
    ELSE 50.00
  END
WHERE suggested_price IS NULL OR suggested_price = 0;

-- Verificar se a atualização foi aplicada
SELECT 
  type,
  name,
  total_price as custo_total,
  suggested_price as preco_sugerido,
  (suggested_price - total_price) as margem_lucro
FROM multa_types 
ORDER BY type;