-- Corrigir constraint users_role_check para usar os novos roles
-- Data: 2025-01-13

-- 1. Remover constraint antiga se existir
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Adicionar nova constraint com os 4 perfis corretos
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('Superadmin', 'ICETRAN', 'Despachante', 'Usuario/Cliente'));

-- 3. Atualizar valor padrão
ALTER TABLE users 
ALTER COLUMN role SET DEFAULT 'Usuario/Cliente';

-- 4. Verificar constraint aplicada
SELECT 
    'Constraint users_role_check aplicada' as status,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'users_role_check';

-- 5. Verificar roles existentes
SELECT 
    'Roles atuais na tabela users' as info,
    role,
    COUNT(*) as quantidade
FROM users 
GROUP BY role
ORDER BY role;