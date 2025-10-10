-- Adicionar colunas de wallet para splits de pagamento na tabela companies

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS asaas_wallet_id VARCHAR(100);

-- Adicionar comentário para documentar a coluna
COMMENT ON COLUMN companies.asaas_wallet_id IS 'Wallet ID do Asaas para recebimento de splits de pagamento';

-- Criar índice para melhorar performance das consultas por wallet_id
CREATE INDEX IF NOT EXISTS idx_companies_asaas_wallet_id ON companies(asaas_wallet_id);

-- Configurar wallet_id para as empresas ICETRAN e ACSM usando o wallet disponível
UPDATE companies 
SET asaas_wallet_id = '7f9702c1-08da-43c9-b0d3-122130b41ee8'
WHERE company_type IN ('icetran', 'acsm') 
AND asaas_wallet_id IS NULL;

-- Verificar se as atualizações foram aplicadas
DO $$
BEGIN
  RAISE NOTICE 'Empresas com wallet configurado:';
  PERFORM pg_sleep(0.1);
END $$;

SELECT 
  nome,
  company_type,
  asaas_wallet_id,
  CASE 
    WHEN asaas_wallet_id IS NOT NULL THEN '✅ Configurado'
    ELSE '❌ Não configurado'
  END as status
FROM companies 
WHERE company_type IN ('icetran', 'acsm')
ORDER BY company_type;