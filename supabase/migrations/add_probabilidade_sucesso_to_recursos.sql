-- Adicionar campo probabilidade_sucesso na tabela recursos
ALTER TABLE recursos ADD COLUMN probabilidade_sucesso INTEGER DEFAULT 0;

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN recursos.probabilidade_sucesso IS 'Probabilidade de sucesso do recurso em porcentagem (0-100)';

-- Atualizar recursos existentes com uma probabilidade padrão
UPDATE recursos SET probabilidade_sucesso = 75 WHERE probabilidade_sucesso IS NULL;