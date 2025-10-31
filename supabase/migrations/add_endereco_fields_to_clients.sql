-- Adicionar campos de endereço detalhados na tabela clients
-- Estes campos permitirão armazenar informações completas de endereço

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS numero VARCHAR(20),
ADD COLUMN IF NOT EXISTS complemento VARCHAR(100),
ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);

-- Criar índices para otimizar consultas pelos novos campos
CREATE INDEX IF NOT EXISTS idx_clients_bairro ON clients(bairro);
CREATE INDEX IF NOT EXISTS idx_clients_cidade_bairro ON clients(cidade, bairro);

-- Comentários para documentar os campos
COMMENT ON COLUMN clients.numero IS 'Número do endereço do cliente';
COMMENT ON COLUMN clients.complemento IS 'Complemento do endereço (apto, bloco, sala, etc.)';
COMMENT ON COLUMN clients.bairro IS 'Bairro do endereço do cliente';