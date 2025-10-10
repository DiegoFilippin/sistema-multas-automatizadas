-- Adicionar campo CNH na tabela clients
-- Este campo armazena o número da CNH do cliente

ALTER TABLE clients 
ADD COLUMN cnh VARCHAR(20);

-- Criar índice para otimizar consultas pelo CNH
CREATE INDEX idx_clients_cnh ON clients(cnh);

-- Comentário para documentar o campo
COMMENT ON COLUMN clients.cnh IS 'Número da CNH (Carteira Nacional de Habilitação) do cliente';

-- Verificar se a coluna foi adicionada com sucesso
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'cnh';