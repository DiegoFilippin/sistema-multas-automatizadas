-- Tabela de configurações do Asaas
CREATE TABLE asaas_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  webhook_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de preços base (Admin Master)
CREATE TABLE pricing_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL CHECK (service_type IN ('recurso', 'assinatura_acompanhamento')),
  base_price DECIMAL(10,2) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de preços por empresa
CREATE TABLE pricing_empresa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  service_type TEXT NOT NULL CHECK (service_type IN ('recurso', 'assinatura_acompanhamento')),
  markup_percentage DECIMAL(5,2) DEFAULT 0, -- Percentual sobre o preço base
  fixed_markup DECIMAL(10,2) DEFAULT 0, -- Valor fixo adicional
  final_price DECIMAL(10,2), -- Preço final calculado
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(empresa_id, service_type)
);

-- Tabela de preços por despachante
CREATE TABLE pricing_despachante (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  despachante_id UUID NOT NULL REFERENCES usuarios(id),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  service_type TEXT NOT NULL CHECK (service_type IN ('recurso', 'assinatura_acompanhamento')),
  markup_percentage DECIMAL(5,2) DEFAULT 0, -- Percentual sobre o preço da empresa
  fixed_markup DECIMAL(10,2) DEFAULT 0, -- Valor fixo adicional
  final_price DECIMAL(10,2), -- Preço final para o cliente
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(despachante_id, empresa_id, service_type)
);

-- Tabela de clientes Asaas
CREATE TABLE asaas_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asaas_customer_id TEXT UNIQUE NOT NULL, -- ID do cliente no Asaas
  cliente_id UUID REFERENCES clientes(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  cpf_cnpj TEXT NOT NULL,
  postal_code TEXT,
  address TEXT,
  address_number TEXT,
  complement TEXT,
  province TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'Brasil',
  external_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de transações/pagamentos
CREATE TABLE asaas_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asaas_payment_id TEXT UNIQUE NOT NULL, -- ID do pagamento no Asaas
  asaas_customer_id TEXT NOT NULL REFERENCES asaas_customers(asaas_customer_id),
  recurso_id UUID REFERENCES recursos(id), -- Para pagamentos de recursos
  subscription_id UUID, -- Para assinaturas (implementar tabela depois)
  service_type TEXT NOT NULL CHECK (service_type IN ('recurso', 'assinatura_acompanhamento')),
  billing_type TEXT NOT NULL CHECK (billing_type IN ('BOLETO', 'CREDIT_CARD', 'PIX', 'UNDEFINED')),
  value DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'AWAITING_PAYMENT', 'RECEIVED', 'CONFIRMED', 
    'OVERDUE', 'DELETED', 'RESTORED', 'REFUNDED'
  )),
  description TEXT,
  external_reference TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  confirmation_date TIMESTAMP WITH TIME ZONE,
  invoice_url TEXT,
  bank_slip_url TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  webhook_data JSONB, -- Dados completos do webhook
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de assinaturas Asaas
CREATE TABLE asaas_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asaas_subscription_id TEXT UNIQUE NOT NULL, -- ID da assinatura no Asaas
  asaas_customer_id TEXT NOT NULL REFERENCES asaas_customers(asaas_customer_id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  despachante_id UUID NOT NULL REFERENCES usuarios(id),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  billing_type TEXT NOT NULL CHECK (billing_type IN ('BOLETO', 'CREDIT_CARD', 'PIX')),
  value DECIMAL(10,2) NOT NULL,
  cycle TEXT NOT NULL CHECK (cycle IN (
    'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 
    'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'
  )),
  next_due_date DATE NOT NULL,
  end_date DATE,
  max_payments INTEGER,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN (
    'ACTIVE', 'INACTIVE', 'EXPIRED', 'CANCELLED'
  )),
  description TEXT,
  external_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de webhooks recebidos
CREATE TABLE asaas_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  asaas_payment_id TEXT,
  asaas_subscription_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_asaas_config_active ON asaas_config(active);
