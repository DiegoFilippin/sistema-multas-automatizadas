-- Criar usuários de teste para os 4 perfis: Superadmin, ICETRAN, Despachante, Usuario/Cliente
-- Data: $(date +%Y-%m-%d)

-- 1. Primeiro, verificar se já existem usuários com esses emails
SELECT 
    'Usuários existentes antes da criação' as info,
    email,
    nome,
    role
FROM users 
WHERE email IN (
    'superadmin@sistema.com',
    'icetran@sistema.com', 
    'despachante@sistema.com',
    'cliente@sistema.com'
)
ORDER BY role;

-- 2. Inserir usuários de teste (usando ON CONFLICT para evitar duplicatas)

-- Superadmin - Acesso total ao sistema
INSERT INTO users (
    id,
    email,
    nome,
    role,
    company_id,
    ativo,
    password_hash,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'superadmin@sistema.com',
    'Superadministrador Sistema',
    'Superadmin',
    NULL, -- Superadmin não está vinculado a uma empresa específica
    true,
    '$2b$10$example.hash.for.password.super123', -- Hash para 'super123'
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    nome = EXCLUDED.nome,
    updated_at = NOW();

-- ICETRAN - Gerencia despachantes e tem acesso amplo
INSERT INTO users (
    id,
    email,
    nome,
    role,
    company_id,
    ativo,
    password_hash,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'icetran@sistema.com',
    'Administrador ICETRAN',
    'ICETRAN',
    '550e8400-e29b-41d4-a716-446655440001', -- ID da empresa ICETRAN
    true,
    '$2b$10$example.hash.for.password.icetran123', -- Hash para 'icetran123'
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    nome = EXCLUDED.nome,
    updated_at = NOW();

-- Despachante - Gerencia clientes e multas
INSERT INTO users (
    id,
    email,
    nome,
    role,
    company_id,
    ativo,
    password_hash,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    'despachante@sistema.com',
    'João Silva - Despachante',
    'Despachante',
    '550e8400-e29b-41d4-a716-446655440001', -- ID da empresa
    true,
    '$2b$10$example.hash.for.password.desp123', -- Hash para 'desp123'
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    nome = EXCLUDED.nome,
    updated_at = NOW();

-- Usuario/Cliente - Acesso limitado aos próprios dados
INSERT INTO users (
    id,
    email,
    nome,
    role,
    company_id,
    ativo,
    password_hash,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000004',
    'cliente@sistema.com',
    'Maria Santos - Cliente',
    'Usuario/Cliente',
    '550e8400-e29b-41d4-a716-446655440001', -- ID da empresa
    true,
    '$2b$10$example.hash.for.password.cliente123', -- Hash para 'cliente123'
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    nome = EXCLUDED.nome,
    updated_at = NOW();

-- 3. Verificar os usuários criados
SELECT 
    'Usuários de teste criados' as info,
    id,
    email,
    nome,
    role,
    company_id,
    ativo,
    created_at
FROM users 
WHERE email IN (
    'superadmin@sistema.com',
    'icetran@sistema.com', 
    'despachante@sistema.com',
    'cliente@sistema.com'
)
ORDER BY 
    CASE role
        WHEN 'Superadmin' THEN 1
        WHEN 'ICETRAN' THEN 2
        WHEN 'Despachante' THEN 3
        WHEN 'Usuario/Cliente' THEN 4
        ELSE 5
    END;

-- 4. Mostrar resumo dos perfis
SELECT 
    'Resumo dos perfis no sistema' as info,
    role,
    COUNT(*) as quantidade,
    STRING_AGG(nome, ', ') as usuarios
FROM users 
GROUP BY role
ORDER BY 
    CASE role
        WHEN 'Superadmin' THEN 1
        WHEN 'ICETRAN' THEN 2
        WHEN 'Despachante' THEN 3
        WHEN 'Usuario/Cliente' THEN 4
        ELSE 5
    END;

-- 5. Instruções de login
SELECT 
    'Credenciais de teste' as info,
    'Use as seguintes credenciais para testar cada perfil:' as instrucoes,
    '1. Superadmin: superadmin@sistema.com / super123' as superadmin,
    '2. ICETRAN: icetran@sistema.com / icetran123' as icetran,
    '3. Despachante: despachante@sistema.com / desp123' as despachante,
    '4. Usuario/Cliente: cliente@sistema.com / cliente123' as cliente;