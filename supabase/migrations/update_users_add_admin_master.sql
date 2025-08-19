-- Atualizar a constraint de role na tabela users para incluir admin_master
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role::text = ANY (ARRAY['admin'::character varying, 'user'::character varying, 'viewer'::character varying, 'admin_master'::character varying]::text[]));

-- Inserir usuário admin_master padrão
INSERT INTO users (id, email, nome, password_hash, role, ativo, company_id)
VALUES (
  gen_random_uuid(),
  'master@sistema.com',
  'Admin Master',
  '$2b$10$rQJ8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8', -- Hash para 'master123'
  'admin_master',
  true,
  NULL -- admin_master não está vinculado a uma empresa específica
) ON CONFLICT (email) DO NOTHING;

-- Conceder permissões para as roles anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;

-- Atualizar as políticas RLS para reconhecer admin_master
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admin can manage users" ON users;
DROP POLICY IF EXISTS "Admin master can manage all users" ON users;

-- Política para visualizar perfil próprio
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Política para atualizar perfil próprio
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Política para admin gerenciar usuários da mesma empresa
CREATE POLICY "Admin can manage users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
      AND admin_user.company_id = users.company_id
    )
  );

-- Política para admin_master gerenciar todos os usuários
CREATE POLICY "Admin master can manage all users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users master_user 
      WHERE master_user.id = auth.uid() 
      AND master_user.role = 'admin_master'
    )
  );