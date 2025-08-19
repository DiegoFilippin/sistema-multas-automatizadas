-- Criar usuário admin para resolver violação de chave estrangeira
-- UUID: 00000000-0000-0000-0000-000000000001

-- Primeiro inserir na tabela auth.users (sistema de autenticação do Supabase)
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
  '00000000-0000-0000-0000-000000000001',
  'admin@sistema.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Administrador do Sistema"}',
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Depois inserir na tabela user_profiles (que referencia auth.users.id)
INSERT INTO user_profiles (id, email, name, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@sistema.com',
  'Administrador do Sistema',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verificar se os usuários foram criados
SELECT 'auth.users' as tabela, id, email, 'N/A' as name, role FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001'
UNION ALL
SELECT 'user_profiles' as tabela, id, email, name, role FROM user_profiles WHERE id = '00000000-0000-0000-0000-000000000001';