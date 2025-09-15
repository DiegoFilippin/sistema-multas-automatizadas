-- Migração para corrigir recursão infinita nas políticas RLS
-- Data: 2024-12-21
-- Remove políticas problemáticas e cria políticas mais simples

-- Remover políticas que causam recursão infinita
DROP POLICY IF EXISTS "Admin master can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin master can update all profiles" ON public.user_profiles;

-- Desabilitar RLS temporariamente para admin_master
-- Criar uma política mais simples que não cause recursão
CREATE POLICY "Allow admin_master full access" ON public.user_profiles
    FOR ALL USING (
        auth.uid() = '00000000-0000-0000-0000-000000000002'::uuid
        OR auth.uid() = id
    );

-- Verificar políticas ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'user_profiles' 
ORDER BY policyname;