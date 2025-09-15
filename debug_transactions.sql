-- Query para verificar dados nas tabelas relacionadas a transações de crédito

-- 1. Verificar pagamentos recentes
SELECT 
    p.id,
    p.asaas_payment_id,
    p.customer_id,
    p.company_id,
    p.amount,
    p.credit_amount,
    p.status,
    p.created_at,
    p.confirmed_at,
    c.nome as company_name
FROM payments p
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 2. Verificar transações de crédito recentes
SELECT 
    ct.id,
    ct.credit_id,
    ct.transaction_type,
    ct.amount,
    ct.balance_before,
    ct.balance_after,
    ct.payment_id,
    ct.description,
    ct.created_at,
    cr.owner_type,
    cr.owner_id
FROM credit_transactions ct
LEFT JOIN credits cr ON ct.credit_id = cr.id
ORDER BY ct.created_at DESC
LIMIT 10;

-- 3. Verificar pagamentos confirmados sem transação de crédito correspondente
SELECT 
    p.id as payment_id,
    p.asaas_payment_id,
    p.company_id,
    p.credit_amount,
    p.status,
    p.confirmed_at,
    ct.id as transaction_id
FROM payments p
LEFT JOIN credit_transactions ct ON p.id = ct.payment_id
WHERE p.status = 'confirmed' 
    AND ct.id IS NULL
ORDER BY p.confirmed_at DESC;

-- 4. Verificar contas de crédito das empresas
SELECT 
    cr.id,
    cr.owner_type,
    cr.owner_id,
    cr.balance,
    cr.total_purchased,
    cr.total_used,
    cr.created_at,
    c.nome as company_name
FROM credits cr
LEFT JOIN companies c ON cr.owner_id = c.id
WHERE cr.owner_type = 'company'
ORDER BY cr.created_at DESC;

-- 5. Verificar se há pagamentos pendentes recentes
SELECT 
    p.id,
    p.asaas_payment_id,
    p.company_id,
    p.credit_amount,
    p.status,
    p.created_at,
    c.nome as company_name
FROM payments p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.status = 'pending'
ORDER BY p.created_at DESC
LIMIT 5;