-- Deletar usuário existente se houver
DELETE FROM user_profiles WHERE email = 'master@sistema.com';
DELETE FROM auth.users WHERE email = 'master@sistema.com';

-- Criar usuário admin_master na tabela auth.users
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
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'master@sistema.com',
  crypt('master123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false
);

-- Criar perfil do usuário na tabela user_profiles
INSERT INTO user_profiles (
  id,
  email,
  name,
  role,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'master@sistema.com',
  'Admin Master',
  'admin_master',
  NOW(),
  NOW()
);

-- Verificar se foi criado corretamente
SELECT 
  'VERIFICATION - auth.users' as table_name,
  id,
  email,
  created_at,
  email_confirmed_at,
  confirmed_at,
  encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'master@sistema.com';

SELECT 
  'VERIFICATION - user_profiles' as table_name,
  id,
  email,
  name,
  role,
  created_at
FROM user_profiles 
WHERE email = 'master@sistema.com';