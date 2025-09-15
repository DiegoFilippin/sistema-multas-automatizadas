-- Migração final para corrigir acesso do superadmin (versão 3)
-- Esta migração corrige as políticas RLS com os nomes corretos das colunas

-- 1. Garantir que o perfil existe na tabela user_profiles
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
    'Administrador Master',
    'admin_master',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 2. Remover todas as políticas RLS existentes para user_profiles
DROP POLICY IF EXISTS "Allow admin_master full access" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_master_full_access" ON public.user_profiles;
DROP POLICY IF EXISTS "users_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_master_bypass" ON public.user_profiles;
DROP POLICY IF EXISTS "users_own_profile_only" ON public.user_profiles;

-- 3. Desabilitar RLS temporariamente para limpeza
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 4. Reabilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Criar política simples para admin_master (sem recursão)
CREATE POLICY "admin_master_bypass" ON public.user_profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email = 'master@sistema.com'
        )
    );

-- 6. Criar política para usuários normais
CREATE POLICY "users_own_profile_only" ON public.user_profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = id AND auth.jwt() ->> 'email' != 'master@sistema.com');

-- 7. Conceder permissões necessárias
GRANT ALL ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- 8. Verificar se o usuário master existe em todas as tabelas
SELECT 
    'Verificação do usuário master@sistema.com' as status,
    (
        SELECT COUNT(*) FROM auth.users WHERE email = 'master@sistema.com'
    ) as auth_users_count,
    (
        SELECT COUNT(*) FROM public.user_profiles WHERE email = 'master@sistema.com'
    ) as user_profiles_count;

-- Comentário final
-- Esta migração corrige as políticas RLS com os nomes corretos das colunas
-- O problema de "Database error querying schema" deve ser resolvido