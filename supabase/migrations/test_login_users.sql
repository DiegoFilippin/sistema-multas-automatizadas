-- Verificar usuários existentes na tabela users para teste de login

-- 1. Listar usuários existentes
SELECT 
    'users' as tabela,
    id,
    email,
    nome,
    role,
    ativo,
    company_id,
    created_at
FROM users 
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar se existem usuários ativos
SELECT 
    'Resumo de usuários' as info,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN ativo = true THEN 1 END) as usuarios_ativos,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as usuarios_normais
FROM users;

-- 3. Verificar se RLS está desabilitado (deve estar para funcionar)
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';