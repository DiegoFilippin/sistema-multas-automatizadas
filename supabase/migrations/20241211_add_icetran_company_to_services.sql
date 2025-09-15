-- Adicionar campo icetran_company_id à tabela services
-- Esta migração adiciona suporte para configurar qual empresa ICETRAN
-- receberá a parte do split de pagamento para cada serviço

ALTER TABLE services 
ADD COLUMN icetran_company_id UUID REFERENCES companies(id);

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN services.icetran_company_id IS 'ID da empresa ICETRAN que receberá a parte do split de pagamento para este serviço';

-- Criar índice para melhorar performance das consultas
CREATE INDEX idx_services_icetran_company_id ON services(icetran_company_id);

-- Nota: Validação de empresa ativa será implementada na aplicação
-- pois constraints com subqueries não são suportadas no PostgreSQL

-- Atualizar RLS policies se necessário
-- (as policies existentes devem continuar funcionando)

-- Inserir dados de exemplo (opcional)
-- UPDATE services SET icetran_company_id = (
--   SELECT id FROM companies WHERE name ILIKE '%icetran%' LIMIT 1
-- ) WHERE name = 'Recurso de Multa';