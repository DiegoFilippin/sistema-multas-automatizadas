-- Corrigir constraints de split e adicionar coluna taxa_cobranca
-- Esta migração remove constraints problemáticas e adiciona a coluna taxa_cobranca

-- Primeiro, vamos verificar e remover constraints problemáticas
DO $$ 
BEGIN
    -- Remover constraint check_split_sum_valid se existir
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_split_sum_valid') THEN
        ALTER TABLE services DROP CONSTRAINT check_split_sum_valid;
        RAISE NOTICE 'Constraint check_split_sum_valid removida';
    END IF;
END $$;

-- Adicionar coluna taxa_cobranca se não existir
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS taxa_cobranca DECIMAL(10,2) DEFAULT 3.50;

-- Atualizar valores padrão para o serviço Recurso de Multa
UPDATE services 
SET 
  acsm_value = COALESCE(acsm_value, 6.00),
  icetran_value = COALESCE(icetran_value, 6.00),
  taxa_cobranca = COALESCE(taxa_cobranca, 3.50),
  updated_at = NOW()
WHERE name = 'Recurso de Multa' AND category = 'Trânsito';

-- Adicionar comentário na nova coluna
COMMENT ON COLUMN services.taxa_cobranca IS 'Taxa fixa em R$ da cobrança (custo operacional)';

-- Verificar se as colunas foram criadas/atualizadas corretamente
SELECT 
  id,
  name,
  acsm_value,
  icetran_value,
  taxa_cobranca,
  (acsm_value + icetran_value + COALESCE(taxa_cobranca, 0)) as custo_minimo
FROM services 
WHERE name = 'Recurso de Multa';