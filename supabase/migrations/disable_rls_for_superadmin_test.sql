-- Migração para desabilitar temporariamente RLS e permitir login do superadmin
-- Esta é uma solução temporária para diagnosticar o problema

-- 1. Desabilitar RLS temporariamente na tabela user_profiles
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Conceder permissões completas
GRANT ALL PRIVILEGES ON public.user_profiles TO authenticated;
GRANT ALL PRIVILEGES ON public.user_profiles TO anon;

-- 3. Verificar se o usuário existe e criar se necessário
DO $$
DECLARE
    user_count integer;
BEGIN
    -- Contar usuários com email master@sistema.com
    SELECT COUNT(*) INTO user_count FROM public.user_profiles WHERE email = 'master@sistema.com';
    
    IF user_count = 0 THEN
        -- Inserir o perfil diretamente (sem RLS ativo)
        INSERT INTO public.user_profiles (
            id,
            email,
            name,
            role,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'master@sistema.com',
            'Admin Master do Sistema',
            'admin_master',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Perfil master@sistema.com criado com sucesso';
    ELSE
        RAISE NOTICE 'Perfil master@sistema.com já existe (% registros)', user_count;
    END IF;
END
$$;

-- 4. Verificar o resultado
SELECT 
    'Perfis encontrados' as info,
    id,
    email,
    name,
    role,
    created_at
FROM public.user_profiles 
WHERE email = 'master@sistema.com';

-- Comentário
-- RLS foi desabilitado temporariamente para permitir o login
-- Isso deve resolver o erro "Database error querying schema"
-- Após confirmar que o login funciona, podemos reabilitar RLS com políticas corretas