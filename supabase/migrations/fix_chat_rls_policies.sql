-- Corrigir políticas RLS para tabelas de chat
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

-- 3. Criar políticas RLS mais permissivas para chat_sessions

-- Política para SELECT (visualizar sessões)
CREATE POLICY "Enable read access for authenticated users" ON chat_sessions
    FOR SELECT USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role'
    );

-- Política para INSERT (criar sessões)
CREATE POLICY "Enable insert for authenticated users" ON chat_sessions
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role'
    );

-- Política para UPDATE (atualizar sessões)
CREATE POLICY "Enable update for authenticated users" ON chat_sessions
    FOR UPDATE USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role'
    );

-- 4. Criar políticas RLS mais permissivas para chat_messages

-- Política para SELECT (visualizar mensagens)
CREATE POLICY "Enable read access for authenticated users" ON chat_messages
    FOR SELECT USING (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role'
    );

-- Política para INSERT (criar mensagens)
CREATE POLICY "Enable insert for authenticated users" ON chat_messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role'
    );

-- 5. Garantir permissões básicas para os roles

-- Permissões para role anon (caso precise acessar sem autenticação)
GRANT SELECT ON chat_sessions TO anon;
GRANT SELECT ON chat_messages TO anon;

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

-- 9. Criar uma sessão de teste para verificar se as políticas funcionam
INSERT INTO chat_sessions (
    session_id,
    webhook_url,
    webhook_payload,
    company_id,
    user_id,
    multa_id,
    status
) VALUES (
    'test_session_' || extract(epoch from now()),
    'https://test.webhook.com',
    '{"test": true}',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    'active'
);

-- 10. Verificar se a sessão foi criada
SELECT COUNT(*) as total_sessions FROM chat_sessions;
SELECT * FROM chat_sessions ORDER BY created_at DESC LIMIT 1;