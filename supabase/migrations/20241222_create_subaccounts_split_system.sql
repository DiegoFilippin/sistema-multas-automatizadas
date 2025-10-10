-- Migration: Sistema de Subcontas Asaas com Split de Pagamentos
-- Criação das tabelas para subcontas e divisão automática de pagamentos

-- Tabela de subcontas Asaas
CREATE TABLE asaas_subaccounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    asaas_account_id VARCHAR(100) NOT NULL UNIQUE, -- ID da subconta no Asaas
    wallet_id VARCHAR(100) NOT NULL UNIQUE, -- Wallet ID para splits
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('subadquirente', 'despachante')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    api_key VARCHAR(200), -- Chave API da subconta (se aplicável)
    webhook_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de configurações de split
CREATE TABLE split_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR(50) NOT NULL, -- 'recurso', 'assinatura_acompanhamento'
    acsm_percentage DECIMAL(5,2) NOT NULL DEFAULT 30.00, -- % para ACSM
    icetran_percentage DECIMAL(5,2) NOT NULL DEFAULT 20.00, -- % para ICETRAN
    despachante_percentage DECIMAL(5,2) NOT NULL DEFAULT 50.00, -- % para Despachante
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT check_split_total CHECK (
        acsm_percentage + icetran_percentage + despachante_percentage = 100.00
    )
);

-- Tabela de splits de pagamento
CREATE TABLE payment_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES asaas_payments(id),
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('acsm', 'icetran', 'despachante')),
    recipient_company_id UUID REFERENCES companies(id),
    wallet_id VARCHAR(100), -- Wallet ID do destinatário
    split_percentage DECIMAL(5,2) NOT NULL,
    split_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    asaas_split_id VARCHAR(100), -- ID do split no Asaas
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alterações em tabelas existentes
-- Adicionar campos para subcontas na tabela companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS asaas_subaccount_id UUID REFERENCES asaas_subaccounts(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES companies(id); -- Para hierarquia
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_level VARCHAR(20) DEFAULT 'despachante' 
    CHECK (company_level IN ('master', 'subadquirente', 'despachante'));

-- Adicionar campos para split na tabela asaas_payments
ALTER TABLE asaas_payments ADD COLUMN IF NOT EXISTS has_split BOOLEAN DEFAULT false;
ALTER TABLE asaas_payments ADD COLUMN IF NOT EXISTS split_status VARCHAR(20) DEFAULT 'none' 
    CHECK (split_status IN ('none', 'pending', 'processed', 'failed'));
ALTER TABLE asaas_payments ADD COLUMN IF NOT EXISTS total_split_amount DECIMAL(10,2);

-- Índices para performance
CREATE INDEX idx_asaas_subaccounts_company_id ON asaas_subaccounts(company_id);
CREATE INDEX idx_asaas_subaccounts_wallet_id ON asaas_subaccounts(wallet_id);
CREATE INDEX idx_asaas_subaccounts_account_type ON asaas_subaccounts(account_type);
CREATE INDEX idx_split_configurations_service_type ON split_configurations(service_type, is_active);
CREATE INDEX idx_payment_splits_payment_id ON payment_splits(payment_id);
CREATE INDEX idx_payment_splits_recipient ON payment_splits(recipient_company_id);
CREATE INDEX idx_payment_splits_status ON payment_splits(status);
CREATE INDEX idx_companies_parent ON companies(parent_company_id);
CREATE INDEX idx_companies_level ON companies(company_level);
CREATE INDEX idx_asaas_payments_split_status ON asaas_payments(split_status);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_asaas_subaccounts_updated_at 
    BEFORE UPDATE ON asaas_subaccounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_split_configurations_updated_at 
    BEFORE UPDATE ON split_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_splits_updated_at 
    BEFORE UPDATE ON payment_splits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE asaas_subaccounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Admin Master pode gerenciar tudo
CREATE POLICY "Admin master can manage subaccounts" ON asaas_subaccounts FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() AND u.role = 'admin_master'
    )
);

CREATE POLICY "Admin master can manage split configurations" ON split_configurations FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() AND u.role = 'admin_master'
    )
);

CREATE POLICY "Users can view their payment splits" ON payment_splits FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM asaas_payments ap
        JOIN companies c ON ap.company_id = c.id
        JOIN users u ON c.id = u.company_id
        WHERE ap.id = payment_splits.payment_id AND u.id = auth.uid()
    )
);

CREATE POLICY "Admin master can manage payment splits" ON payment_splits FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() AND u.role = 'admin_master'
    )
);

-- Inserir configurações padrão de split
INSERT INTO split_configurations (service_type, acsm_percentage, icetran_percentage, despachante_percentage) VALUES
('recurso', 30.00, 20.00, 50.00),
('assinatura_acompanhamento', 40.00, 15.00, 45.00);

-- Comentários nas tabelas
COMMENT ON TABLE asaas_subaccounts IS 'Subcontas do Asaas para empresas e despachantes';
COMMENT ON TABLE split_configurations IS 'Configurações de percentuais para split de pagamentos';
COMMENT ON TABLE payment_splits IS 'Registros de splits executados nos pagamentos';
COMMENT ON COLUMN asaas_subaccounts.wallet_id IS 'ID da carteira para recebimento de splits';
COMMENT ON COLUMN split_configurations.acsm_percentage IS 'Percentual que fica com a ACSM (empresa master)';
COMMENT ON COLUMN split_configurations.icetran_percentage IS 'Percentual que vai para a ICETRAN (subadquirente)';
COMMENT ON COLUMN split_configurations.despachante_percentage IS 'Percentual que vai para o despachante';