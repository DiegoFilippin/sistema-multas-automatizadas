-- Migration para criar usuário admin_master padrão
-- Data: 2024-12-21
-- Credenciais: master@sistema.com / master123

-- UUID fixo para o admin master: 00000000-0000-0000-0000-000000000002

-- Inserir na tabela auth.users (sistema de autenticação do Supabase)
INSERT INTO auth.users (
  id, 
  email, 
  encrypted_password,
  email_confirmed_at,
  created_at, 
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'master@sistema.com',
  crypt('master123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Admin Master do Sistema"}',
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Inserir na tabela user_profiles
INSERT INTO user_profiles (id, email, name, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'master@sistema.com',
  'Admin Master do Sistema',
  'admin_master',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verificar se os usuários foram criados
SELECT 'auth.users' as tabela, id, email, 'N/A' as name, role 
FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'user_profiles' as tabela, id, email, name, role 
FROM user_profiles 
WHERE id = '00000000-0000-0000-0000-000000000002';