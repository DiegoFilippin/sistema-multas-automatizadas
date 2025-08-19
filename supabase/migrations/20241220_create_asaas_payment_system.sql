-- Migration: Sistema de Pagamentos Asaas
-- Criação das tabelas para integração completa com Asaas

-- Tabela de configurações do Asaas
CREATE TABLE asaas_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_master_id UUID REFERENCES companies_master(id) ON DELETE CASCADE,
    api_key_sandbox TEXT,
    api_key_production TEXT,
    environment VARCHAR(20) DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
    webhook_url TEXT,
    webhook_token TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de preços base (Admin Master)
CREATE TABLE pricing_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(50) NOT NULL, -- 'recurso', 'acompanhamento_multa', 'consulta_veiculo', etc
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de preços da empresa (margem sobre preço base)
CREATE TABLE pricing_company (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_master_id UUID REFERENCES companies_master(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    markup_percentage DECIMAL(5,2) DEFAULT 0, -- Porcentagem de margem sobre o preço base
    fixed_markup DECIMAL(10,2) DEFAULT 0, -- Valor fixo de margem
    final_price DECIMAL(10,2), -- Preço final calculado
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de preços do despachante (valor final para cliente)
CREATE TABLE pricing_dispatcher (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL, -- Preço que o despachante paga
    client_price DECIMAL(10,2) NOT NULL, -- Preço que cobra do cliente
    profit_margin DECIMAL(10,2) GENERATED ALWAYS AS (client_price - base_price) STORED,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de clientes Asaas (para sincronização)
CREATE TABLE asaas_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    asaas_customer_id VARCHAR(100) UNIQUE NOT NULL,
    sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'error')),
    last_sync_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de transações/pagamentos
CREATE TABLE asaas_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    asaas_payment_id VARCHAR(100) UNIQUE NOT NULL,
    asaas_customer_id VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID, -- ID do recurso, multa, etc
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    payment_method VARCHAR(50), -- 'BOLETO', 'CREDIT_CARD', 'PIX', etc
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 'REFUNDED', 'RECEIVED_IN_CASH', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'AWAITING_RISK_ANALYSIS'
    )),
    payment_date TIMESTAMPTZ,
    net_value DECIMAL(10,2), -- Valor líquido após taxas
    asaas_fee DECIMAL(10,2), -- Taxa do Asaas
    company_revenue DECIMAL(10,2), -- Receita da empresa master
    dispatcher_cost DECIMAL(10,2), -- Custo para o despachante
    external_reference VARCHAR(100), -- Referência externa
    invoice_url TEXT,
    bank_slip_url TEXT,
    pix_qr_code TEXT,
    pix_copy_paste TEXT,
    webhook_received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de assinaturas (para acompanhamento de multas)
CREATE TABLE asaas_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    asaas_subscription_id VARCHAR(100) UNIQUE NOT NULL,
    asaas_customer_id VARCHAR(100) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    cycle VARCHAR(20) DEFAULT 'MONTHLY' CHECK (cycle IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY')),
    description TEXT,
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')),
    next_due_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de webhooks recebidos
CREATE TABLE asaas_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    asaas_payment_id VARCHAR(100),
    asaas_subscription_id VARCHAR(100),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de logs de transações
CREATE TABLE asaas_transaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES asaas_payments(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'payment_received', etc
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    details JSONB,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_asaas_config_company_master ON asaas_config(company_master_id);
CREATE INDEX idx_pricing_company_master ON pricing_company(company_master_id);
CREATE INDEX idx_pricing_dispatcher_company ON pricing_dispatcher(company_id);
CREATE INDEX idx_asaas_customers_client ON asaas_customers(client_id);
CREATE INDEX idx_asaas_customers_asaas_id ON asaas_customers(asaas_customer_id);
CREATE INDEX idx_asaas_payments_company ON asaas_payments(company_id);
CREATE INDEX idx_asaas_payments_client ON asaas_payments(client_id);
CREATE INDEX idx_asaas_payments_asaas_id ON asaas_payments(asaas_payment_id);
CREATE INDEX idx_asaas_payments_status ON asaas_payments(status);
CREATE INDEX idx_asaas_payments_due_date ON asaas_payments(due_date);
CREATE INDEX idx_asaas_subscriptions_company ON asaas_subscriptions(company_id);
CREATE INDEX idx_asaas_subscriptions_client ON asaas_subscriptions(client_id);
CREATE INDEX idx_asaas_subscriptions_asaas_id ON asaas_subscriptions(asaas_subscription_id);
CREATE INDEX idx_asaas_webhooks_event_type ON asaas_webhooks(event_type);
CREATE INDEX idx_asaas_webhooks_processed ON asaas_webhooks(processed);
CREATE INDEX idx_asaas_transaction_logs_payment ON asaas_transaction_logs(payment_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_asaas_config_updated_at BEFORE UPDATE ON asaas_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_base_updated_at BEFORE UPDATE ON pricing_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_company_updated_at BEFORE UPDATE ON pricing_company FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_dispatcher_updated_at BEFORE UPDATE ON pricing_dispatcher FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asaas_payments_updated_at BEFORE UPDATE ON asaas_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asaas_subscriptions_updated_at BEFORE UPDATE ON asaas_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir tipos de recursos padrão
INSERT INTO pricing_base (resource_type, price, description) VALUES
('recurso_multa', 50.00, 'Geração de recurso de multa'),
('acompanhamento_multa', 15.00, 'Acompanhamento mensal de multa'),
('consulta_veiculo', 5.00, 'Consulta de dados do veículo'),
('analise_juridica', 100.00, 'Análise jurídica especializada'),
('protocolo_recurso', 25.00, 'Protocolo de recurso nos órgãos');

-- Comentários nas tabelas
COMMENT ON TABLE asaas_config IS 'Configurações da integração com Asaas por empresa master';
COMMENT ON TABLE pricing_base IS 'Preços base definidos pelo admin master';
COMMENT ON TABLE pricing_company IS 'Preços com margem da empresa master';
COMMENT ON TABLE pricing_dispatcher IS 'Preços finais definidos pelos despachantes';
COMMENT ON TABLE asaas_customers IS 'Sincronização de clientes com Asaas';
COMMENT ON TABLE asaas_payments IS 'Pagamentos e cobranças via Asaas';
COMMENT ON TABLE asaas_subscriptions IS 'Assinaturas para acompanhamento de multas';
COMMENT ON TABLE asaas_webhooks IS 'Webhooks recebidos do Asaas';
COMMENT ON TABLE asaas_transaction_logs IS 'Logs de transações e mudanças de status';