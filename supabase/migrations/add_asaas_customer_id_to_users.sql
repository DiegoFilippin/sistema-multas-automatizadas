-- Adicionar campo asaas_customer_id na tabela users
ALTER TABLE users 
ADD COLUMN asaas_customer_id VARCHAR(255);

-- Criar índice para otimizar consultas pelo asaas_customer_id
CREATE INDEX idx_users_asaas_customer_id ON users(asaas_customer_id);

-- Adicionar comentário para documentação
COMMENT ON COLUMN users.asaas_customer_id IS 'ID do customer no Asaas para integração de cobrança (usado para despachantes)';