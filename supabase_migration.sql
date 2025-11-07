-- Migração para adicionar coluna data_nascimento na tabela clients
-- Este arquivo deve ser executado pelo Trae diretamente no Supabase

BEGIN;

-- Adicionar coluna data_nascimento se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'clients' 
        AND column_name = 'data_nascimento'
    ) THEN
        ALTER TABLE public.clients ADD COLUMN data_nascimento DATE;
        RAISE NOTICE 'Coluna data_nascimento adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna data_nascimento já existe';
    END IF;
END $$;

-- Criar índice se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename = 'clients' 
        AND indexname = 'idx_clients_data_nascimento'
    ) THEN
        CREATE INDEX idx_clients_data_nascimento ON public.clients(data_nascimento);
        RAISE NOTICE 'Índice idx_clients_data_nascimento criado com sucesso';
    ELSE
        RAISE NOTICE 'Índice idx_clients_data_nascimento já existe';
    END IF;
END $$;

COMMIT;

-- Verificar se a coluna foi criada
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'clients' 
AND column_name = 'data_nascimento';