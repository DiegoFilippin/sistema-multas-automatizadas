-- Atualização de políticas RLS da tabela public.users
-- Permite que admin_master (em public.user_profiles) visualize e gerencie todos os usuários

-- Remover políticas antigas, se existirem
DROP POLICY IF EXISTS "Users can view company users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage company users" ON public.users;
DROP POLICY IF EXISTS "Admins can update company users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete company users" ON public.users;

-- Política de SELECT: usuários veem usuários da própria empresa
-- e admin_master pode ver todos
CREATE POLICY "Users can view company users" ON public.users
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin_master'
    )
  );

-- Política de INSERT: admins da empresa podem criar
-- e admin_master pode criar qualquer usuário
CREATE POLICY "Admins can manage company users" ON public.users
  FOR INSERT
  WITH CHECK (
    (
      company_id IN (
        SELECT company_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin_master'
    )
  );

-- Política de UPDATE: admins da empresa podem atualizar
-- e admin_master pode atualizar qualquer usuário
CREATE POLICY "Admins can update company users" ON public.users
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin_master'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin_master'
    )
  );

-- Política de DELETE: admins da empresa podem deletar
-- e admin_master pode deletar qualquer usuário
CREATE POLICY "Admins can delete company users" ON public.users
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid() AND