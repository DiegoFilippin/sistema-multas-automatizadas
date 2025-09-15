-- Verificar se a tabela asaas_subaccounts existe e tem o relacionamento correto

-- Verificar se a tabela asaas_subaccounts existe
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'asaas_subaccounts' AND table_schema = 'public';

-- Verificar se a tabela companies existe
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'companies' AND table_schema = 'public';

-- Verificar as colunas da tabela asaas_subaccounts (se existir)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'asaas_subaccounts' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar as colunas da tabela companies (se existir)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'companies' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar foreign keys entre as tabelas
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'asaas_subaccounts' OR ccu.table_name = 'companies');