-- Adicionar coluna asaas_wallet_id à tabela companies
-- Esta migração adiciona suporte para wallet_id do Asaas para splits de pagamento

-- Adicionar coluna asaas_wallet_id
ALTER TABLE companies 
ADD COLUMN asaas_wallet_id VARCHAR(100);

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN companies.asaas_wallet_id IS 'Wallet ID do Asaas para recebimento de splits de pagamento';

-- Criar índice para melhorar performance das consultas por wallet_id
CREate INDEX idx_companies_asaas_wallet_id ON companies(asaas_wallet_id);

-- Verificar se a coluna foi criada corretamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name = 'asaas_wallet_id';