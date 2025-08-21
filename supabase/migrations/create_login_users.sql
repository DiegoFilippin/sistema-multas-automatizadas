-- Migração para criar usuários de login necessários
-- Esta migração resolve o problema "Invalid login credentials"

-- Primeiro, vamos garantir que temos uma empresa padrão
INSERT INTO companies (id, nome, cnpj, email, telefone, endereco, status, data_inicio_assinatura)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'ICETRAN - Instituto de Certificação',
  '12.345.678/0001-90',
  'contato@icetran.com.br',
  '(11) 99999-9999',
  'São Paulo/SP',
  'ativo',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Deletar usuários existentes que podem estar causando conflito
DELETE FROM users WHERE email IN (
  'operador@icetran.com.br',
  'admin@icetran.com.br'
);

-- Inserir usuários necessários para login
INSERT INTO users (id, company_id, email, nome, role, ativo, created_at, updated_at)
VALUES 
  (
    'da2ffe10-c916-4c03-8610-9628bc5e704c',
    '550e8400-e29b-41d4-a716-446655440001',
    'operador@icetran.com.br',
    'Operador ICETRAN',
    'user',
    true,
    NOW(),
    NOW()
  ),
  (
    '2953551a-2920-4440-bc8d-ca207d27529c',
    '550e8400-e29b-41d4-a716-446655440001',
    'admin@icetran.com.br',
    'Administrador ICETRAN',
    'admin',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET
  id = EXCLUDED.id,
  nome = EXCLUDED.nome,
  role = EXCLUDED.role,
  company_id = EXCLUDED.company_id,
  ativo = EXCLUDED.ativo,
  updated_at = NOW();

-- Verificar se os usuários foram criados
SELECT 
  id,
  email,
  nome,
  role,
  ativo
FROM users 
WHERE email IN ('operador@icetran.com.br', 'admin@icetran.com.br')
ORDER BY email;