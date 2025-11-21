-- Migration para permitir payment_method NULL em rascunhos
-- Rascunhos podem ser criados antes de selecionar o método de pagamento

-- 1. Remover constraint antiga
ALTER TABLE service_orders 
DROP CONSTRAINT IF EXISTS service_orders_payment_method_check;

-- 2. Adicionar nova constraint que permite NULL para rascunhos
ALTER TABLE service_orders
ADD CONSTRAINT service_orders_payment_method_check 
CHECK (
  payment_method IS NULL OR 
  payment_method IN ('prepaid', 'charge')
);

-- 3. Comentário
COMMENT ON CONSTRAINT service_orders_payment_method_check ON service_orders IS 
'Permite payment_method NULL (para rascunhos) ou valores válidos: prepaid, charge';
