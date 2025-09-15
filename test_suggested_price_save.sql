-- Teste para verificar se o suggested_price está sendo salvo corretamente

-- Verificar estrutura da tabela multa_types
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'multa_types' 
AND column_name IN ('suggested_price', 'acsm_value', 'icetran_value', 'total_price')
ORDER BY ordinal_position;

-- Verificar dados existentes na tabela multa_types
SELECT 
    id,
    service_id,
    type,
    name,
    acsm_value,
    icetran_value,
    suggested_price,
    total_price,
    active
FROM multa_types
ORDER BY created_at DESC
LIMIT 10;

-- Verificar se há registros com suggested_price = 0 (que precisam ser atualizados)
SELECT COUNT(*) as registros_sem_suggested_price
FROM multa_types 
WHERE suggested_price = 0 OR suggested_price IS NULL;