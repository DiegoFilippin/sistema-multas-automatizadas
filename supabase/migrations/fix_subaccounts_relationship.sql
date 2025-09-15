-- Verificar e corrigir relacionamento entre asaas_subaccounts e companies

-- Primeiro, verificar se as tabelas existem
SELECT 'Verificando tabelas...' as status;

-- Verificar tabela companies
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'companies' AND table_schema = 'public';

-- Verificar tabela asaas_subaccounts
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'asaas_subaccounts' AND table_schema = 'public';

-- Se a tabela asaas_subaccounts não existir, criar ela
CREATE TABLE IF NOT EXISTS asaas_subaccounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    asaas_account_id VARCHAR(100) NOT NULL UNIQUE,
    wallet_id VARCHAR(100) NOT NULL UNIQUE,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('subadquirente', 'despachante')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    api_key VARCHAR(200),
    webhook_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Se a tabela split_configurations não existir, criar ela
CREATE TABLE IF NOT EXISTS split_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR(50) NOT NULL,
    acsm_percentage DECIMAL(5,2) NOT NULL DEFAULT 30.00,
    icetran_percentage DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    despachante_percentage DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT check_split_total CHECK (
        acsm_percentage + icetran_percentage + despachante_percentage = 100.00
    )
);

-- Adicionar campos necessários na tabela companies se não existirem
ALTER TABLE companies ADD COLUMN IF NOT EXISTS asaas_subaccount_id UUID REFERENCES asaas_subaccounts(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES companies(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_level VARCHAR(20) DEFAULT 'despachante' 
    CHECK (company_level IN ('master', 'subadquirente', 'despachante'));

-- Inserir configurações padrão de split se não existirem
INSERT INTO split_configurations (service_type, acsm_percentage, icetran_percentage, despachante_percentage) 
SELECT 'recurso', 30.00, 20.00, 50.00
WHERE NOT EXISTS (SELECT 1 FROM split_configurations WHERE service_type = 'recurso');

INSERT INTO split_configurations (service_type, acsm_percentage, icetran_percentage, despachante_percentage) 
SELECT 'assinatura_acompanhamento', 40.00, 15.00, 45.00
WHERE NOT EXISTS (SELECT 1 FROM split_configurations WHERE service_type = 'assinatura_acompanhamento');

-- Verificar se as tabelas foram criadas corretamente
SELECT 'Tabelas verificadas e criadas com sucesso!' as resultado;

-- Listar as tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('companies', 'asaas_subaccounts', 'split_configurations')
ORDER BY table_name;