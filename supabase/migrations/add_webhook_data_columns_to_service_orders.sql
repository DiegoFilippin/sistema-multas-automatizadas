-- Adicionar colunas para armazenar dados completos do webhook na tabela service_orders
-- Estas colunas armazenarão todas as informações retornadas pelo webhook do Asaas

-- Adicionar colunas para dados do webhook
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS qr_code_image TEXT,
ADD COLUMN IF NOT EXISTS pix_payload TEXT,
ADD COLUMN IF NOT EXISTS invoice_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS date_created DATE,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS payment_description TEXT,
ADD COLUMN IF NOT EXISTS splits_details JSONB,
ADD COLUMN IF NOT EXISTS webhook_response JSONB;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_orders_external_reference 
ON service_orders(external_reference) 
WHERE external_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_orders_invoice_number 
ON service_orders(invoice_number) 
WHERE invoice_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_orders_billing_type 
ON service_orders(billing_type) 
WHERE billing_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_orders_due_date 
ON service_orders(due_date) 
WHERE due_date IS NOT NULL;

-- Adicionar comentários nas colunas
COMMENT ON COLUMN service_orders.qr_code_image IS 'QR Code em base64 para pagamento PIX';
COMMENT ON COLUMN service_orders.pix_payload IS 'Código PIX copia e cola';
COMMENT ON COLUMN service_orders.invoice_url IS 'URL da fatura no Asaas';
COMMENT ON COLUMN service_orders.invoice_number IS 'Número da fatura';
COMMENT ON COLUMN service_orders.external_reference IS 'Referência externa do pagamento';
COMMENT ON COLUMN service_orders.billing_type IS 'Tipo de cobrança (PIX, BOLETO, CREDIT_CARD)';
COMMENT ON COLUMN service_orders.date_created IS 'Data de criação da cobrança';
COMMENT ON COLUMN service_orders.due_date IS 'Data de vencimento da cobrança';
COMMENT ON COLUMN service_orders.payment_description IS 'Descrição completa do pagamento';
COMMENT ON COLUMN service_orders.splits_details IS 'Detalhes completos dos splits (array com IDs, walletIds, valores, status)';
COMMENT ON COLUMN service_orders.webhook_response IS 'Resposta completa do webhook para referência';

-- Verificar se as colunas foram criadas corretamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'service_orders' 
AND column_name IN (
  'qr_code_image', 'pix_payload', 'invoice_url', 'invoice_number', 
  'external_reference', 'billing_type', 'date_created', 'due_date',
  'payment_description', 'splits_details', 'webhook_response'
)
ORDER BY column_name;