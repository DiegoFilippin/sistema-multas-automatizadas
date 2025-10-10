-- Verificar dados de créditos e transações

-- 1. Verificar contas de créditos existentes
SELECT 
    id,
    owner_type,
    owner_id,
    balance,
    total_purchased,
    total_used,
    created_at
FROM credits
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar transações de crédito
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

-- 3. Verificar pagamentos recentes
SELECT 
    id,
    asaas_payment_id,
    company_id,
    amount,
    credit_amount,
    status,
    confirmed_at,
    created_at
FROM payments
WHERE asaas_payment_id = 'pay_test_12345'
OR created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 4. Verificar se há conta de créditos para a empresa de teste
SELECT 
    cr.*,
    c.nome as company_name
FROM credits cr
LEFT JOIN companies c ON cr.owner_id = c.id
WHERE cr.owner_type = 'company'
    AND cr.owner_id = '550e8400-e29b-41d4-a716-446655440000';