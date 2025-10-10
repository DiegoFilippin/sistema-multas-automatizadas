-- Migração para criar usuário admin_master na auth.users
-- Data: 2024-12-21
-- Cria o usuário de autenticação para o admin_master

-- Inserir usuário na tabela auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'master@sistema.com',
  crypt('master123', gen_salt('bf')),
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Admin Master"}',
  false,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = NOW();

-- Inserir identidade na tabela auth.identities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000002' AND provider = 'email') THEN
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000002',
      '{"sub": "00000000-0000-0000-0000-000000000002", "email": "master@sistema.com"}',
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  END IF;
END
$$;

-- Verificar se o usuário foi criado
SELECT 'auth.users' as tabela, id, email, 'N/A' as name, role 
FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000002'
UNION ALL
SELECT 'user_profiles' as tabela, id, email, name, role 
FROM user_profiles 
WHERE id = '00000000-0000-0000-0000-000000000002';