-- Migração simples para corrigir o usuário superadmin
-- Esta migração verifica e corrige o usuário master@sistema.com

-- 1. Verificar se o usuário existe em auth.users e obter informações
DO $$
DECLARE
    auth_user_id uuid;
    user_exists boolean := false;
BEGIN
    -- Verificar se o usuário existe em auth.users
    SELECT id INTO auth_user_id FROM auth.users WHERE email = 'master@sistema.com';
    
    IF auth_user_id IS NOT NULL THEN
        user_exists := true;
        RAISE NOTICE 'Usuário master@sistema.com encontrado em auth.users com ID: %', auth_user_id;
    ELSE
        RAISE NOTICE 'Usuário master@sistema.com NÃO encontrado em auth.users';
        
        -- Criar o usuário se não existir
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
        ) RETURNING id INTO auth_user_id;
        
        RAISE NOTICE 'Usuário master@sistema.com criado em auth.users com ID: %', auth_user_id;
    END IF;
    
    -- Sincronizar o perfil na tabela user_profiles
    IF auth_user_id IS NOT NULL THEN
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

-- 2. Verificar o resultado final
SELECT 
    'Usuários em auth.users' as tabela,
    COUNT(*) as total,
    string_agg(email, ', ') as emails
FROM auth.users 
WHERE email = 'master@sistema.com'

UNION ALL

SELECT 
    'Perfis em user_profiles' as tabela,
    COUNT(*) as total,
    string_agg(email, ', ') as emails
FROM public.user_profiles 
WHERE email = 'master@sistema.com';

-- Comentário final
-- Esta migração garante que o usuário master@sistema.com existe e está sincronizado
-- Credenciais: master@sistema.com / master123