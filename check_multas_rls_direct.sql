-- Verificar políticas RLS da tabela multas
-- Execute este SQL no Supabase SQL Editor

-- 1. Verificar se RLS está habilitado na tabela multas
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'multas';

-- 2. Listar todas as políticas da tabela multas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'multas';

-- 3. Testar acesso direto às multas
SELECT 
    id,
    company_id,
    client_id,
    placa_veiculo,
    descricao_infracao
FROM multas 
LIMIT 5;

-- 4. Contar multas por client_id
SELECT 
    client_id,
    COUNT(*) as total_multas
FROM multas 
WHERE client_id IS NOT NULL
GROUP BY client_id
ORDER BY total_multas DESC
LIMIT 10;

-- 5. Verificar se existe relação entre clients e multas
SELECT 
    c.id as client_id,
    c.nome as client_nome,
    c.company_id,
    COUNT(m.id) as total_multas
FROM clients c
LEFT JOIN multas m ON m.client_id = c.id
GROUP BY c.id, c.nome, c.company_id
HAVING COUNT(m.id) > 0
ORDER BY total_multas DESC
LIMIT 10;

-- 6. Verificar um cliente específico e suas multas
-- Substitua o ID pelo ID do cliente que você está testando
SELECT 
    'Cliente:' as tipo,
    c.id,
    c.nome,
    c.company_id
FROM clients c 
WHERE c.id = '11d64113-575f-4618-8f81-a301ec3ec881'

UNION ALL

SELECT 
    'Multa:' as tipo,
    m.id,
    m.placa_veiculo,
    m.company_id
FROM multas m 
WHERE m.client_id = '11d64113-575f-4618-8f81-a301ec3ec881'
LIMIT 10;