-- Criar tabela webhook_payments para armazenar dados completos do webhook
CREATE TABLE webhook_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_order_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
    payment_id TEXT NOT NULL, -- ID do pagamento do Asaas
    encoded_image TEXT, -- Base64 do QR Code
    payload JSONB, -- Payload completo do webhook
    invoice_url TEXT, -- URL da fatura
    description TEXT, -- Descrição da cobrança
    splits JSONB, -- Configuração de splits
    status TEXT, -- Status do pagamento
    value DECIMAL(10,2), -- Valor da cobrança
    due_date TIMESTAMP, -- Data de vencimento
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_webhook_payments_service_order_id ON webhook_payments(service_order_id);
CREATE INDEX idx_webhook_payments_payment_id ON webhook_payments(payment_id);
CREATE INDEX idx_webhook_payments_status ON webhook_payments(status);

-- RLS (Row Level Security)
ALTER TABLE webhook_payments ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados (usando client_id da service_orders)
CREATE POLICY "Users can view their own webhook payments" ON webhook_payments
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM service_orders so 
        JOIN clients c ON c.id = so.client_id 
        WHERE so.id = webhook_payments.service_order_id
    ));

CREATE POLICY "Users can insert their own webhook payments" ON webhook_payments
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM service_orders so 
        JOIN clients c ON c.id = so.client_id 
        WHERE so.id = webhook_payments.service_order_id
    ));

CREATE POLICY "Users can update their own webhook payments" ON webhook_payments
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM service_orders so 
        JOIN clients c ON c.id = so.client_id 
        WHERE so.id = webhook_payments.service_order_id
    ));

-- Permissões para roles
GRANT ALL PRIVILEGES ON webhook_payments TO authenticated;
GRANT SELECT ON webhook_payments TO anon;