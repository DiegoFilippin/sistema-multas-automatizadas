-- Adicionar campo asaas_customer_id na tabela companies
-- Este campo armazena o ID do customer no Asaas para cada empresa despachante
ALTER TABLE companies 
ADD COLUMN asaas_customer_id VARCHAR(255);

-- Criar índice para otimizar consultas pelo asaas_customer_id
CREATE INDEX idx_companies_asaas_customer_id ON companies(asaas_customer_id);

-- Adicionar comentário para documentação
COMMENT ON COLUMN companies.asaas_customer_id IS 'ID do customer no Asaas para integração de cobrança da empresa despachante';

-- Migrar dados existentes de users.asaas_customer_id para companies.asaas_customer_id
-- Buscar usuários que têm asaas_customer_id e atualizar a empresa correspondente
UPDATE companies 
SET asaas_customer_id = (
  SELECT u.asaas_customer_id 
  FROM users u 
  INNER JOIN user_profiles up ON u.id = up.user_id 
  WHERE up.company_id = companies.id 
    AND u.asaas_customer_id IS NOT NULL 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 
  FROM users u 
  INNER JOIN user_profiles up ON u.id = up.user_id 
  WHERE up.company_id = companies.id 
    AND u.asaas_customer_id IS NOT NULL
);

-- Log da migração
INSERT INTO migration_log (migration_name, executed_at, description) 
VALUES (
  'add_asaas_customer_id_to_companies', 
  NOW(), 
  'Adicionado campo asaas_customer_id na tabela companies e migrados dados existentes de users'
) ON CONFLICT DO NOTHING;