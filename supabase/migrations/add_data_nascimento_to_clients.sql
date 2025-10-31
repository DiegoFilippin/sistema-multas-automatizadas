-- Adicionar coluna data_nascimento na tabela clients
-- Esta coluna permitirá armazenar a data de nascimento dos clientes

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS data_nascimento DATE;

-- Criar índice para otimizar consultas por data de nascimento
CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);

-- Comentário para documentar o campo
COMMENT ON COLUMN clients.data_nascimento IS 'Data de nascimento do cliente';