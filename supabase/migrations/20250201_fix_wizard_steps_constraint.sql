-- Migration: Corrigir constraint de current_step para suportar 5 steps
-- E adicionar coluna asaas_payment_id se não existir

-- 1. Remover constraint antiga de current_step
ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_current_step_check;

-- 2. Adicionar nova constraint com 5 steps
ALTER TABLE service_orders ADD CONSTRAINT service_orders_current_step_check 
CHECK (current_step >= 1 AND current_step <= 5);

-- 3. Adicionar coluna asaas_payment_id se não existir
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS asaas_payment_id VARCHAR(100);

-- 4. Criar índice para asaas_payment_id
CREATE INDEX IF NOT EXISTS idx_service_orders_asaas_payment_id ON service_orders(asaas_payment_id);

-- 5. Comentários para documentação
COMMENT ON COLUMN service_orders.current_step IS 'Step atual do wizard (1=Cliente, 2=Serviço, 3=Pagamento, 4=Confirmação, 5=Recurso)';
COMMENT ON COLUMN service_orders.asaas_payment_id IS 'ID do pagamento no Asaas para rastreamento';
