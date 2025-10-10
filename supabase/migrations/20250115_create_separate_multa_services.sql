-- Migração para criar serviços separados por tipo de multa
-- Simplifica a arquitetura removendo tipos internos e criando serviços independentes

-- 1. Backup dos dados existentes
CREATE TABLE IF NOT EXISTS services_backup AS 
SELECT * FROM services WHERE name LIKE '%Recurso de Multa%';

-- 2. Adicionar coluna tipo_multa se não existir
ALTER TABLE services ADD COLUMN IF NOT EXISTS tipo_multa VARCHAR(20);

-- 3. Remover tabela multa_types se existir (não será mais necessária)
DROP TABLE IF EXISTS multa_types CASCADE;

-- 4. Remover serviços antigos de recurso de multa
DELETE FROM services WHERE name = 'Recurso de Multa' OR name LIKE '%Recurso de Multa%';

-- 5. Criar serviços separados para cada tipo de multa
-- Buscar company_id da ICETRAN para usar como padrão
DO $$
DECLARE
    icetran_company_id UUID;
BEGIN
    -- Buscar ID da empresa ICETRAN
    SELECT id INTO icetran_company_id 
    FROM companies 
    WHERE UPPER(nome) LIKE '%ICETRAN%' 
       OR company_type = 'icetran'
    LIMIT 1;
    
    -- Se não encontrar ICETRAN, usar a primeira empresa disponível
    IF icetran_company_id IS NULL THEN
        SELECT id INTO icetran_company_id FROM companies LIMIT 1;
    END IF;
    
    -- Inserir serviços separados para cada tipo de multa
    INSERT INTO services (
        id, 
        name, 
        category, 
        description, 
        pricing_type,
        fixed_value,
        base_price, 
        acsm_value, 
        icetran_value, 
        taxa_cobranca, 
        company_id, 
        active, 
        tipo_multa,
        created_at,
        updated_at
    ) VALUES
    -- Multa Leve
    (
        gen_random_uuid(), 
        'Recurso de Multa - Leve', 
        'Trânsito', 
        'Serviço de recurso administrativo para multas de natureza leve', 
        'fixed',
        60.00,
        60.00, 
        6.00, 
        6.00, 
        3.50, 
        icetran_company_id, 
        true, 
        'LEVE',
        NOW(),
        NOW()
    ),
    
    -- Multa Média
    (
        gen_random_uuid(), 
        'Recurso de Multa - Média', 
        'Trânsito', 
        'Serviço de recurso administrativo para multas de natureza média', 
        'fixed',
        90.00,
        90.00, 
        8.00, 
        8.00, 
        3.50, 
        icetran_company_id, 
        true, 
        'MEDIA',
        NOW(),
        NOW()
    ),
    
    -- Multa Grave
    (
        gen_random_uuid(), 
        'Recurso de Multa - Grave', 
        'Trânsito', 
        'Serviço de recurso administrativo para multas de natureza grave', 
        'fixed',
        120.00,
        120.00, 
        10.00, 
        10.00, 
        3.50, 
        icetran_company_id, 
        true, 
        'GRAVE',
        NOW(),
        NOW()
    ),
    
    -- Multa Gravíssima
    (
        gen_random_uuid(), 
        'Recurso de Multa - Gravíssima', 
        'Trânsito', 
        'Serviço de recurso administrativo para multas de natureza gravíssima', 
        'fixed',
        149.96,
        149.96, 
        12.00, 
        12.00, 
        3.50, 
        icetran_company_id, 
        true, 
        'GRAVISSIMA',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Serviços de multa criados com sucesso para empresa ID: %', icetran_company_id;
END $$;

-- 6. Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_services_tipo_multa ON services(tipo_multa);
CREATE INDEX IF NOT EXISTS idx_services_category_active ON services(category, active);
CREATE INDEX IF NOT EXISTS idx_services_company_tipo ON services(company_id, tipo_multa);

-- 7. Comentários para documentação
COMMENT ON COLUMN services.tipo_multa IS 'Tipo da multa: LEVE, MEDIA, GRAVE, GRAVISSIMA';
COMMENT ON COLUMN services.acsm_value IS 'Valor fixo para ACSM no split de pagamento';
COMMENT ON COLUMN services.icetran_value IS 'Valor fixo para ICETRAN no split de pagamento';
COMMENT ON COLUMN services.taxa_cobranca IS 'Taxa operacional fixa (normalmente R$ 3,50)';

-- 8. Verificar se os serviços foram criados corretamente
DO $$
DECLARE
    service_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO service_count 
    FROM services 
    WHERE category = 'Trânsito' 
      AND tipo_multa IS NOT NULL;
    
    IF service_count = 4 THEN
        RAISE NOTICE '✅ Migração concluída com sucesso! % serviços de multa criados.', service_count;
    ELSE
        RAISE WARNING '⚠️ Esperado 4 serviços, mas foram criados %', service_count;
    END IF;
END $$;

-- 9. Mostrar resumo dos serviços criados
SELECT 
    name,
    tipo_multa,
    base_price,
    acsm_value,
    icetran_value,
    taxa_cobranca,
    (acsm_value + icetran_value + taxa_cobranca) as custo_minimo,
    (base_price - (acsm_value + icetran_value + taxa_cobranca)) as margem_sugerida
FROM services 
WHERE category = 'Trânsito' 
  AND tipo_multa IS NOT NULL
ORDER BY 
    CASE tipo_multa 
        WHEN 'LEVE' THEN 1
        WHEN 'MEDIA' THEN 2
        WHEN 'GRAVE' THEN 3
        WHEN 'GRAVISSIMA' THEN 4
        ELSE 5
    END;