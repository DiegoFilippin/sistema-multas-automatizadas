-- Política RLS corrigida para permitir inserção na tabela recursos_gerados
-- Esta versão permite que usuários autenticados insiram recursos usando seu auth.uid() diretamente

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can insert recursos for their company" ON recursos_gerados;
DROP POLICY IF EXISTS "Users can view recursos from their company" ON recursos_gerados;
DROP POLICY IF EXISTS "Users can update recursos from their company" ON recursos_gerados;
DROP POLICY IF EXISTS "Users can delete recursos from their company" ON recursos_gerados;

-- Política para INSERT: Usuários autenticados podem inserir recursos
-- Permite tanto user_id = auth.uid() quanto user_id de usuário da mesma empresa
CREATE POLICY "Users can insert recursos for their company" ON recursos_gerados
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- Permite inserir com seu próprio auth.uid()
      user_id = auth.uid() OR
      -- Ou permite inserir para usuários da mesma empresa
      (
        user_id IN (
          SELECT id FROM users 
          WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
          )
        ) AND
        company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- Política para SELECT: Usuários podem ver recursos de sua empresa
CREATE POLICY "Users can view recursos from their company" ON recursos_gerados
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      -- Pode ver seus próprios recursos
      user_id = auth.uid() OR
      -- Ou recursos da mesma empresa
      company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Política para UPDATE: Usuários podem atualizar recursos de sua empresa
CREATE POLICY "Users can update recursos from their company" ON recursos_gerados
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      (
        user_id IN (
          SELECT id FROM users 
          WHERE company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
          )
        ) AND
        company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- Política para DELETE: Usuários podem deletar recursos de sua empresa
CREATE POLICY "Users can delete recursos from their company" ON recursos_gerados
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Garantir que RLS está habilitado
ALTER TABLE recursos_gerados ENABLE ROW LEVEL SECURITY;

-- Conceder permissões básicas para roles anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON recursos_gerados TO authenticated;
GRANT SELECT ON recursos_gerados TO anon;

-- Verificar as políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'recursos_gerados';