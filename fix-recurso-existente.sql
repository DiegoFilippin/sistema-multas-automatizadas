-- Script para vincular recurso existente à service_order
-- Execute este script no Supabase SQL Editor

-- 1. Encontrar o recurso mais recente sem service_order vinculada
WITH ultimo_recurso AS (
  SELECT r.id as recurso_id, r.multa_id, r.company_id
  FROM recursos r
  WHERE r.company_id = 'c4519363-b0e2-42fa-b6bc-6675af267df7'
  ORDER BY r.created_at DESC
  LIMIT 1
)
-- 2. Atualizar service_order com o recurso_id
UPDATE service_orders so
SET 
  recurso_id = (SELECT recurso_id FROM ultimo_recurso),
  recurso_status = 'iniciado',
  recurso_initiated_at = NOW()
FROM ultimo_recurso ur
WHERE so.asaas_payment_id = 'pay_l3arrnq2ec3b5h2j'
  AND so.company_id = ur.company_id
RETURNING so.id, so.asaas_payment_id, so.recurso_id;
