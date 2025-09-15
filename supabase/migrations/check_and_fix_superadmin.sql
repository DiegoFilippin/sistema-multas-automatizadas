-- Função para verificar e corrigir o usuário superadmin
-- Esta migração verifica se o usuário existe e corrige qualquer problema

-- 1. Criar uma função para verificar usuários auth
CREATE OR REPLACE FUNCTION public.check_auth_user(user_email text)
RETURNS TABLE(user_id uuid, email text, exists_in_auth boolean, exists_in_profiles boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(au.id, up.id) as user_id,
        COALESCE(au.email, up.email) as email,
        (au.id IS NOT NULL) as exists_in_auth,
        (up.id IS NOT NULL) as exists_in_profiles
    FROM auth.users au
    FULL OUTER JOIN public.user_profiles up ON au.id = up.id
    WHERE au.email = user_email OR up.email = user_email;
END;
$$;

-- 2. Verificar o status atual do usuário master@sistema.com
SELECT 
    'Status do usuário master@sistema.com' as info,
    *
FROM public.check_auth_user('master@sistema.com');

-- 3. Se o usuário não existir em auth.users, criar com um ID específico
DO $$
BEGIN
    -- Verificar se o usuário existe em auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'master@sistema.com') THEN
        -- Inserir o usuário em auth.users
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
            raw_user_meta_data
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000'::uuid,
            'authenticated',
            'authenticated',
            'master@sistema.com',
            crypt('master123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"name": "Admin Master do Sistema"}'
        );
        
        RAISE NOTICE 'Usuário master@sistema.com criado em auth.users';
    ELSE
        RAISE NOTICE 'Usuário master@sistema.com já existe em auth.users';
    END IF;
END
$$;

-- 4. Sincronizar o perfil na tabela user_profiles
DO $$
DECLARE
    auth_user_id uuid;
BEGIN
    -- Obter o ID do usuário em auth.users
    SELECT id INTO auth_user_id FROM auth.users WHERE email = 'master@sistema.com';
    
    IF auth_user_id IS NOT NULL THEN
        -- Inserir/atualizar o perfil
        INSERT INTO public.user_profiles (
            id,
            email,
            name,
            role,
            created_at,
            updated_at
        ) VALUES (
            auth_user_id,
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
            
        RAISE NOTICE 'Perfil sincronizado para usuário ID: %', auth_user_id;
    END IF;
END
$$;

-- 5. Verificar o resultado final
SELECT 
    'Verificação final' as info,
    *
FROM public.check_auth_user('master@sistema.com');

-- 6. Limpar a função temporária
DROP FUNCTION IF EXISTS public.check_auth_user(text);

-- Comentário final
-- Esta migração garante que o usuário master@sistema.com existe em ambas as tabelas
-- e que os IDs estão sincronizados corretamente