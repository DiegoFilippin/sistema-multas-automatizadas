-- Corrige constraints da tabela public.users para compatibilidade com Supabase Auth
-- - Torna password_hash opcional (senhas gerenciadas pelo Supabase Auth)
-- - Normaliza roles existentes para valores permitidos ('admin'|'user')
-- - Recria check constraint de role para 'admin' e 'user' (removendo 'viewer' e outros)
-- - Atribui company_id ao admin@test.com se estiver nulo
-- - Normaliza role do admin para 'admin'

BEGIN;

-- Garantir schema público
SET search_path TO public;

-- 1) Tornar password_hash opcional
ALTER TABLE public.users
  ALTER COLUMN password_hash DROP NOT NULL;

-- 2) Remover constraint de role existente (se houver)
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

-- 3) Normalizar valores de role existentes para 'admin' ou 'user'
-- Regra: qualquer role que não seja 'admin' ou 'user' vira 'user'
UPDATE public.users
SET role = CASE
  WHEN role = 'admin' THEN 'admin'
  WHEN role = 'user' THEN 'user'
  ELSE 'user'
END;

-- 4) Recriar check constraint de role permitindo apenas 'admin' e 'user'
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin','user'));

-- 5) Atribuir um company_id ao admin@test.com se estiver nulo
UPDATE public.users u
SET company_id = (
  SELECT c.id FROM public.companies c ORDER BY c.created_at ASC LIMIT 1
)
WHERE u.email = 'admin@test.com'
  AND u.company_id IS NULL;

-- 6) Normalizar role do admin para 'admin' se estiver diferente
UPDATE public.users
SET role = 'admin'
WHERE email = 'admin@test.com' AND role <> 'admin';

-- 7) Relatórios úteis
-- Lista empresas existentes
SELECT 'companies' AS table_name, id, nome FROM public.companies ORDER BY created_at ASC;

-- Verifica estado do usuário admin após ajustes
SELECT 'users_admin' AS table_name, id, email, role, company_id FROM public.users WHERE email = 'admin@test.com';

COMMIT;