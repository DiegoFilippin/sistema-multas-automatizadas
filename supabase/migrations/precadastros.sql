-- Migration: Criar tabela de pré-cadastros (corrigida)
-- Data: 2025-10-31

-- Tabela para armazenar pré-cadastros de empresas interessadas
CREATE TABLE IF NOT EXISTS public.precadastros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados pessoais
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    data_nascimento DATE,
    
    -- Dados da empresa
    cnpj VARCHAR(18) NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    endereco TEXT,
    numero VARCHAR(20),
    complemento VARCHAR(255),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    
    -- Status do pré-cadastro
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    
    -- Dados de controle
    webhook_enviado BOOLEAN DEFAULT false,
    webhook_response TEXT,
    observacoes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_precadastros_status ON public.precadastros(status);
CREATE INDEX IF NOT EXISTS idx_precadastros_email ON public.precadastros(email);
CREATE INDEX IF NOT EXISTS idx_precadastros_cnpj ON public.precadastros(cnpj);
CREATE INDEX IF NOT EXISTS idx_precadastros_created_at ON public.precadastros(created_at);

-- Trigger para manter updated_at
CREATE OR REPLACE FUNCTION public.update_precadastros_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_precadastros_updated_at
    BEFORE UPDATE ON public.precadastros
    FOR EACH ROW
    EXECUTE FUNCTION public.update_precadastros_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.precadastros ENABLE ROW LEVEL SECURITY;

-- Comentários para documentação
COMMENT ON TABLE public.precadastros IS 'Tabela para armazenar pré-cadastros de empresas interessadas no sistema';
COMMENT ON COLUMN public.precadastros.status IS 'Status do pré-cadastro: pendente, aprovado, rejeitado';
COMMENT ON COLUMN public.precadastros.webhook_enviado IS 'Indica se os dados foram enviados para o webhook n8n';
COMMENT ON COLUMN public.precadastros.webhook_response IS 'Resposta do webhook n8n';