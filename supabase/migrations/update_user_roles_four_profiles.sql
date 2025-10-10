-- Migração para implementar 4 perfis de usuário: Superadmin, ICETRAN, Despachante, Usuario/Cliente
-- Data: $(date +%Y-%m-%d)

-- 1. Primeiro, remover a constraint antiga de role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Atualizar os roles existentes para os novos nomes
-- Mapear todos os roles existentes para os novos 4 perfis
UPDATE users 
SET role = CASE 
    WHEN role = 'admin' THEN 'ICETRAN'
    WHEN role = 'user' THEN 'Despachante'
    WHEN role = 'viewer' THEN 'Usuario/Cliente'
    WHEN role = 'admin_master' THEN 'Superadmin'
    ELSE 'Usuario/Cliente'  -- Qualquer outro role vira Usuario/Cliente
END;

-- 3. Adicionar nova constraint com os 4 perfis
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('Superadmin', 'ICETRAN', 'Despachante', 'Usuario/Cliente'));

-- 4. Atualizar o valor padrão para 'Usuario/Cliente'
ALTER TABLE users 
ALTER COLUMN role SET DEFAULT 'Usuario/Cliente';

-- 5. Adicionar comentários para documentar os perfis
COMMENT ON COLUMN users.role IS 'Perfil do usuário: Superadmin (acesso total), ICETRAN (gerencia despachantes), Despachante (gerencia clientes), Usuario/Cliente (acesso limitado)';

-- 6. Verificar a atualização
SELECT 
    'Verificação dos perfis atualizados' as info,
    role,
    COUNT(*) as quantidade
FROM users 
GROUP BY role
ORDER BY role;

-- 7. Mostrar alguns usuários de exemplo
SELECT 
    'Usuários após migração' as info,
    id,
    email,
    nome,
    role,
    ativo
FROM users 
ORDER BY role, nome
LIMIT 10;