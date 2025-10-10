-- Criar tabela de créditos para clientes e empresas
CREATE TABLE credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('client', 'company')),
    owner_id UUID NOT NULL, -- client_id ou company_id
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_purchased DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_used DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT credits_balance_positive CHECK (balance >= 0),
    UNIQUE(owner_type, owner_id)
);

-- Índices para otimizar consultas
CREATE INDEX idx_credits_owner ON credits(owner_type, owner_id);
CREATE INDEX idx_credits_balance ON credits(balance);

-- Comentários para documentação
COMMENT ON TABLE credits IS 'Tabela para armazenar saldos de créditos de clientes e empresas';
COMMENT ON COLUMN credits.owner_type IS 'Tipo do proprietário: client ou company';
COMMENT ON COLUMN credits.owner_id IS 'ID do cliente ou empresa proprietária dos créditos';
COMMENT ON COLUMN credits.balance IS 'Saldo atual de créditos disponíveis';
COMMENT ON COLUMN credits.total_purchased IS 'Total de créditos já comprados';
COMMENT ON COLUMN credits.total_used IS 'Total de créditos já utilizados';

-- Habilitar RLS (Row Level Security)
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas seus próprios créditos
CREATE POLICY "Users can view their own credits" ON credits
    FOR SELECT USING (
        (owner_type = 'client' AND owner_id = auth.uid()) OR
        (owner_type = 'company' AND owner_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        ))
    );

-- Política para permitir que o sistema atualize créditos
CREATE POLICY "System can manage credits" ON credits
    FOR ALL USING (true);

-- Conceder permissões para roles
GRANT SELECT, INSERT, UPDATE ON credits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON credits TO service_role;
GRANT SELECT ON credits TO anon;