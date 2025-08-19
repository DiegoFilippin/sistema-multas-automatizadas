-- Verificar se o usuário admin_master existe
SELECT 
  'auth.users' as table_name,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'master@sistema.com';

SELECT 
  'user_profiles' as table_name,
  id,
  email,
  role,
  created_at
FROM user_profiles 
WHERE email = 'master@sistema.com';

-- Se o usuário não existir, criar novamente
DO $$
BEGIN
  -- Verificar se o usuário existe na auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'master@sistema.com') THEN
    -- Inserir na auth.users
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
    
    RAISE NOTICE 'Usuário master@sistema.com criado na tabela auth.users';
  ELSE
    RAISE NOTICE 'Usuário master@sistema.com já existe na tabela auth.users';
  END IF;
  
  -- Verificar se o usuário existe na user_profiles
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE email = 'master@sistema.com') THEN
    -- Inserir na user_profiles
    INSERT INTO user_profiles (
      id,
      email,
      full_name,
      role,
      company_id,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000002',
      'master@sistema.com',
      'Admin Master',
      'admin_master',
      NULL,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Usuário master@sistema.com criado na tabela user_profiles';
  ELSE
    RAISE NOTICE 'Usuário master@sistema.com já existe na tabela user_profiles';
  END IF;
END $$;

-- Verificar novamente após a criação
SELECT 
  'FINAL CHECK - auth.users' as table_name,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'master@sistema.com';

SELECT 
  'FINAL CHECK - user_profiles' as table_name,
  id,
  email,
  role,
  created_at
FROM user_profiles 
WHERE email = 'master@sistema.com';