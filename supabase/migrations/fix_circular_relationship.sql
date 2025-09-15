-- Remover relacionamento circular entre companies e asaas_subaccounts
-- O relacionamento deve ser apenas: asaas_subaccounts -> companies (company_id)
-- Não precisamos de companies -> asaas_subaccounts (asaas_subaccount_id)

-- 1. Remover a foreign key constraint
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_asaas_subaccount_id_fkey;

-- 2. Remover a coluna asaas_subaccount_id da tabela companies
ALTER TABLE companies DROP COLUMN IF EXISTS asaas_subaccount_id;

-- 3. Verificar se o relacionamento foi corrigido
SELECT 
    'Relacionamentos restantes entre companies e asaas_subaccounts:' as info;

SELECT 
    tc.constraint_name,
    tc.table_name as source_table,
    kcu.column_name as source_column,
    ccu.table_name as target_table,
    ccu.column_name as target_column
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND (
        (tc.table_name = 'companies' AND ccu.table_name = 'asaas_subaccounts')
        OR 
        (tc.table_name = 'asaas_subaccounts' AND ccu.table_name = 'companies')
    );

-- Resultado esperado: apenas asaas_subaccounts_company_id_fkey deve existir