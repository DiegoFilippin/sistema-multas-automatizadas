-- Migração para criar diretamente o usuário superadmin na tabela auth.users
-- Esta migração usa o service_role para inserir diretamente nas tabelas do sistema de autenticação

-- 1. Inserir o usuário na tabela auth.users
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
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
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
    '{"name": "Admin Master do Sistema"}',
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
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

-- 2. Inserir na tabela auth.identities
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    '{"sub": "00000000-0000-0000-0000-000000000001", "email": "master@sistema.com", "email_verified": true, "phone_verified": false}',
    'email',
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

-- 3. Inserir/atualizar na tabela user_profiles
INSERT INTO public.user_profiles (
    id,
    email,
    name,
    role,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'master@sistema.com',
    'Admin Master do Sistema',
    'admin_master',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 4. Verificar se tudo foi criado corretamente
SELECT 
    'Verificação completa do usuário master@sistema.com' as status,
    (
        SELECT COUNT(*) FROM auth.users WHERE email = 'master@sistema.com'
    ) as auth_users_count,
    (
        SELECT COUNT(*) FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
    ) as auth_identities_count,
    (
        SELECT COUNT(*) FROM public.user_profiles WHERE email = 'master@sistema.com'
    ) as user_profiles_count;

-- Comentário final
-- Esta migração cria o usuário completo em todas as tabelas necessárias
-- Credenciais: master@sistema.com / master123