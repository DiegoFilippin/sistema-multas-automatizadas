-- Corrigir políticas RLS da tabela users para evitar recursão infinita
-- Data: 2024-01-22

-- 1. Remover todas as políticas existentes da tabela users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow admin_master full access" ON users;
DROP POLICY IF EXISTS "Superadmin can view all users" ON users;
DROP POLICY IF EXISTS "Superadmin can update all users" ON users;
DROP POLICY IF EXISTS "ICETRAN can view all users" ON users;
DROP POLICY IF EXISTS "ICETRAN can update all users" ON users;
DROP POLICY IF EXISTS "Despachante can view own company users" ON users;
DROP POLICY IF EXISTS "Despachante can update own company users" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- 2. Desabilitar RLS temporariamente para evitar problemas
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 3. Reabilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas simples e sem recursão

-- Política para Superadmin - acesso total
CREATE POLICY "Superadmin full access" ON users
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users au
            WHERE au.id = auth.uid()
            AND au.raw_user_meta_data->>'role' = 'Superadmin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users au
            WHERE au.id = auth.uid()
            AND au.raw_user_meta_data->>'role' = 'Superadmin'
        )
    );

-- Política para ICETRAN - acesso total
CREATE POLICY "ICETRAN full access" ON users
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users au
            WHERE au.id = auth.uid()
            AND au.raw_user_meta_data->>'role' = 'ICETRAN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users au
            WHERE au.id = auth.uid()
            AND au.raw_user_meta_data->>'role' = 'ICETRAN'
        )
    );

-- Política para Despachante - pode ver usuários da mesma empresa
CREATE POLICY "Despachante company access" ON users
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users au
            WHERE au.id = auth.uid()
            AND au.raw_user_meta_data->>'role' = 'Despachante'
        )
        AND (
            -- Pode ver próprio perfil
            users.email = (SELECT email FROM auth.users WHERE id = auth.uid())
            OR
            -- Pode ver usuários da mesma empresa (implementar lógica futura)
            true
        )
    );

-- Política para usuários verem próprio perfil
CREATE POLICY "Users own profile" ON users
    FOR ALL
    TO authenticated
    USING (users.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    WITH CHECK (users.email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 5. Verificar as políticas criadas
SELECT 
    'Políticas RLS da tabela users' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 6. Testar acesso básico
SELECT 
    'Teste de acesso à tabela users' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'Superadmin' THEN 1 END) as superadmins,
    COUNT(CASE WHEN role = 'ICETRAN' THEN 1 END) as icetran_users,
    COUNT(CASE WHEN role = 'Despachante' THEN 1 END) as despachantes,
    COUNT(CASE WHEN role = 'Usuario/Cliente' THEN 1 END) as clientes
FROM users;

SELECT 'Migração de correção RLS aplicada com sucesso!' as resultado;