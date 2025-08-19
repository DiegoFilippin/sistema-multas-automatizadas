-- Verificar se o usuário admin_master foi criado corretamente
SELECT 
  'user_profiles' as tabela,
  id,
  email,
  name,
  role,
  created_at
FROM user_profiles 
WHERE email = 'master@sistema.com'
UNION ALL
SELECT 
  'auth.users' as tabela,
  id,
  email,
  'N/A' as name,
  role,
  created_at
FROM auth.users 
WHERE email = 'master@sistema.com';

-- Verificar se existem usuários na tabela user_profiles
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'admin_master' THEN 1 END) as admin_master_count
FROM user_profiles;