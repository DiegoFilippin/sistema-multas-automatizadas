-- Migração para unificar tabelas payments e service_orders
-- Adiciona colunas da tabela payments que não existem em service_orders

-- 1. Adicionar colunas que faltam em service_orders
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS credit_amount numeric,
ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_method character varying DEFAULT 'PIX',
ADD COLUMN IF NOT EXISTS pix_qr_code text,
ADD COLUMN IF NOT EXISTS pix_copy_paste text,
ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS asaas_webhook_data jsonb,
ADD COLUMN IF NOT EXISTS net_value numeric,
ADD COLUMN IF NOT EXISTS original_value numeric,
ADD COLUMN IF NOT EXISTS interest_value numeric,
ADD COLUMN IF NOT EXISTS installment_count integer,
ADD COLUMN IF NOT EXISTS installment_value numeric,
ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS client_payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_link character varying;

-- 2. Atualizar constraint de status para incluir novos valores
ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;
ALTER TABLE service_orders ADD CONSTRAINT service_orders_status_check 
CHECK (status::text = ANY (ARRAY[
    'pending_payment'::character varying, 
    'paid'::character varying, 
    'processing'::character varying, 
    'completed'::character varying, 
    'cancelled'::character varying, 
    'expired'::character varying,
    'pending'::character varying,
    'confirmed'::character varying,
    'refunded'::character varying
]::text[]));

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_orders_asaas_payment_id ON service_orders(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_payment_method ON service_orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_service_orders_confirmed_at ON service_orders(confirmed_at);

-- 4. Comentários nas novas colunas
COMMENT ON COLUMN service_orders.credit_amount IS 'Quantidade de créditos que serão adicionados';
COMMENT ON COLUMN service_orders.discount_percentage IS 'Percentual de desconto aplicado';
COMMENT ON COLUMN service_orders.payment_method IS 'Método de pagamento (PIX, boleto, etc.)';
COMMENT ON COLUMN service_orders.pix_qr_code IS 'Código QR do PIX para pagamento';
COMMENT ON COLUMN service_orders.pix_copy_paste IS 'Código copia e cola do PIX';
COMMENT ON COLUMN service_orders.confirmed_at IS 'Data e hora da confirmação do pagamento';
COMMENT ON COLUMN service_orders.cancelled_at IS 'Data e hora do cancelamento';
COMMENT ON COLUMN service_orders.asaas_webhook_data IS 'Dados recebidos do webhook do Asaas';
COMMENT ON COLUMN service_orders.net_value IS 'Valor líquido após taxas';
COMMENT ON COLUMN service_orders.original_value IS 'Valor original antes de descontos';
COMMENT ON COLUMN service_orders.interest_value IS 'Valor de juros aplicado';
COMMENT ON COLUMN service_orders.installment_count IS 'Número de parcelas';
COMMENT ON COLUMN service_orders.installment_value IS 'Valor de cada parcela';
COMMENT ON COLUMN service_orders.payment_date IS 'Data do pagamento';
COMMENT ON COLUMN service_orders.client_payment_date IS 'Data do pagamento pelo cliente';
COMMENT ON COLUMN service_orders.payment_link IS 'Link para pagamento';

-- 5. Atualizar tabela service_orders com dados da tabela payments onde existe relação
UPDATE service_orders 
SET 
    credit_amount = p.credit_amount,
    discount_percentage = p.discount_percentage,
    payment_method = p.payment_method,
    pix_qr_code = p.pix_qr_code,
    pix_copy_paste = p.pix_copy_paste,
    confirmed_at = p.confirmed_at,
    cancelled_at = p.cancelled_at,
    asaas_webhook_data = p.asaas_webhook_data,
    net_value = p.amount,
    original_value = p.amount,
    payment_date = p.confirmed_at,
    client_payment_date = p.confirmed_at
FROM payments p
WHERE service_orders.payment_id = p.id;

-- 6. Atualizar status baseado no status da tabela payments
UPDATE service_orders 
SET status = CASE 
    WHEN p.status = 'confirmed' THEN 'paid'
    WHEN p.status = 'cancelled' THEN 'cancelled'
    WHEN p.status = 'expired' THEN 'expired'
    WHEN p.status = 'pending' THEN 'pending_payment'
    ELSE service_orders.status
END
FROM payments p
WHERE service_orders.payment_id = p.id;

-- 7. Criar tabela de logs se não existir
CREATE TABLE IF NOT EXISTS migration_logs (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);

-- 8. Log da migração
INSERT INTO migration_logs (migration_name, executed_at, description) 
VALUES (
    'unify_payments_service_orders', 
    NOW(), 
    'Unificação das tabelas payments e service_orders - adicionadas colunas e migrados dados'
) ON CONFLICT DO NOTHING;