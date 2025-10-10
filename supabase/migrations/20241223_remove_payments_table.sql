-- Migração para remover a tabela payments e suas dependências
-- Data: 2024-12-23
-- Motivo: Unificação de dados na tabela service_orders

-- 1. Remover políticas RLS da tabela payments
DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;
DROP POLICY IF EXISTS "payments_delete_policy" ON payments;

-- 2. Remover índices da tabela payments
DROP INDEX IF EXISTS idx_payments_asaas_payment_id;
DROP INDEX IF EXISTS idx_payments_customer_id;
DROP INDEX IF EXISTS idx_payments_company_id;
DROP INDEX IF EXISTS idx_payments_status;
DROP INDEX IF EXISTS idx_payments_created_at;

-- 3. Remover foreign keys que referenciam payments
ALTER TABLE IF EXISTS service_orders DROP CONSTRAINT IF EXISTS service_orders_payment_id_fkey;
ALTER TABLE IF EXISTS payment_splits DROP CONSTRAINT IF EXISTS payment_splits_payment_id_fkey;

-- 4. Remover a tabela payments
DROP TABLE IF EXISTS payments CASCADE;

-- 5. Comentário de confirmação
COMMENT ON TABLE service_orders IS 'Tabela unificada para pedidos de serviço e pagamentos - payments table removida em 2024-12-23';

-- 6. Verificar se a coluna payment_id ainda existe em service_orders e removê-la se necessário
-- (Esta coluna não é mais necessária já que os dados estão unificados)
ALTER TABLE service_orders DROP COLUMN IF EXISTS payment_id;

COMMIT;