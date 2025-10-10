-- Criar serviços de multa separados por tipo
-- Esta migração cria os 4 tipos de serviços de multa necessários

-- Primeiro, buscar o ID da empresa ICETRAN
DO $$
DECLARE
    icetran_company_id UUID;
BEGIN
    -- Buscar empresa ICETRAN
    SELECT id INTO icetran_company_id 
    FROM companies 
    WHERE name ILIKE '%ICETRAN%' 
    LIMIT 1;
    
    -- Se não encontrar ICETRAN, usar a primeira empresa disponível
    IF icetran_company_id IS NULL THEN
        SELECT id INTO icetran_company_id 
        FROM companies 
        LIMIT 1;
    END IF;
    
    -- Verificar se encontrou alguma empresa
    IF icetran_company_id IS NULL THEN
        RAISE EXCEPTION 'Nenhuma empresa encontrada. Crie uma empresa primeiro.';
    END IF;
    
    RAISE NOTICE 'Usando empresa ID: %', icetran_company_id;
    
    -- Limpar serviços existentes (se houver)
    DELETE FROM services WHERE category = 'Trânsito';
    
    -- Criar serviços de multa
    INSERT INTO services (
        id,
        name,
        description,
        category,
        pricing_type,
        fixed_value,
        is_active,
        active,
        base_price,
        suggested_price,
        acsm_value,
        icetran_value