-- Consultar usuários na tabela auth.users
SELECT 
  'auth.users' as source_table,
  id,
  email,
  created_at,
  email_confirmed_at,
  encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'master@sistema.com'
OR email LIKE '%master%';

-- Consultar usuários na tabela user_profiles
SELECT 
  'user_profiles' as source_table,
  id,
  email,
  name,
  role,
  created_at
FROM user_profiles 
WHERE email = 'master@sistema.com'
OR email LIKE '%master%'
OR role = 'admin_master';

-- Listar todos os usuários para debug
SELECT 
  'ALL auth.users' as source_table,
  id,
  email,
  created_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

SELECT 
  'ALL user_profiles' as source_table,
  id,
  email,
  name,
  role,
  created_at
FROM user_profiles 
ORDER BY created_at DESC
LIMIT 10;