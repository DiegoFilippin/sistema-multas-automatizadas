-- Migration para adicionar admin_master como role válida
-- Data: 2024-12-21

-- Atualizar a constraint CHECK da tabela user_profiles para incluir admin_master
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('user', 'admin', 'expert', 'admin_master'));

-- Comentário explicativo sobre os tipos de usuário
COMMENT ON COLUMN public.user_profiles.role IS 'Tipos de usuário: user (usuário comum), admin (administrador da empresa), expert (especialista jurídico), admin_master (super administrador do sistema)';

-- Verificar se a alteração foi aplicada corretamente
SELECT constraint_name, check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%user_profiles_role_check%';