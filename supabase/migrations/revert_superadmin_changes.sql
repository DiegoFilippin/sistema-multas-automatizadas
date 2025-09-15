-- Reverter todas as alterações do superadmin
-- Esta migração remove todas as modificações que quebraram o sistema de login

-- 1. Primeiro, remover referências que podem causar problemas de FK
UPDATE knowledge_documents SET created_by = NULL WHERE created_by = '00000000-0000-0000-0000-000000000001';
UPDATE knowledge_documents SET created_by = NULL WHERE created_by = '00000000-0000-0000-0000-000000000002';

-- 2. Remover usuário admin_master do auth.users se existir
DELETE FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000002';
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000002';

-- 3. Remover perfil admin_master do user_profiles se existir (mas manter outros)
DELETE FROM user_profiles WHERE email = 'master@sistema.com' OR role = 'admin_master';

-- 4. Remover políticas RLS específicas do admin_master
DROP POLICY IF EXISTS "Allow admin_master full access" ON user_profiles;
DROP POLICY IF EXISTS "Admin master can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin master can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admin master full access" ON user_profiles;

-- 5. Remover políticas existentes para recriar as originais
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- 6. Recriar políticas básicas originais
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Garantir que RLS está habilitado mas com políticas simples
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 8. Remover coluna role se foi adicionada
ALTER TABLE user_profiles DROP COLUMN IF EXISTS role;

-- 9. Verificar se a reversão funcionou
SELECT 'Reversão do superadmin concluída' as status;
SELECT count(*) as total_profiles FROM user_profiles;