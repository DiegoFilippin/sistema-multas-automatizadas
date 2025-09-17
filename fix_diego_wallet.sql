-- Script para corrigir o wallet ID da empresa do usuário diego2@despachante.com

-- 1. Primeiro, vamos buscar o usuário e sua empresa
SELECT 
    u.id as user_id,
    u.email,
    u.company_id,
    c.nome as company_name,
    c.cnpj,
    c.asaas_wallet_id as current_wallet
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.email = 'diego2@despachante.com';

-- 2. Atualizar o wallet ID correto para a empresa
UPDATE companies 
SET asaas_wallet_id = '2bab1d7d-7558-45ac-953d-b9f7a980c4af'
WHERE id = (
    SELECT company_id 
    FROM users 
    WHERE email = 'diego2@despachante.com'
);

-- 3. Verificar se a atualização foi bem-sucedida
SELECT 
    u.id as user_id,
    u.email,
    u.company_id,
    c.nome as company_name,
    c.cnpj,
    c.asaas_wallet_id as updated_wallet
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.email = 'diego2@despachante.com';