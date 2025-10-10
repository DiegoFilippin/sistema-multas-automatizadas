-- Criar tabela de tipos de multa para o novo sistema de cobrança
CREATE TABLE multa_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('leve', 'media', 'grave', 'gravissima')),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    acsm_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    icetran_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    fixed_value DECIMAL(10,2) NOT NULL DEFAULT 3.50,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (acsm_value + icetran_value + fixed_value) STORED,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Índices para performance
CREATE INDEX idx_multa_types_service_id ON multa_types(service_id);
CREATE INDEX idx_multa_types_type ON multa_types(type);
CREATE INDEX idx_multa_types_active ON multa_types(active);

-- Constraint para garantir que cada tipo seja único por serviço
CREATE UNIQUE INDEX idx_multa_types_service_type ON multa_types(service_id, type);

-- Comentários nas colunas
COMMENT ON COLUMN multa_types.type IS 'Tipo da multa: leve, media, grave, gravissima';
COMMENT ON COLUMN multa_types.acsm_value IS 'Valor da taxa ACSM para este tipo de multa';
COMMENT ON COLUMN multa_types.icetran_value IS 'Valor da taxa Icetran para este tipo de multa';
COMMENT ON COLUMN multa_types.fixed_value IS 'Valor fixo adicional (padrão R$ 3,50)';
COMMENT ON COLUMN multa_types.total_price IS 'Preço total calculado automaticamente (ACSM + Icetran + Fixo)';

-- Habilitar RLS (Row Level Security)
ALTER TABLE multa_types ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados vejam tipos de multa
CREATE POLICY "Users can view multa types" ON multa_types
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid()
        )
    );

-- Política para permitir que administradores gerenciem tipos de multa
CREATE POLICY "Admins can manage multa types" ON multa_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('Administrador', 'Super Admin')
        )
    );

-- Política para permitir que o sistema gerencie tipos de multa
CREATE POLICY "System can manage multa types" ON multa_types
    FOR ALL USING (true);

-- Conceder permissões para roles
GRANT SELECT, INSERT, UPDATE ON multa_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON multa_types TO service_role;
GRANT SELECT ON multa_types TO anon;

-- Função para atualizar automaticamente o updated_at
CREATE OR REPLACE FUNCTION update_multa_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER trigger_update_multa_types_updated_at
    BEFORE UPDATE ON multa_types
    FOR EACH ROW
    EXECUTE FUNCTION update_multa_types_updated_at();

-- Inserir dados iniciais para o serviço "Recurso de Multa"
-- Primeiro, vamos garantir que existe um serviço "Recurso de Multa"
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM services WHERE name = 'Recurso de Multa') THEN
        INSERT INTO services (id, name, description, pricing_type, is_active, created_at)
        VALUES (
            gen_random_uuid(),
            'Recurso de Multa',
            'Serviço de recurso de multas com cobrança por tipificação',
            'fixed',
            true,
            NOW()
        );
    END IF;
END $$;

-- Inserir os tipos de multa padrão
INSERT INTO multa_types (service_id, type, name, description, acsm_value, icetran_value, fixed_value, active)
SELECT 
    s.id,
    'leve',
    'Multa Leve',
    'Infrações de natureza leve com menor valor de multa',
    50.00,
    30.00,
    3.50,
    true
FROM services s 
WHERE s.name = 'Recurso de Multa'
ON CONFLICT (service_id, type) DO NOTHING;

INSERT INTO multa_types (service_id, type, name, description, acsm_value, icetran_value, fixed_value, active)
SELECT 
    s.id,
    'media',
    'Multa Média',
    'Infrações de natureza média com valor intermediário',
    80.00,
    50.00,
    3.50,
    true
FROM services s 
WHERE s.name = 'Recurso de Multa'
ON CONFLICT (service_id, type) DO NOTHING;

INSERT INTO multa_types (service_id, type, name, description, acsm_value, icetran_value, fixed_value, active)
SELECT 
    s.id,
    'grave',
    'Multa Grave',
    'Infrações de natureza grave com valor elevado',
    120.00,
    80.00,
    3.50,
    true
FROM services s 
WHERE s.name = 'Recurso de Multa'
ON CONFLICT (service_id, type) DO NOTHING;

INSERT INTO multa_types (service_id, type, name, description, acsm_value, icetran_value, fixed_value, active)
SELECT 
    s.id,
    'gravissima',
    'Multa Gravíssima',
    'Infrações de natureza gravíssima com maior valor de multa',
    200.00,
    150.00,
    3.50,
    true
FROM services s 
WHERE s.name = 'Recurso de Multa'
ON CONFLICT (service_id, type) DO NOTHING;