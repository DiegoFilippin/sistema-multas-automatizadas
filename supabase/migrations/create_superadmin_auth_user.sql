-- Criar usuário de autenticação para super@sistema.com
-- Este script deve ser executado com service_role_key

-- Primeiro, verificar se o usuário já existe
DO $$
BEGIN
    -- Verificar se o usuário já existe na tabela auth.users
    IF NOT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'super@sistema.com'
    ) THEN
        -- Inserir o usuário na tabela auth.users
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
            '00000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000000'::uuid,
            'authenticated',
            'authenticated',
            'super@sistema.com',
            crypt('master123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            false
        );
        
        RAISE NOTICE 'Usuário de autenticação super@sistema.com criado com sucesso!';
    ELSE
        RAISE NOTICE 'Usuário de autenticação super@sistema.com já existe!';
    END IF;
    
    -- Verificar se o usuário existe na tabela users da aplicação
    IF NOT EXISTS (
        SELECT 1 FROM users WHERE email = 'super@sistema.com'
    ) THEN
        -- Inserir o usuário na tabela users da aplicação
        INSERT INTO users (
            id,
            email,
            nome,
            role,
            ativo,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000001'::uuid,
            'super@sistema.com',
            'Super Administrador',
            'superadmin',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Usuário super@sistema.com criado na tabela users!';
    ELSE
        RAISE NOTICE 'Usuário super@sistema.com já existe na tabela users!';
    END IF;
END $$;

-- Verificar os usuários criados
SELECT 'auth.users' as tabela, id, email, email_confirmed_at, created_at
FROM auth.users 
WHERE email = 'super@sistema.com'
UNION ALL
SELECT 'users' as tabela, id::text, email, created_at::timestamptz, updated_at
FROM users 
WHERE email = 'super@sistema.com';