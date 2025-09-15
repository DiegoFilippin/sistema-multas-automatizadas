-- Verificar se existem cobranças no banco de dados

-- 1. Verificar total de registros na tabela payments
SELECT 'payments' as tabela, COUNT(*) as total_registros FROM payments;

-- 2. Verificar total de registros na tabela asaas_payments
SELECT 'asaas_payments' as tabela, COUNT(*) as total_registros FROM asaas_payments;

-- 3. Verificar registros recentes na tabela payments
SELECT 
  id,
  amount,
  credit_amount,
  status,
  payment_method,
  due_date,
  created_at,
  company_id
FROM payments 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Verificar registros recentes na tabela asaas_payments
SELECT 
  id,
  amount,
  status,
  payment_method,
  due_date,
  created_at,
  company_id
FROM asaas_payments 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Verificar status dos pagamentos
SELECT 
  'payments' as tabela,
  status,
  COUNT(*) as quantidade
FROM payments 
GROUP BY status;

SELECT 
  'asaas_payments' as tabela,
  status,
  COUNT(*) as quantidade
FROM asaas_payments 
GROUP BY status;

-- 6. Verificar pagamentos por empresa
SELECT 
  c.nome as empresa,
  COUNT(p.id) as total_payments,
  SUM(p.amount) as valor_total
FROM payments p
JOIN companies c ON p.company_id = c.id
GROUP BY c.id, c.nome
ORDER BY total_payments DESC;

-- 7. Verificar cobranças Asaas por empresa
SELECT 
  c.nome as empresa,
  COUNT(ap.id) as total_asaas_payments,
  SUM(ap.amount) as valor_total
FROM asaas_payments ap
JOIN companies c ON ap.company_id = c.id
GROUP BY c.id, c.nome
ORDER BY total_asaas_payments DESC;