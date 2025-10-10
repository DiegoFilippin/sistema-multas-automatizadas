-- Criar tabela de pagamentos PIX para compra de créditos
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asaas_payment_id VARCHAR(100) UNIQUE,
    customer_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    credit_amount DECIMAL(10,2) NOT NULL, -- Créditos que serão adicionados
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'PIX',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired', 'refunded')),
    pix_qr_code TEXT,
    pix_copy_paste TEXT,
    due_date DATE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    asaas_webhook_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimizar consultas
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_company_id ON payments(company_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_asaas_id ON payments(asaas_payment_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- Comentários para documentação
COMMENT ON TABLE payments IS 'Pagamentos PIX para compra de créditos via Asaas';
COMMENT ON COLUMN payments.asaas_payment_id IS 'ID do pagamento no Asaas';
COMMENT ON COLUMN payments.customer_id IS 'Cliente que está comprando os créditos';
COMMENT ON COLUMN payments.company_id IS 'Empresa/despachante responsável';
COMMENT ON COLUMN payments.amount IS 'Valor total do pagamento em reais';
COMMENT ON COLUMN payments.credit_amount IS 'Quantidade de créditos que serão adicionados';
COMMENT ON COLUMN payments.discount_percentage IS 'Percentual de desconto aplicado';
COMMENT ON COLUMN payments.payment_method IS 'Método de pagamento (PIX, boleto, etc.)';
COMMENT ON COLUMN payments.status IS 'Status do pagamento: pending, confirmed, cancelled, expired, refunded';
COMMENT ON COLUMN payments.pix_qr_code IS 'Código QR do PIX para pagamento';
COMMENT ON COLUMN payments.pix_copy_paste IS 'Código copia e cola do PIX';
COMMENT ON COLUMN payments.due_date IS 'Data de vencimento do pagamento';
COMMENT ON COLUMN payments.confirmed_at IS 'Data e hora da confirmação do pagamento';
COMMENT ON COLUMN payments.cancelled_at IS 'Data e hora do cancelamento';
COMMENT ON COLUMN payments.asaas_webhook_data IS 'Dados recebidos do webhook do Asaas';

-- Habilitar RLS (Row Level Security)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas seus próprios pagamentos
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM clients WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        ) OR
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Política para permitir que o sistema gerencie pagamentos
CREATE POLICY "System can manage payments" ON payments
    FOR ALL USING (true);

-- Conceder permissões para roles
GRANT SELECT, INSERT, UPDATE ON payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO service_role;
GRANT SELECT ON payments TO anon;

-- Função para atualizar automaticamente o updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Adicionar referência de payment_id na tabela credit_transactions
ALTER TABLE credit_transactions 
ADD CONSTRAINT fk_credit_transactions_payment_id 
FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;