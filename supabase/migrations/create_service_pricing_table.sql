-- Criar tabela para armazenar precificação hierárquica de serviços
CREATE TABLE IF NOT EXISTS service_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('acsm', 'icetran', 'despachante')),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Tipo de precificação
    pricing_type VARCHAR(20) NOT NULL CHECK (pricing_type IN ('fixed', 'percentage')),
    
    -- Valores
    fixed_value DECIMAL(10,2),
    percentage_value DECIMAL(5,2),
    minimum_value DECIMAL(10,2),
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_pricing_values CHECK (
        (pricing_type = 'fixed' AND fixed_value IS NOT NULL AND fixed_value > 0) OR
        (pricing_type = 'percentage' AND percentage_value IS NOT NULL AND percentage_value > 0 AND percentage_value <= 100)
    ),
    
    -- Índice único para evitar duplicatas por serviço/usuário/empresa
    UNIQUE(service_id, user_type, company_id, user_id)
);

-- Índices para performance
CREATE INDEX idx_service_pricing_service_id ON service_pricing(service_id);
CREATE INDEX idx_service_pricing_user_type ON service_pricing(user_type);
CREATE INDEX idx_service_pricing_company_id ON service_pricing(company_id);
CREATE INDEX idx_service_pricing_user_id ON service_pricing(user_id);

-- Habilitar RLS
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;

-- Política para Super Admin (ACSM) - acesso total
CREATE POLICY "Super Admin can manage all service pricing" ON service_pricing
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'admin_master'
        )
    );

-- Política para ICETRAN - pode gerenciar apenas seus próprios preços
CREATE POLICY "ICETRAN can manage own pricing" ON service_pricing
    FOR ALL USING (
        user_type = 'icetran' AND (
            user_id = auth.uid() OR
            company_id IN (
                SELECT c.id FROM companies c
                JOIN user_profiles up ON up.company_id = c.id
                WHERE up.user_id = auth.uid()
                AND c.cnpj = '02968119000188' -- CNPJ do ICETRAN
            )
        )
    );

-- Política para Despachantes - podem gerenciar apenas preços de sua empresa
CREATE POLICY "Despachantes can manage company pricing" ON service_pricing
    FOR ALL USING (
        user_type = 'despachante' AND (
            company_id IN (
                SELECT up.company_id FROM user_profiles up
                WHERE up.user_id = auth.uid()
            ) OR
            user_id = auth.uid()
        )
    );

-- Política de leitura para todos os usuários autenticados (para consultar hierarquia)
CREATE POLICY "Authenticated users can read service pricing" ON service_pricing
    FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_service_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_pricing_updated_at
    BEFORE UPDATE ON service_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_service_pricing_updated_at();

-- Inserir dados iniciais para ACSM (valores base)
INSERT INTO service_pricing (service_id, user_type, pricing_type, fixed_value, created_by)
SELECT 
    s.id,
    'acsm',
    'fixed',
    50.00, -- Valor base padrão
    (
        SELECT u.id FROM auth.users u
        JOIN user_profiles up ON up.user_id = u.id
        WHERE up.role = 'admin_master'
        LIMIT 1
    )
FROM services s
WHERE NOT EXISTS (
    SELECT 1 FROM service_pricing sp
    WHERE sp.service_id = s.id AND sp.user_type = 'acsm'
);

-- Comentários
COMMENT ON TABLE service_pricing IS 'Tabela para armazenar precificação hierárquica de serviços por tipo de usuário';
COMMENT ON COLUMN service_pricing.user_type IS 'Tipo de usuário: acsm (valor base), icetran (valor intermediário), despachante (valor final)';
COMMENT ON COLUMN service_pricing.pricing_type IS 'Tipo de precificação: fixed (valor fixo) ou percentage (percentual)';
COMMENT ON COLUMN service_pricing.fixed_value IS 'Valor fixo em reais';
COMMENT ON COLUMN service_pricing.percentage_value IS 'Valor percentual (0-100)';
COMMENT ON COLUMN service_pricing.minimum_value IS 'Valor mínimo quando usar percentual';