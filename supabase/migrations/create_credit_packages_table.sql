-- Criar tabela de pacotes de créditos
CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    credit_amount DECIMAL(10,2) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('client', 'company')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimizar consultas
CREATE INDEX idx_credit_packages_target_type ON credit_packages(target_type);
CREATE INDEX idx_credit_packages_active ON credit_packages(is_active);
CREATE INDEX idx_credit_packages_price ON credit_packages(price);

-- Comentários para documentação
COMMENT ON TABLE credit_packages IS 'Pacotes de créditos disponíveis para compra';
COMMENT ON COLUMN credit_packages.name IS 'Nome do pacote de créditos';
COMMENT ON COLUMN credit_packages.description IS 'Descrição detalhada do pacote';
COMMENT ON COLUMN credit_packages.credit_amount IS 'Quantidade de créditos no pacote';
COMMENT ON COLUMN credit_packages.price IS 'Preço do pacote em reais';
COMMENT ON COLUMN credit_packages.discount_percentage IS 'Percentual de desconto aplicado';
COMMENT ON COLUMN credit_packages.target_type IS 'Tipo de cliente: client ou company';
COMMENT ON COLUMN credit_packages.is_active IS 'Se o pacote está ativo para venda';

-- Habilitar RLS (Row Level Security)
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

-- Política para permitir que todos vejam pacotes ativos
CREATE POLICY "Everyone can view active packages" ON credit_packages
    FOR SELECT USING (is_active = true);

-- Política para permitir que apenas admins gerenciem pacotes
CREATE POLICY "Only admins can manage packages" ON credit_packages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('Super Admin', 'ICETRAN')
        )
    );

-- Conceder permissões para roles
GRANT SELECT ON credit_packages TO authenticated;
GRANT SELECT ON credit_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON credit_packages TO service_role;

-- Função para atualizar automaticamente o updated_at
CREATE OR REPLACE FUNCTION update_credit_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER trigger_update_credit_packages_updated_at
    BEFORE UPDATE ON credit_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_packages_updated_at();

-- Inserir pacotes padrão para clientes
INSERT INTO credit_packages (name, description, credit_amount, price, discount_percentage, target_type) VALUES
('Básico', '10 créditos para serviços básicos', 10.00, 15.00, 0.00, 'client'),
('Intermediário', '25 créditos com 5% de desconto', 25.00, 35.63, 5.00, 'client'),
('Avançado', '50 créditos com 10% de desconto', 50.00, 67.50, 10.00, 'client'),
('Premium', '100 créditos com 15% de desconto', 100.00, 127.50, 15.00, 'client');

-- Inserir pacotes padrão para empresas (despachantes)
INSERT INTO credit_packages (name, description, credit_amount, price, discount_percentage, target_type) VALUES
('Empresarial Básico', '50 créditos com 15% de desconto', 50.00, 63.75, 15.00, 'company'),
('Empresarial Plus', '100 créditos com 20% de desconto', 100.00, 120.00, 20.00, 'company'),
('Empresarial Pro', '250 créditos com 25% de desconto', 250.00, 281.25, 25.00, 'company'),
('Empresarial Master', '500 créditos com 30% de desconto', 500.00, 525.00, 30.00, 'company');

-- Comentários sobre os pacotes inseridos
COMMENT ON TABLE credit_packages IS 'Pacotes de créditos com valores calculados: Básico (R$1,50/crédito), Intermediário (R$1,425/crédito), Avançado (R$1,35/crédito), Premium (R$1,275/crédito). Empresariais com descontos maiores para incentivar compras em volume.';