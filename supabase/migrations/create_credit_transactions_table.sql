-- Criar tabela de transações de créditos
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'transfer')),
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    service_id UUID REFERENCES services(id), -- Para transações de uso
    payment_id UUID, -- Para transações de compra (será referenciado após criar tabela payments)
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Índices para otimizar consultas
CREATE INDEX idx_credit_transactions_credit_id ON credit_transactions(credit_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_service_id ON credit_transactions(service_id);
CREATE INDEX idx_credit_transactions_payment_id ON credit_transactions(payment_id);

-- Comentários para documentação
COMMENT ON TABLE credit_transactions IS 'Histórico completo de transações de créditos';
COMMENT ON COLUMN credit_transactions.credit_id IS 'Referência para a conta de créditos';
COMMENT ON COLUMN credit_transactions.transaction_type IS 'Tipo da transação: purchase, usage, refund, transfer';
COMMENT ON COLUMN credit_transactions.amount IS 'Valor da transação (positivo para crédito, negativo para débito)';
COMMENT ON COLUMN credit_transactions.balance_before IS 'Saldo antes da transação';
COMMENT ON COLUMN credit_transactions.balance_after IS 'Saldo após a transação';
COMMENT ON COLUMN credit_transactions.service_id IS 'ID do serviço utilizado (para transações de uso)';
COMMENT ON COLUMN credit_transactions.payment_id IS 'ID do pagamento (para transações de compra)';
COMMENT ON COLUMN credit_transactions.description IS 'Descrição detalhada da transação';
COMMENT ON COLUMN credit_transactions.metadata IS 'Dados adicionais em formato JSON';
COMMENT ON COLUMN credit_transactions.created_by IS 'Usuário que iniciou a transação';

-- Habilitar RLS (Row Level Security)
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas transações de seus próprios créditos
CREATE POLICY "Users can view their own credit transactions" ON credit_transactions
    FOR SELECT USING (
        credit_id IN (
            SELECT id FROM credits WHERE 
                (owner_type = 'client' AND owner_id = auth.uid()) OR
                (owner_type = 'company' AND owner_id IN (
                    SELECT company_id FROM users WHERE id = auth.uid()
                ))
        )
    );

-- Política para permitir que o sistema gerencie transações
CREATE POLICY "System can manage credit transactions" ON credit_transactions
    FOR ALL USING (true);

-- Conceder permissões para roles
GRANT SELECT, INSERT ON credit_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON credit_transactions TO service_role;
GRANT SELECT ON credit_transactions TO anon;

-- Função para atualizar automaticamente o updated_at da tabela credits
CREATE OR REPLACE FUNCTION update_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE credits 
    SET updated_at = NOW() 
    WHERE id = NEW.credit_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at quando uma transação é criada
CREATE TRIGGER trigger_update_credits_updated_at
    AFTER INSERT ON credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_credits_updated_at();