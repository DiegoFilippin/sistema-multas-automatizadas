-- Migração final para corrigir acesso do superadmin
-- Esta migração resolve definitivamente o problema de login do master@sistema.com

-- 1. Primeiro, vamos garantir que o usuário existe na tabela auth.users
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
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'master@sistema.com',
    crypt('master123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = NOW();

-- 2. Garantir que existe na tabela auth.identities
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
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"master@sistema.com"}'::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

-- 3. Garantir que o perfil existe na tabela user_profiles
INSERT INTO public.user_profiles (
    id,
    email,
    nome,
    role,
    ativo,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'master@sistema.com',
    'Administrador Master',
    'admin_master',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = EXCLUDED.nome,
    role = EXCLUDED.role,
    ativo = EXCLUDED.ativo,
    updated_at = NOW();

-- 4. Remover todas as políticas RLS existentes para user_profiles
DROP POLICY IF EXISTS "Allow admin_master full access" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.user_profiles;

-- 5. Criar políticas RLS simples e funcionais
CREATE POLICY "admin_master_full_access" ON public.user_profiles
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'email' = 'master@sistema.com');

CREATE POLICY "users_own_profile" ON public.user_profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = id);

-- 6. Garantir que RLS está habilitado
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 7. Conceder permissões necessárias
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO anon;

-- 8. Verificar se tudo foi criado corretamente
SELECT 
    'auth.users' as tabela,
    COUNT(*) as registros
FROM auth.users 
WHERE email = 'master@sistema.com'

UNION ALL

SELECT 
    'auth.identities' as tabela,
    COUNT(*) as registros
FROM auth.identities 
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid

UNION ALL

SELECT 
    'user_profiles' as tabela,
    COUNT(*) as registros
FROM public.user_profiles 
WHERE email = 'master@sistema.com';

-- Comentário final
-- Esta migração deve resolver definitivamente o problema de "Database error querying schema"
-- O usuário master@sistema.com agora deve conseguir fazer login com a senha master123