CREATE INDEX idx_pricing_base_service_type ON pricing_base(service_type, active);
CREATE INDEX idx_pricing_empresa_empresa_service ON pricing_empresa(empresa_id, service_type, active);
CREATE INDEX idx_pricing_despachante_despachante_service ON pricing_despachante(despachante_id, service_type, active);
CREATE INDEX idx_asaas_customers_cliente_id ON asaas_customers(cliente_id);
CREATE INDEX idx_asaas_transactions_recurso_id ON asaas_transactions(recurso_id);
CREATE INDEX idx_asaas_transactions_status ON asaas_transactions(status);
CREATE INDEX idx_asaas_transactions_service_type ON asaas_transactions(service_type);
CREATE INDEX idx_asaas_subscriptions_cliente_id ON asaas_subscriptions(cliente_id);
CREATE INDEX idx_asaas_subscriptions_status ON asaas_subscriptions(status);
CREATE INDEX idx_asaas_webhooks_processed ON asaas_webhooks(processed);
CREATE INDEX idx_asaas_webhooks_event_type ON asaas_webhooks(event_type);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_asaas_config_updated_at BEFORE UPDATE ON asaas_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_base_updated_at BEFORE UPDATE ON pricing_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_empresa_updated_at BEFORE UPDATE ON pricing_empresa FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_despachante_updated_at BEFORE UPDATE ON pricing_despachante FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asaas_customers_updated_at BEFORE UPDATE ON asaas_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asaas_transactions_updated_at BEFORE UPDATE ON asaas_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_asaas_subscriptions_updated_at BEFORE UPDATE ON asaas_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE asaas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_despachante ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_webhooks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (ajustar conforme necessário)
-- Admin Master pode ver tudo
CREATE POLICY "Admin master can manage all" ON asaas_config FOR ALL USING (
  EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() AND u.tipo_usuario = 'admin_master'
  )
);

CREATE POLICY "Admin master can manage pricing_base" ON pricing_base FOR ALL USING (
  EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() AND u.tipo_usuario = 'admin_master'
  )
);

-- Empresas podem ver seus próprios preços
CREATE POLICY "Empresa can manage own pricing" ON pricing_empresa FOR ALL USING (
  EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() 
    AND (u.tipo_usuario = 'admin_master' OR u.empresa_id = empresa_id)
  )
);

-- Despachantes podem ver seus próprios preços
CREATE POLICY "Despachante can manage own pricing" ON pricing_despachante FOR ALL USING (
  EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() 
    AND (u.tipo_usuario = 'admin_master' OR u.id = despachante_id OR u.empresa_id = empresa_id)
  )
);

-- Usuários podem ver transações relacionadas a eles
CREATE POLICY "Users can view related transactions" ON asaas_transactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() 
    AND (
      u.tipo_usuario = 'admin_master' OR
      EXISTS (
        SELECT 1 FROM recursos r 
        WHERE r.id = recurso_id AND r.despachante_id = u.id
      )
    )
  )
);

-- Usuários podem ver assinaturas relacionadas a eles
CREATE POLICY "Users can view related subscriptions" ON asaas_subscriptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM usuarios u 
    WHERE u.id = auth.uid() 
    AND (
      u.tipo_usuario = 'admin_master' OR
      u.id = despachante_id OR
      u.empresa_id = empresa_id
    )
  )
);

-- Permitir acesso aos roles anon e authenticated para operações específicas
GRANT SELECT ON asaas_config TO authenticated;
GRANT SELECT ON pricing_base TO authenticated;
GRANT SELECT ON pricing_empresa TO authenticated;
GRANT SELECT ON pricing_despachante TO authenticated;
GRANT ALL ON asaas_customers TO authenticated;
GRANT ALL ON asaas_transactions TO authenticated;
GRANT ALL ON asaas_subscriptions TO authenticated;
GRANT ALL ON asaas_webhooks TO authenticated;

-- Permitir acesso anônimo para webhooks
GRANT INSERT ON asaas_webhooks TO anon;