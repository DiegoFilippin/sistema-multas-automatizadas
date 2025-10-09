-- Criar usuário de autenticação para master@sistema.com
-- Este script cria o usuário na tabela auth.users do Supabase

-- Inserir usuário na auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) VALUES (
  '1c3acd1c-9e27-460d-b05d-16eb3264e742'::uuid, -- Mesmo ID da tabela users
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'master@sistema.com',
  crypt('Master@2024!', gen_salt('bf')), -- Hash da senha Master@2024!
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Admin Master"}',
  false
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  updated_at = NOW();

-- Inserir identidade na auth.identities
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  created_at,
  updated_at,
  email
) VALUES (
  '1c3acd1c-9e27-460d-b05d-16eb3264e742',
  '1c3acd1c-9e27-460d-b05d-16eb3264e742',
  jsonb_build_object(
    'sub', '1c3acd1c-9e27-460d-b05d-16eb3264e742',
    'email', 'master@sistema.com',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  NOW(),
  NOW(),
  'master@sistema.com'
)
ON CONFLICT (provider, provider_id) DO UPDATE SET
  identity_data = EXCLUDED.identity_data,
  updated_at = NOW(),
  email = EXCLUDED.email;

-- Verificar se foi criado corretamente
SELECT 
  'auth.users' as table_name,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'master@sistema.com';

SELECT 
  'auth.identities' as table_name,
  user_id,
  provider,
  email,
  created_at
FROM auth.identities 
WHERE email = 'master@sistema.com';