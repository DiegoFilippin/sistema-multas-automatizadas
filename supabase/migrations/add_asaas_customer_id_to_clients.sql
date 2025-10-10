-- Adicionar campo asaas_customer_id na tabela clients
ALTER TABLE clients 
ADD COLUMN asaas_customer_id VARCHAR(255);

-- Criar índice para otimizar consultas pelo asaas_customer_id
CREATE INDEX idx_clients_asaas_customer_id ON clients(asaas_customer_id);

-- Comentário para documentar o campo
COMMENT ON COLUMN clients.asaas_customer_id IS 'ID do customer no Asaas para integração de cobrança';