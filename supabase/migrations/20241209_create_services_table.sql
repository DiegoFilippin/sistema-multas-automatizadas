-- Criação da tabela services para configuração de splits
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    pricing_type VARCHAR(20) NOT NULL CHECK (pricing_type IN ('percentage', 'fixed')),
    percentage_value DECIMAL(5,2) CHECK (percentage_value >= 0 AND percentage_value <= 100),
    minimum_value DECIMAL(10,2) CHECK (minimum_value >= 0),
    fixed_value DECIMAL(10,2) CHECK (fixed_value >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_pricing_type ON services(pricing_type);
CREATE INDEX idx_services_active ON services(is_active);

-- Habilitar RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Usuários autenticados podem visualizar serviços" ON services
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção/atualização para administradores
CREATE POLICY "Administradores podem gerenciar serviços" ON services
    FOR ALL USING (auth.role() = 'authenticated');

-- Inserir dados de exemplo
INSERT INTO services (name, description, category, pricing_type, percentage_value, minimum_value) VALUES
('Recurso de Multa', 'Serviço de elaboração de recurso contra multa de trânsito', 'Recursos', 'percentage', 15.00, 50.00),
('Defesa Prévia', 'Serviço de elaboração de defesa prévia', 'Recursos', 'percentage', 12.00, 40.00),
('Transferência de Veículo', 'Serviço de transferência de propriedade de veículo', 'Documentação', 'fixed', NULL, NULL);

UPDATE services SET fixed_value = 150.00 WHERE name = 'Transferência de Veículo';

-- Conceder permissões
GRANT SELECT ON services TO anon;
GRANT ALL PRIVILEGES ON services TO authenticated;