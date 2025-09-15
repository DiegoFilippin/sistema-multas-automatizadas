-- Migração para corrigir políticas RLS para admin_master
-- Data: 2024-12-21
-- Permite acesso do admin_master à tabela user_profiles

-- Adicionar política para admin_master acessar todos os perfis
CREATE POLICY "Admin master can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin_master'
        )
    );

-- Adicionar política para admin_master atualizar todos os perfis
CREATE POLICY "Admin master can update all profiles" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.id = auth.uid() AND up.role = 'admin_master'
        )
    );

-- Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY policyname;