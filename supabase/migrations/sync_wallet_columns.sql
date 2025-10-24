-- Criar coluna manual_wallet_id se ainda não existir
ALTER TABLE companies ADD COLUMN IF NOT EXISTS manual_wallet_id TEXT;

-- Sincronizar manual_wallet_id com asaas_wallet_id quando necessário
DO $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- 1) Copiar valores de asaas_wallet_id -> manual_wallet_id onde manual_wallet_id está vazio
  UPDATE companies
  SET manual_wallet_id = asaas_wallet_id
  WHERE (manual_wallet_id IS NULL OR manual_wallet_id = '')
    AND asaas_wallet_id IS NOT NULL
    AND asaas_wallet_id <> '';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Registros atualizados para manual_wallet_id: %', updated_count;

  -- 2) Relatório de consistência
  PERFORM 1 FROM companies
    WHERE (manual_wallet_id IS NULL OR manual_wallet_id = '')
      AND (asaas_wallet_id IS NOT NULL AND asaas_wallet_id <> '');
  IF FOUND THEN
    RAISE NOTICE 'Ainda existem empresas com manual_wallet_id vazio e asaas_wallet_id preenchido.';
  ELSE
    RAISE NOTICE 'Todas as empresas com asaas_wallet_id tiveram manual_wallet_id sincronizado.';
  END IF;

  -- 3) Checagem antes de descontinuação
  RAISE NOTICE 'Empresas ainda com asaas_wallet_id preenchido:';
  PERFORM 1 FROM companies WHERE asaas_wallet_id IS NOT NULL AND asaas_wallet_id <> '';
  IF FOUND THEN
    RAISE NOTICE 'Existem registros com asaas_wallet_id. Remoção da coluna deve ser feita após auditoria.';
  ELSE
    RAISE NOTICE 'Nenhum registro usando asaas_wallet_id. Coluna pronta para descontinuação.';
  END IF;
END $$;

-- Observação: a remoção da coluna deve ser feita em uma migração separada após validação:
-- ALTER TABLE companies DROP COLUMN IF EXISTS asaas_wallet_id;