-- Corrigir políticas RLS da tabela users para evitar recursão infinita

-- Primeiro, remover todas as políticas existentes que podem estar causando recursão
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can manage all users" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON users;

-- Desabilitar RLS temporariamente para limpeza
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Reabilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Criar políticas simples e seguras

-- Política para permitir que usuários vejam seu próprio perfil
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Política para permitir que usuários atualizem seu próprio perfil
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Política para permitir inserção de novos usuários (para registro)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Política para admin_master ver todos os usuários
CREATE POLICY "admin_master_select_all" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin_master'
    )
  );

-- Política para admin_master gerenciar todos os usuários
CREATE POLICY "admin_master_manage_all" ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin_master'
    )
  );

-- Garantir que a tabela users tenha as permissões corretas
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users TO anon;

-- Verificar se há usuários admin_master
DO $$
BEGIN
  -- Se não houver admin_master, criar um usuário padrão
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin_master') THEN
    INSERT INTO users (id, email, nome, role, ativo)
    VALUES (
      gen_random_uuid(),
      'admin@sistema.com',
      'Administrador Master',
      'admin_master',
      true
    )
    ON CONFLICT (email) DO UPDATE SET
      role = 'admin_master',
      ativo = true;
  END IF;
END $$;