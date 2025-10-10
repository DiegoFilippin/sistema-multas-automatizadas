-- Verificar empresas existentes e criar pagamento de teste

-- Buscar uma empresa existente
SELECT id, nome, cnpj, asaas_customer_id FROM companies LIMIT 5;

-- Criar um pagamento de teste usando a primeira empresa encontrada
-- (Vamos usar um ID genérico que será substituído)
WITH first_company AS (
  SELECT id FROM companies LIMIT 1
)
INSERT INTO payments (
  id,
  asaas_payment_id,
  customer_id,
  company_id,
  amount,
  credit_amount,
  discount_percentage,
  payment_method,
  status,
  pix_qr_code,
  pix_copy_paste,
  due_date,
  created_at
)
SELECT 
  gen_random_uuid(),
  'pay_test_12345',
  NULL, -- NULL para compra da empresa
  fc.id,
  120.00,
  100.00,
  20.00,
  'PIX',
  'pending',
  'qr_code_test',
  'pix_copy_paste_test',
  CURRENT_DATE + INTERVAL '1 day',
  NOW()
FROM first_company fc
ON CONFLICT (asaas_payment_id) DO UPDATE SET
  status = 'pending',
  updated_at = NOW();

-- Verificar se o pagamento foi criado
SELECT 
  p.id,
  p.asaas_payment_id,
  p.company_id,
  p.amount,
  p.credit_amount,
  p.status,
  c.nome as company_name
FROM payments p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.asaas_payment_id = 'pay_test_12345';