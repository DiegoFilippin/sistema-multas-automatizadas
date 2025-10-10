-- Verificar se a empresa ICETRAN foi configurada corretamente
SELECT 
    id,
    nome,
    cnpj,
    company_type,
    email,
    telefone,
    status
FROM companies 
WHERE cnpj = '02968119000188' 
   OR nome ILIKE '%ICETRAN%'
   OR company_type = 'icetran';

-- Estatísticas por tipo de empresa
SELECT 
    company_type,
    COUNT(*) as total
FROM companies 
GROUP BY company_type
ORDER BY company_type;