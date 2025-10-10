-- Criar tabela service_orders para gerenciar pedidos de serviço com pagamento
-- Esta tabela implementa o novo fluxo de recurso de multa com pagamento obrigatório

CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Dados do serviço
  service_type VARCHAR(50) NOT NULL DEFAULT 'recurso_multa',
  multa_type VARCHAR(20) NOT NULL CHECK (multa_type IN ('leve', 'media', 'grave', 'gravissima')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  
  -- Status do pedido
  status VARCHAR(20) NOT NULL DEFAULT 'pending_payment' 
    CHECK (status IN ('pending_payment', 'paid', 'processing', 'completed', 'cancelled', 'expired')),
  
  -- Dados do recurso (preenchidos após pagamento)
  auto_autuacao_url TEXT,
  recurso_generated_url TEXT,
  ai_analysis TEXT,
  
  -- Metadados
  description TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Índices para performance
  CONSTRAINT service_orders_client_company_check 
    CHECK (client_id IS NOT NULL AND company_id IS NOT NULL)
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_service_orders_client_id ON service_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_company_id ON service_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_payment_id ON service_orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_service_type ON service_orders(service_type);
CREATE INDEX IF NOT EXISTS idx_service_orders_created_at ON service_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_orders_expires_at ON service_orders(expires_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_service_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_service_orders_updated_at ON service_orders;
CREATE TRIGGER trigger_update_service_orders_updated_at
  BEFORE UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_service_orders_updated_at();

-- Função para atualizar paid_at quando status muda para 'paid'
CREATE OR REPLACE FUNCTION update_service_orders_paid_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudou para 'paid' e paid_at ainda não foi definido
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.paid_at IS NULL THEN
    NEW.paid_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar paid_at
DROP TRIGGER IF EXISTS trigger_update_service_orders_paid_at ON service_orders;
CREATE TRIGGER trigger_update_service_orders_paid_at
  BEFORE UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_service_orders_paid_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

-- Política para Superadmin (acesso total)
CREATE POLICY "Superadmin full access to service_orders" ON service_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' = 'Superadmin'
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'Superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' = 'Superadmin'
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'Superadmin'
    )
  );

-- Política para ICETRAN (acesso total)
CREATE POLICY "ICETRAN full access to service_orders" ON service_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ICETRAN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ICETRAN'
    )
  );

-- Política para Despachante (pode criar e ver pedidos da sua empresa)
CREATE POLICY "Despachante access to service_orders" ON service_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'Despachante'
      AND u.company_id = service_orders.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'Despachante'
      AND u.company_id = service_orders.company_id
    )
  );

-- Política para Usuario/Cliente (acesso limitado - será implementado conforme necessário)
-- Por enquanto, clientes não têm acesso direto ao sistema de pedidos
-- O acesso será gerenciado através dos despachantes

-- Conceder permissões básicas
GRANT SELECT, INSERT, UPDATE ON service_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON service_orders TO anon;

-- Comentários para documentação
COMMENT ON TABLE service_orders IS 'Tabela para gerenciar pedidos de serviço com pagamento obrigatório';
COMMENT ON COLUMN service_orders.service_type IS 'Tipo do serviço (recurso_multa, etc.)';
COMMENT ON COLUMN service_orders.multa_type IS 'Tipo da multa: leve, media, grave, gravissima';
COMMENT ON COLUMN service_orders.status IS 'Status: pending_payment, paid, processing, completed, cancelled, expired';
COMMENT ON COLUMN service_orders.auto_autuacao_url IS 'URL do arquivo de auto de autuação enviado pelo cliente';
COMMENT ON COLUMN service_orders.recurso_generated_url IS 'URL do recurso gerado pela IA';
COMMENT ON COLUMN service_orders.ai_analysis IS 'Análise da IA sobre o recurso';
COMMENT ON COLUMN service_orders.expires_at IS 'Data de expiração do pedido (padrão: 7 dias)';