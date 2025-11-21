-- Migration para permitir client_id e service_id NULL em rascunhos
-- Isso permite criar o rascunho antes de selecionar cliente e serviço

-- 1. Remover constraint que exige client_id e company_id
ALTER TABLE service_orders 
DROP CONSTRAINT IF EXISTS service_orders_client_company_check;

-- 2. Permitir NULL em client_id e service_id para rascunhos
ALTER TABLE service_orders 
ALTER COLUMN client_id DROP NOT NULL,
ALTER COLUMN service_id DROP NOT NULL;

-- 3. Adicionar nova constraint que permite NULL apenas para rascunhos
ALTER TABLE service_orders
ADD CONSTRAINT service_orders_draft_check 
CHECK (
  (status = 'rascunho' AND client_id IS NULL AND service_id IS NULL) OR
  (status != 'rascunho' AND client_id IS NOT NULL AND service_id IS NOT NULL)
);

-- 4. Comentários
COMMENT ON CONSTRAINT service_orders_draft_check ON service_orders IS 
'Permite client_id e service_id NULL apenas para status rascunho. Para outros status, ambos são obrigatórios.';

-- 5. Verificar estrutura
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'service_orders' 
AND column_name IN ('client_id', 'service_id', 'status')
ORDER BY column_name;
