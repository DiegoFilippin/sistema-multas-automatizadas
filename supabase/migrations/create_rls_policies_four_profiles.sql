-- Políticas RLS para os 4 perfis de usuário: Superadmin, ICETRAN, Despachante, Usuario/Cliente
-- Data: $(date +%Y-%m-%d)

-- 1. Habilitar RLS na tabela users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas existentes se houver
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- 3. Política de SELECT (visualização)
-- Superadmin: pode ver todos os usuários
-- ICETRAN: pode ver todos os usuários (gerencia despachantes)
-- Despachante: pode ver usuários da mesma empresa + clientes
-- Usuario/Cliente: pode ver apenas seus próprios dados
CREATE POLICY "users_select_policy" ON users
    FOR SELECT
    USING (
        -- Superadmin vê tudo
        (auth.jwt() ->> 'role' = 'Superadmin')
        OR
        -- ICETRAN vê tudo (gerencia despachantes)
        (auth.jwt() ->> 'role' = 'ICETRAN')
        OR
        -- Despachante vê usuários da mesma empresa
        (auth.jwt() ->> 'role' = 'Despachante' AND company_id = (auth.jwt() ->> 'company_id')::uuid)
        OR
        -- Usuario/Cliente vê apenas seus próprios dados
        (auth.jwt() ->> 'role' = 'Usuario/Cliente' AND id = (auth.jwt() ->> 'sub')::uuid)
    );

-- 4. Política de INSERT (criação)
-- Superadmin: pode criar qualquer usuário
-- ICETRAN: pode criar despachantes e usuários/clientes
-- Despachante: pode criar apenas usuários/clientes da sua empresa
-- Usuario/Cliente: não pode criar usuários
CREATE POLICY "users_insert_policy" ON users
    FOR INSERT
    WITH CHECK (
        -- Superadmin pode criar qualquer usuário
        (auth.jwt() ->> 'role' = 'Superadmin')
        OR
        -- ICETRAN pode criar despachantes e usuários/clientes
        (auth.jwt() ->> 'role' = 'ICETRAN' AND role IN ('Despachante', 'Usuario/Cliente'))
        OR
        -- Despachante pode criar apenas usuários/clientes da sua empresa
        (auth.jwt() ->> 'role' = 'Despachante' 
         AND role = 'Usuario/Cliente' 
         AND company_id = (auth.jwt() ->> 'company_id')::uuid)
    );

-- 5. Política de UPDATE (atualização)
-- Superadmin: pode atualizar qualquer usuário
-- ICETRAN: pode atualizar despachantes e usuários/clientes
-- Despachante: pode atualizar usuários/clientes da sua empresa + seus próprios dados
-- Usuario/Cliente: pode atualizar apenas seus próprios dados
CREATE POLICY "users_update_policy" ON users
    FOR UPDATE
    USING (
        -- Superadmin pode atualizar qualquer usuário
        (auth.jwt() ->> 'role' = 'Superadmin')
        OR
        -- ICETRAN pode atualizar despachantes e usuários/clientes
        (auth.jwt() ->> 'role' = 'ICETRAN' AND role IN ('Despachante', 'Usuario/Cliente'))
        OR
        -- Despachante pode atualizar usuários/clientes da sua empresa ou seus próprios dados
        (auth.jwt() ->> 'role' = 'Despachante' AND 
         (company_id = (auth.jwt() ->> 'company_id')::uuid OR id = (auth.jwt() ->> 'sub')::uuid))
        OR
        -- Usuario/Cliente pode atualizar apenas seus próprios dados
        (auth.jwt() ->> 'role' = 'Usuario/Cliente' AND id = (auth.jwt() ->> 'sub')::uuid)
    );

-- 6. Política de DELETE (exclusão)
-- Superadmin: pode deletar qualquer usuário
-- ICETRAN: pode deletar despachantes e usuários/clientes
-- Despachante: pode deletar apenas usuários/clientes da sua empresa
-- Usuario/Cliente: não pode deletar usuários
CREATE POLICY "users_delete_policy" ON users
    FOR DELETE
    USING (
        -- Superadmin pode deletar qualquer usuário
        (auth.jwt() ->> 'role' = 'Superadmin')
        OR
        -- ICETRAN pode deletar despachantes e usuários/clientes
        (auth.jwt() ->> 'role' = 'ICETRAN' AND role IN ('Despachante', 'Usuario/Cliente'))
        OR
        -- Despachante pode deletar apenas usuários/clientes da sua empresa
        (auth.jwt() ->> 'role' = 'Despachante' 
         AND role = 'Usuario/Cliente' 
         AND company_id = (auth.jwt() ->> 'company_id')::uuid)
    );

-- 7. Verificar se as políticas foram criadas
SELECT 
    'Políticas RLS criadas' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

-- 8. Verificar se RLS está habilitado
SELECT 
    'Status RLS' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';