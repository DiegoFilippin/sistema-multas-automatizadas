-- Verificar se o usuário super@sistema.com existe na tabela auth.users
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    is_super_admin
FROM auth.users 
WHERE email = 'super@sistema.com';

-- Também verificar na tabela users da aplicação
SELECT 
    id,
    email,
    nome,
    role,
    ativo
FROM users 
WHERE email = 'super@sistema.com';