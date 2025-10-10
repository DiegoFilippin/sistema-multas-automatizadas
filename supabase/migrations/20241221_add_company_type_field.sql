-- Adicionar campo company_type à tabela companies para identificação automática
-- Esta migração adiciona suporte para categorização de empresas por tipo

-- Adicionar campo company_type com valores permitidos
ALTER TABLE companies 
ADD COLUMN company_type VARCHAR(20) DEFAULT 'despachante' 
CHECK (company_type IN ('despachante', 'icetran', 'acsm', 'cliente'));

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN companies.company_type IS 'Tipo da empresa: despachante (padrão), icetran, acsm, cliente';

-- Criar índice para melhorar performance das consultas por tipo
CREATE INDEX idx_companies_company_type ON companies(company_type);

-- Configurar empresa ICETRAN específica baseada nos dados fornecidos
-- ICETRAN INSTITUTO DE CERTIFICACAO E ESTUDOS DE TRANSITO E TRANSPORTE LTDA
-- CNPJ: 02968119000188
UPDATE companies 
SET company_type = 'icetran' 
WHERE cnpj = '02968119000188' 
   OR nome ILIKE '%ICETRAN INSTITUTO DE CERTIFICACAO%'
   OR nome ILIKE '%ICETRAN%';

-- Verificar se a empresa ICETRAN foi encontrada e atualizada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM companies 
        WHERE company_type = 'icetran' 
        AND (cnpj = '02968119000188' OR nome ILIKE '%ICETRAN%')
    ) THEN
        RAISE NOTICE 'ATENÇÃO: Empresa ICETRAN não foi encontrada. Verifique se ela existe no banco de dados.';
    ELSE
        RAISE NOTICE 'Empresa ICETRAN configurada com sucesso como tipo "icetran".';
    END IF;
END $$;

-- Atualizar RLS policies se necessário para considerar o novo campo
-- (As policies existentes continuarão funcionando normalmente)

-- Estatísticas após a migração
SELECT 
    company_type,
    COUNT(*) as total_empresas,
    STRING_AGG(nome, ', ' ORDER BY nome) as empresas
FROM companies 
GROUP BY company_type
ORDER BY company_type;