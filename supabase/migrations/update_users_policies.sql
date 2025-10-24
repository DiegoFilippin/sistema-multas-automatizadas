-- Atualizar políticas RLS da tabela users para permitir que admin_master (Superadmin)
-- visualize e gerencie usuários de todas as empresas

-- Remover políticas existentes que serão substituídas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can view company users'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view company users" ON public.users';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Admins can manage company users'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can manage company users" ON public.users';
  END IF;
END $$;

-- Política de SELECT: usuários podem ver usuários da própria empresa
-- e admin_master pode ver todos
CREATE POLICY "Users can view company users" ON public.users
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_master')
    )
  );

-- Política de ALL (INSERT/UPDATE/DELETE): admins da empresa podem gerenciar
-- e admin_master pode gerenciar todos
CREATE POLICY "Admins can manage company users" ON public.users
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid()