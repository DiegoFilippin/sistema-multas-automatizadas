-- Migração para corrigir problemas de dados iniciais e schema
-- Corrige: UUID placeholders, coluna condutor inexistente, dados de teste

-- 1. Criar dados de teste para companies_master se não existir
INSERT INTO companies_master (id, nome, email, telefone, endereco)
SELECT 
  gen_random_uuid(),
  'Empresa Master Teste',
  'master@teste.com',
  '(11) 99999-9999',
  'Endereço Master Teste'
WHERE NOT EXISTS (SELECT 1 FROM companies_master LIMIT 1);

-- 2. Criar plano de teste se não existir
INSERT INTO plans (id, nome, descricao, preco, limite_empresas, limite_usuarios_por_empresa, limite_clientes, limite_multas, limite_recursos, funcionalidades)
SELECT 
  gen_random_uuid(),
  'Plano Teste',
  'Plano de teste para desenvolvimento',
  0.00,
  1,
  10,
  1000,
  5000,
  1000,
  ARRAY['dashboard', 'multas', 'recursos', 'clientes']
WHERE NOT EXISTS (SELECT 1 FROM plans LIMIT 1);

-- 3. Criar empresa de teste se não existir
DO $$
DECLARE
  master_id UUID;
  plan_id UUID;
BEGIN
  -- Buscar IDs necessários
  SELECT id INTO master_id FROM companies_master LIMIT 1;
  SELECT id INTO plan_id FROM plans LIMIT 1;
  
  -- Inserir empresa se não existir
  INSERT INTO companies (id, master_company_id, plan_id, nome, cnpj, email, telefone, endereco, data_inicio_assinatura)
  SELECT 
    gen_random_uuid(),
    master_id,
    plan_id,
    'Empresa Teste LTDA',
    '12.345.678/0001-90',
    'empresa@teste.com',
    '(11) 88888-8888',
    'Rua Teste, 123',
    NOW()
  WHERE NOT EXISTS (SELECT 1 FROM companies LIMIT 1);
END $$;

-- 4. Criar cliente de teste se não existir
DO $$
DECLARE
  company_id UUID;
BEGIN
  -- Buscar company_id
  SELECT id INTO company_id FROM companies LIMIT 1;
  
  -- Inserir cliente se não existir
  INSERT INTO clients (id, company_id, nome, cpf_cnpj, email, telefone, endereco, cidade, estado, cep)
  SELECT 
    gen_random_uuid(),
    company_id,
    'Cliente Teste',
    '123.456.789-00',
    'cliente@teste.com',
    '(11) 77777-7777',
    'Rua Cliente, 456',
    'São Paulo',
    'SP',
    '01234-567'
  WHERE NOT EXISTS (SELECT 1 FROM clients LIMIT 1);
END $$;

-- 5. Verificar se a coluna 'condutor' existe na tabela multas
-- Se não existir, adicionar (baseado nos logs de erro)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'multas' 
    AND column_name = 'condutor' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE multas ADD COLUMN condutor VARCHAR(255);
    COMMENT ON COLUMN multas.condutor IS 'Nome do condutor no momento da infração';
  END IF;
END $$;

-- 6. Adicionar campos expandidos se não existirem (baseado no código)
DO $$
BEGIN
  -- Campo dados_equipamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'multas' 
    AND column_name = 'dados_equipamento' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE multas ADD COLUMN dados_equipamento JSONB;
    COMMENT ON COLUMN multas.dados_equipamento IS 'Dados do equipamento de medição';
  END IF;
  
  -- Campo notificacao_autuacao
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'multas' 
    AND column_name = 'notificacao_autuacao' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE multas ADD COLUMN notificacao_autuacao JSONB;
    COMMENT ON COLUMN multas.notificacao_autuacao IS 'Dados da notificação de autuação';
  END IF;
END $$;

-- 7. Garantir permissões adequadas
GRANT SELECT ON companies TO anon;
GRANT ALL PRIVILEGES ON companies TO authenticated;

GRANT SELECT ON clients TO anon;
GRANT ALL PRIVILEGES ON clients TO authenticated;

GRANT SELECT ON multas TO anon;
GRANT ALL PRIVILEGES ON multas TO authenticated;

-- 8. Verificar dados criados
SELECT 
  'Dados de teste criados:' as info,
  (SELECT COUNT(*) FROM companies_master) as companies_master_count,
  (SELECT COUNT(*) FROM plans) as plans_count,
  (SELECT COUNT(*) FROM companies) as companies_count,
  (SELECT COUNT(*) FROM clients) as clients_count;

-- 9. Mostrar IDs criados para referência
SELECT 
  'IDs disponíveis:' as info,
  c.id as company_id,
  cl.id as client_id
FROM companies c
CROSS JOIN clients cl
LIMIT 1;