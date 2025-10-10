-- Criação das tabelas para sistema de serviços e configuração de splits

-- Tabela de serviços oferecidos
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    
    -- Configuração de precificação flexível
    pricing_type VARCHAR(20) NOT NULL CHECK (pricing_type IN ('percentage', 'fixed')),
    
    -- Para pricing_type = 'percentage'
    percentage_value DECIMAL(5,2), -- Ex: 15.50 para 15.5%
    minimum_amount DECIMAL(10,2), -- Valor mínimo numérico
    
    -- Para pricing_type = 'fixed'
    fixed_amount DECIMAL(10,2), -- Valor fixo por serviço
    
    -- Metadados
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Tabela de configuração de splits por serviço
CREATE TABLE IF NOT EXISTS split_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    
    -- Configuração dos splits (em percentuais)
    acsm_percentage DECIMAL(5,2) NOT NULL DEFAULT 0, -- Percentual para ACSM (conta master)
    icetran_percentage DECIMAL(5,2) NOT NULL DEFAULT 0, -- Percentual para ICETRAN (subconta)
    despachante_percentage DECIMAL(5,2) NOT NULL DEFAULT 100, -- Percentual para despachante (restante)
    
    -- Valores mínimos opcionais para cada split
    acsm_minimum DECIMAL(10,2) DEFAULT 0,
    icetran_minimum DECIMAL(10,2) DEFAULT 0,
    despachante_minimum DECIMAL(10,2) DEFAULT 0,
    
    -- Configurações adicionais
    notes TEXT, -- Observações sobre a configuração
    active BOOLEAN DEFAULT true,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraint para garantir que os percentuais não excedam 100%
    CONSTRAINT valid_split_percentages CHECK (
        acsm_percentage + icetran_percentage + despachante_percentage <= 100
    ),
    
    -- Constraint para garantir que os percentuais sejam não-negativos
    CONSTRAINT non_negative_percentages CHECK (
        acsm_percentage >= 0 AND 
        icetran_percentage >= 0 AND 
        despachante_percentage >= 0
    )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_pricing_type ON services(pricing_type);
CREATE INDEX IF NOT EXISTS idx_split_configurations_service_id ON split_configurations(service_id);
CREATE INDEX IF NOT EXISTS idx_split_configurations_active ON split_configurations(active);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_split_configurations_updated_at BEFORE UPDATE ON split_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_configurations ENABLE ROW LEVEL SECURITY;

-- Política para services: usuários autenticados podem ver e gerenciar
CREATE POLICY "Users can view services" ON services
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert services" ON services
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update services" ON services
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete services" ON services
    FOR DELETE USING (auth.role() = 'authenticated');

-- Política para split_configurations: usuários autenticados podem ver e gerenciar
CREATE POLICY "Users can view split configurations" ON split_configurations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert split configurations" ON split_configurations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update split configurations" ON split_configurations
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete split configurations" ON split_configurations
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grants para as roles anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON services TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON split_configurations TO anon, authenticated;

-- Inserir alguns serviços de exemplo
INSERT INTO services (name, description, category, pricing_type, percentage_value, minimum_amount) VALUES
('Recurso de Multa Simples', 'Recurso administrativo para multas de trânsito simples', 'Recursos', 'percentage', 15.00, 50.00),
('Recurso de Multa Complexa', 'Recurso administrativo para multas de trânsito complexas', 'Recursos', 'percentage', 20.00, 100.00),
('Defesa Prévia', 'Defesa prévia de autuação de trânsito', 'Defesas', 'fixed', NULL, NULL),
('Indicação de Condutor', 'Indicação de condutor responsável pela infração', 'Indicações', 'fixed', NULL, NULL);

-- Atualizar os serviços com valores fixos
UPDATE services SET fixed_amount = 80.00 WHERE name = 'Defesa Prévia';
UPDATE services SET fixed_amount = 30.00 WHERE name = 'Indicação de Condutor';

-- Inserir configurações de split de exemplo após criar os serviços
DO $$
DECLARE
    service_record RECORD;
BEGIN
    FOR service_record IN SELECT id FROM services LOOP
        INSERT INTO split_configurations (service_id, acsm_percentage, icetran_percentage, despachante_percentage, notes)
        VALUES (
            service_record.id,
            10.00, -- 10% para ACSM
            5.00,  -- 5% para ICETRAN
            85.00, -- 85% para despachante
            'Configuração padrão de splits'
        );
    END LOOP;
END $$;