-- Migration para permitir amount = 0 em rascunhos
-- Rascunhos podem ser criados antes de selecionar o serviço (que define o valor)

-- 1. Remover constraint antiga que exige amount > 0
ALTER TABLE service_orders 
DROP CONSTRAINT IF EXISTS service_orders_amount_check;

-- 2. Adicionar nova constraint que permite amount = 0 apenas para rascunhos
ALTER TABLE service_orders
ADD CONSTRAINT service_orders_amount_check 
CHECK (
  (status = 'rascunho' AND amount >= 0) OR
  (status != 'rascunho' AND amount > 0)
);

-- 3. Comentário
COMMENT ON CONSTRAINT service_orders_amount_check ON service_orders IS 
'Permite amount = 0 apenas para status rascunho. Para outros status, amount deve ser maior que 0.';
