-- Função RPC para executar SQL diretamente
-- Execute este comando no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Dar permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

-- Comando para adicionar a coluna data_nascimento (caso ainda não exista)
-- ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;