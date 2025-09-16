-- Corrigir apenas as políticas RLS para tabelas de chat
-- Este script resolve o problema de permissões que impede o salvamento e carregamento do histórico

-- 1. Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('chat_sessions', 'chat_messages')
ORDER BY tablename, policyname;

-- 2. Remover políticas existentes que podem estar causando problemas
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON chat_sessions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON chat_sessions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON chat_sessions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON chat_messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON chat_messages;

-- 3. Criar políticas RLS mais permissivas para chat_sessions

-- Política para SELECT (visualizar sessões)
CREATE POLICY "chat_sessions_select_policy" ON chat_sessions
    FOR SELECT USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role' OR
        auth.role() = 'anon'
    );

-- Política para INSERT (criar sessões)
CREATE POLICY "chat_sessions_insert_policy" ON chat_sessions
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role' OR
        auth.role() = 'anon'
    );

-- Política para UPDATE (atualizar sessões)
CREATE POLICY "chat_sessions_update_policy" ON chat_sessions
    FOR UPDATE USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role' OR
        auth.role() = 'anon'
    );

-- 4. Criar políticas RLS mais permissivas para chat_messages

-- Política para SELECT (visualizar mensagens)
CREATE POLICY "chat_messages_select_policy" ON chat_messages
    FOR SELECT USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role' OR
        auth.role() = 'anon'
    );

-- Política para INSERT (criar mensagens)
CREATE POLICY "chat_messages_insert_policy" ON chat_messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role' OR
        auth.role() = 'anon'
    );

-- 5. Garantir permissões básicas para os roles

-- Permissões para role anon
GRANT SELECT, INSERT, UPDATE ON chat_sessions TO anon;
GRANT SELECT, INSERT, UPDATE ON chat_messages TO anon;

-- Permissões completas para role authenticated
GRANT ALL PRIVILEGES ON chat_sessions TO authenticated;
GRANT ALL PRIVILEGES ON chat_messages TO authenticated;

-- 6. Verificar se RLS está habilitado
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 7. Verificar políticas criadas
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename IN ('chat_sessions', 'chat_messages')
ORDER BY tablename, policyname;

-- 8. Verificar permissões dos roles
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name IN ('chat_sessions', 'chat_messages')
    AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- 9. Verificar total de sessões existentes
SELECT COUNT(*) as total_sessions FROM chat_sessions;
SELECT COUNT(*) as total_messages FROM chat_messages;