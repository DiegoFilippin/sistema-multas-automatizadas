-- Migração para manter apenas o serviço "Recurso de Multa" ativo
-- Desativar todos os outros serviços existentes

-- Primeiro, desativar todos os serviços
UPDATE services 
SET is_active = false, 
    updated_at = NOW()
WHERE name != 'Recurso de Multa';

-- Garantir que o serviço "Recurso de Multa" esteja ativo
UPDATE services 
SET is_active = true, 
    updated_at = NOW()
WHERE name = 'Recurso de Multa';

-- Adicionar comentário explicativo
COMMENT ON TABLE services IS 'Tabela de serviços - Atualmente configurada para usar apenas o serviço "Recurso de Multa" com cobrança por tipo de multa';

-- Verificar se o serviço "Recurso de Multa" existe e está configurado corretamente
DO $$
DECLARE
    service_count INTEGER;
BEGIN
    -- Contar quantos serviços "Recurso de Multa" existem
    SELECT COUNT(*) INTO service_count 
    FROM services 
    WHERE name = 'Recurso de Multa';
    
    -- Se não existe, criar
    IF service_count = 0 THEN
        INSERT INTO services (id, name, description, category, pricing_type, is_active, created_at)
        VALUES (
            gen_random_uuid(),
            'Recurso de Multa',
            'Serviço de recurso de multas com cobrança por tipificação (Leve, Média, Grave, Gravíssima)',
            'Recursos',
            'fixed',
            true,
            NOW()
        );
        
        RAISE NOTICE 'Serviço "Recurso de Multa" criado com sucesso';
    ELSE
        RAISE NOTICE 'Serviço "Recurso de Multa" já existe';
    END IF;
    
    -- Mostrar status final
    RAISE NOTICE 'Serviços ativos: %', (
        SELECT COUNT(*) FROM services WHERE is_active = true
    );
    
    RAISE NOTICE 'Total de serviços: %', (
        SELECT COUNT(*) FROM services
    );
END $$;

-- Verificar se existem tipos de multa para o serviço
DO $$
DECLARE
    multa_types_count INTEGER;
    service_id_var UUID;
BEGIN
    -- Obter o ID do serviço "Recurso de Multa"
    SELECT id INTO service_id_var 
    FROM services 
    WHERE name = 'Recurso de Multa' 
    LIMIT 1;
    
    IF service_id_var IS NOT NULL THEN
        -- Contar tipos de multa existentes
        SELECT COUNT(*) INTO multa_types_count 
        FROM multa_types 
        WHERE service_id = service_id_var;
        
        RAISE NOTICE 'Tipos de multa configurados: %', multa_types_count;
        
        -- Se não existem tipos, algo pode estar errado
        IF multa_types_count = 0 THEN
            RAISE WARNING 'Nenhum tipo de multa encontrado para o serviço "Recurso de Multa"';
        END IF;
    ELSE
        RAISE EXCEPTION 'Serviço "Recurso de Multa" não encontrado';
    END IF;
END $$;