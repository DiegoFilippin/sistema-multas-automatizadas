-- Buscar o ID real do pagamento de teste
SELECT 
    id,
    asaas_payment_id,
    company_id,
    amount,
    credit_amount,
    status
FROM payments 
WHERE asaas_payment_id = 'pay_test_12345';