-- Adicionar coluna data_nascimento à tabela clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;