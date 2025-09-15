-- Verificar roles existentes antes da migração
SELECT 
    'Roles atuais na tabela users' as info,
    role,
    COUNT(*) as quantidade
FROM users 
GROUP BY role
ORDER BY role;

-- Mostrar alguns usuários de exemplo com seus roles
SELECT 
    'Exemplos de usuários' as info,
    id,
    email,
    nome,
    role,
    ativo
FROM users 
ORDER BY role, nome
LIMIT 15;