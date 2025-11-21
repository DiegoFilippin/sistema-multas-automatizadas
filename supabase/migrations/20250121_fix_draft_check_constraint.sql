-- Migration para corrigir constraint de rascunhos
-- Rascunhos podem ter client_id e service_id em qualquer combinação (NULL ou preenchido)
-- Apenas status != 'rascunho' exige que ambos estejam preenchidos

-- 1. Remover constraint antiga muito restritiva
ALTER TABLE service_orders 
DROP CONSTRAINT IF EXISTS service_orders_draft_check;

-- 2. Adicionar nova constraint mais flexível
ALTER TABLE service_orders
ADD CONSTRAINT service_orders_draft_check 
CHECK (
  -- Rascunhos podem ter qualquer combinação de client_id e service_id
  status = 'rascunho' OR
  -- Outros status exigem ambos preenchidos
  (status != 'rascunho' AND client_id IS NOT NULL AND service_id IS NOT NULL)
);

-- 3. Comentário
COMMENT ON CONSTRAINT service_orders_draft_check ON service_orders IS 
'Rascunhos podem ter client_id e service_id NULL ou preenchidos. Outros status exigem ambos preenchidos.';
