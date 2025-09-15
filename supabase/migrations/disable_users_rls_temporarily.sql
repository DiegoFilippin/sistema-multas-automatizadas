-- Desabilitar RLS da tabela users temporariamente para resolver recursão infinita
-- Data: 2024-01-22

-- 1. Remover todas as políticas RLS da tabela users
DROP POLICY IF EXISTS "Superadmin full access" ON users;
DROP POLICY IF EXISTS "ICETRAN full access" ON users;
DROP POLICY IF EXISTS "Despachante company access" ON users;
DROP POLICY IF EXISTS "Users own profile" ON users;
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

-- 2. Desabilitar RLS completamente na tabela users
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 3. Verificar que RLS foi desabilitado
SELECT 
    'Status RLS da tabela users' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 4. Verificar que não há mais políticas
SELECT 
    'Políticas RLS restantes' as info,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'users';

-- 5. Testar acesso à tabela
SELECT 
    'Teste de acesso à tabela users' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'Superadmin' THEN 1 END) as superadmins,
    COUNT(CASE WHEN role = 'ICETRAN' THEN 1 END) as icetran_users,
    COUNT(CASE WHEN role = 'Despachante' THEN 1 END) as despachantes,
    COUNT(CASE WHEN role = 'Usuario/Cliente' THEN 1 END) as clientes
FROM users;

SELECT 'RLS desabilitado com sucesso! Sistema pronto para uso.' as resultado;