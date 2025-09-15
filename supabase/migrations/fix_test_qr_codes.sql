-- Limpar dados de teste inválidos dos QR codes
-- Este script remove valores de teste que causam erros na interface

-- Atualizar pagamentos com QR codes de teste para NULL
UPDATE payments 
SET 
  pix_qr_code = NULL,
  updated_at = NOW()
WHERE 
  pix_qr_code = 'qr_code_test' 
  OR pix_qr_code LIKE '%test%';

-- Atualizar pagamentos com códigos PIX de teste para NULL
UPDATE payments 
SET 
  pix_copy_paste = NULL,
  updated_at = NOW()
WHERE 
  pix_copy_paste = 'pix_copy_paste_test' 
  OR pix_copy_paste LIKE '%test%';

-- Verificar se ainda existem dados de teste
SELECT 
  id,
  asaas_payment_id,
  pix_qr_code,
  pix_copy_paste,
  status,
  created_at
FROM payments 
WHERE 
  pix_qr_code LIKE '%test%' 
  OR pix_copy_paste LIKE '%test%'
  OR pix_qr_code = 'qr_code_test'
  OR pix_copy_paste = 'pix_copy_paste_test';

-- Mostrar estatísticas dos pagamentos após limpeza
SELECT 
  status,
  COUNT(*) as total,
  COUNT(pix_qr_code) as with_qr_code,
  COUNT(pix_copy_paste) as with_pix_code
FROM payments 
GROUP BY status
ORDER BY status;