-- Migration: Criar tabela de pré-cadastros
-- Data: 2024-12-21

-- Tabela para armazenar pré-cadastros de empresas interessadas
CREATE TABLE IF NOT EXISTS precadastros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados pessoais (Etapa 1)
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    
    -- Dados da empresa (Etapa 2)
    cnpj VARCHAR(18) NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    porte VARCHAR(50),
    situacao VARCHAR(100),
    
    -- Status do pré-cadastro
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    
    -- Dados de controle
    webhook_enviado BOOLEAN DEFAULT false,
    webhook_response TEXT,
    observacoes_admin TEXT,
    aprovado_por UUID, -- ID do admin que aprovou/rejeitou
    data_aprovacao TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_precadastros_status ON precadastros(status);
CREATE INDEX IF NOT EXISTS idx_precadastros_email ON precadastros(email);
CREATE INDEX IF NOT EXISTS idx_precadastros_cnpj ON precadastros(cnpj);
CREATE INDEX IF NOT EXISTS idx_precadastros_created_at ON precadastros(created_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_precadastros_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_precadastros_updated_at
    BEFORE UPDATE ON precadastros
    FOR EACH ROW
    EXECUTE FUNCTION update_precadastros_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE precadastros ENABLE ROW LEVEL SECURITY;

-- Política RLS: Apenas superadmins podem ver todos os pré-cadastros
CREATE POLICY "Superadmins can view all precadastros" ON precadastros
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin_master'
        )
    );

-- Comentários para documentação
COMMENT ON TABLE precadastros IS 'Tabela para armazenar pré-cadastros de empresas interessadas no sistema';
COMMENT ON COLUMN precadastros.status IS 'Status do pré-cadastro: pendente, aprovado, rejeitado';
COMMENT ON COLUMN precadastros.webhook_enviado IS 'Indica se os dados foram enviados para o webhook n8n';
COMMENT ON COLUMN precadastros.webhook_response IS 'Resposta do webhook n8n';