-- Adicionar campos para dados do webhook na tabela service_orders
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS qr_code_image TEXT,
ADD COLUMN IF NOT EXISTS pix_payload TEXT,
ADD COLUMN IF NOT EXISTS invoice_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS payment_description TEXT,
ADD COLUMN IF NOT EXISTS webhook_response JSONB;

-- Comentários para documentação
COMMENT ON COLUMN service_orders.qr_code_image IS 'Base64 encoded QR code image from Asaas webhook';
COMMENT ON COLUMN service_orders.pix_payload IS 'PIX payload string for copy/paste';
COMMENT ON COLUMN service_orders.invoice_url IS 'URL to view invoice on Asaas platform';
COMMENT ON COLUMN service_orders.payment_description IS 'Payment description from webhook';
COMMENT ON COLUMN service_orders.webhook_response IS 'Complete webhook response for debugging';