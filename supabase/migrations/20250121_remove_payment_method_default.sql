-- Migration para remover valor padrão inválido de payment_method
-- O valor padrão 'asaas' não está na lista de valores permitidos

-- Remover valor padrão
ALTER TABLE service_orders 
ALTER COLUMN payment_method DROP DEFAULT;

-- Comentário
COMMENT ON COLUMN service_orders.payment_method IS 
'Método de pagamento: NULL (rascunho), prepaid (saldo pré-pago) ou charge (cobrança Asaas)';
