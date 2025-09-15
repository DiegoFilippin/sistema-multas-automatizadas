-- Adicionar coluna asaas_wallet_id na tabela companies
-- Esta coluna armazenará o wallet ID do Asaas para cada empresa/despachante

-- Adicionar coluna asaas_wallet_id se não existir
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS asaas_wallet_id VARCHAR(255);

-- Adicionar comentário na coluna
COMMENT ON COLUMN companies.asaas_wallet_id IS 'ID da wallet do Asaas para receber splits de pagamento desta empresa';

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_companies_asaas_wallet_id 
ON companies(asaas_wallet_id) 
WHERE asaas_wallet_id IS NOT NULL;

-- Verificar se a coluna foi criada corretamente
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name = 'asaas_wallet_id';