-- Atualizar tabela split_configurations para trabalhar com services
-- Adicionar referência para a tabela services
ALTER TABLE split_configurations ADD COLUMN IF NOT EXISTS service_id UUID;

-- Criar foreign key para services
ALTER TABLE split_configurations 
ADD CONSTRAINT fk_split_configurations_service_id 
FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

-- Adicionar campos para configuração de precificação flexível
ALTER TABLE split_configurations ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(20) CHECK (pricing_type IN ('percentage', 'fixed'));
ALTER TABLE split_configurations ADD COLUMN IF NOT EXISTS percentage_value DECIMAL(5,2) CHECK (percentage_value >= 0 AND percentage_value <= 100);
ALTER TABLE split_configurations ADD COLUMN IF NOT EXISTS minimum_value DECIMAL(10,2) CHECK (minimum_value >= 0);
ALTER TABLE split_configurations ADD COLUMN IF NOT EXISTS fixed_value DECIMAL(10,2) CHECK (fixed_value >= 0);

-- Adicionar validação para garantir que os splits somem 100% ou menos
ALTER TABLE split_configurations ADD CONSTRAINT check_split_percentages 
CHECK ((acsm_percentage + icetran_percentage + despachante_percentage) <= 100.00);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_split_configurations_service_id ON split_configurations(service_id);
CREATE INDEX IF NOT EXISTS idx_split_configurations_service_type ON split_configurations(service_type);
CREATE INDEX IF NOT EXISTS idx_split_configurations_active ON split_configurations(is_active);

-- Habilitar RLS se não estiver habilitado
ALTER TABLE split_configurations ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar configurações de split" ON split_configurations;
CREATE POLICY "Usuários autenticados podem visualizar configurações de split" ON split_configurations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção/atualização para administradores
DROP POLICY IF EXISTS "Administradores podem gerenciar configurações de split" ON split_configurations;
CREATE POLICY "Administradores podem gerenciar configurações de split" ON split_configurations
    FOR ALL USING (auth.role() = 'authenticated');

-- Atualizar configurações existentes para referenciar os novos serviços
DO $$
DECLARE
    service_recurso_id UUID;
    service_defesa_id UUID;
BEGIN
    -- Buscar IDs dos serviços criados
    SELECT id INTO service_recurso_id FROM services WHERE name = 'Recurso de Multa' LIMIT 1;
    SELECT id INTO service_defesa_id FROM services WHERE name = 'Defesa Prévia' LIMIT 1;
    
    -- Atualizar configurações existentes se existirem
    IF EXISTS (SELECT 1 FROM split_configurations WHERE service_type = 'recurso_multa') THEN
        UPDATE split_configurations 
        SET service_id = service_recurso_id,
            pricing_type = 'percentage',
            percentage_value = 15.00,
            minimum_value = 50.00
        WHERE service_type = 'recurso_multa';
    ELSE
        -- Inserir configuração para recurso de multa se não existir
        INSERT INTO split_configurations (
            service_type, service_id, acsm_percentage, icetran_percentage, 
            despachante_percentage, pricing_type, percentage_value, minimum_value
        ) VALUES (
            'recurso_multa', service_recurso_id, 30.00, 20.00, 50.00, 
            'percentage', 15.00, 50.00
        );
    END IF;
    
    IF EXISTS (SELECT 1 FROM split_configurations WHERE service_type = 'defesa_previa') THEN
        UPDATE split_configurations 
        SET service_id = service_defesa_id,
            pricing_type = 'percentage',
            percentage_value = 12.00,
            minimum_value = 40.00
        WHERE service_type = 'defesa_previa';
    ELSE
        -- Inserir configuração para defesa prévia se não existir
        INSERT INTO split_configurations (
            service_type, service_id, acsm_percentage, icetran_percentage, 
            despachante_percentage, pricing_type, percentage_value, minimum_value
        ) VALUES (
            'defesa_previa', service_defesa_id, 25.00, 15.00, 60.00, 
            'percentage', 12.00, 40.00
        );
    END IF;
END $$;

-- Conceder permissões
GRANT SELECT ON split_configurations TO anon;
GRANT ALL PRIVILEGES ON split_configurations TO authenticated;