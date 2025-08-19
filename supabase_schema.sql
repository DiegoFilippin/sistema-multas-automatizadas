-- =====================================================
-- SCHEMA POSTGRESQL PARA SUPABASE - SISTEMA MULTAS SaaS
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. TABELA DE EMPRESAS MASTER (Principais)
-- =====================================================
CREATE TABLE companies_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABELA DE PLANOS
-- =====================================================
CREATE TABLE plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  limite_empresas INTEGER NOT NULL,
  limite_usuarios_por_empresa INTEGER NOT NULL,
  limite_clientes INTEGER NOT NULL,
  limite_multas INTEGER NOT NULL,
  limite_recursos INTEGER NOT NULL,
  funcionalidades TEXT[] DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABELA DE EMPRESAS (Filiais/Subsidiárias)
-- =====================================================
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  master_company_id UUID REFERENCES companies_master(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE RESTRICT,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  endereco TEXT,
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
  data_inicio_assinatura TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim_assinatura TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TABELA DE USUÁRIOS
-- =====================================================
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  ativo BOOLEAN DEFAULT true,
  ultimo_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TABELA DE CLIENTES
-- =====================================================
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(18) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. TABELA DE VEÍCULOS
-- =====================================================
CREATE TABLE vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  placa VARCHAR(10) NOT NULL,
  modelo VARCHAR(100),
  marca VARCHAR(50),
  ano INTEGER,
  cor VARCHAR(30),
  renavam VARCHAR(20),
  chassi VARCHAR(30),
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'vendido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. TABELA DE MULTAS
-- =====================================================
CREATE TABLE multas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  numero_auto VARCHAR(50) NOT NULL,
  placa_veiculo VARCHAR(10) NOT NULL,
  data_infracao DATE NOT NULL,
  hora_infracao TIME,
  local_infracao TEXT NOT NULL,
  codigo_infracao VARCHAR(20) NOT NULL,
  descricao_infracao TEXT NOT NULL,
  valor_original DECIMAL(10,2) NOT NULL,
  valor_desconto DECIMAL(10,2) DEFAULT 0,
  valor_final DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'em_recurso', 'cancelado', 'vencido')),
  orgao_autuador VARCHAR(100),
  pontos INTEGER DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. TABELA DE RECURSOS
-- =====================================================
CREATE TABLE recursos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  multa_id UUID REFERENCES multas(id) ON DELETE CASCADE,
  numero_processo VARCHAR(50),
  tipo_recurso VARCHAR(50) NOT NULL,
  data_protocolo DATE NOT NULL,
  prazo_resposta DATE,
  status VARCHAR(20) DEFAULT 'protocolado' CHECK (status IN ('protocolado', 'em_analise', 'deferido', 'indeferido', 'cancelado')),
  fundamentacao TEXT NOT NULL,
  documentos_anexos TEXT[],
  resposta_orgao TEXT,
  data_resposta DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. TABELA DE DOCUMENTOS
-- =====================================================
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  multa_id UUID REFERENCES multas(id) ON DELETE CASCADE,
  recurso_id UUID REFERENCES recursos(id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(255) NOT NULL,
  tipo_documento VARCHAR(50) NOT NULL,
  url_arquivo TEXT NOT NULL,
  tamanho_arquivo INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. TABELA DE LOGS DE ATIVIDADE
-- =====================================================
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  acao VARCHAR(100) NOT NULL,
  entidade VARCHAR(50) NOT NULL,
  entidade_id UUID,
  detalhes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para companies
CREATE INDEX idx_companies_master_company_id ON companies(master_company_id);
CREATE INDEX idx_companies_plan_id ON companies(plan_id);
CREATE INDEX idx_companies_status ON companies(status);

-- Índices para users
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Índices para clients
CREATE INDEX idx_clients_company_id ON clients(company_id);
CREATE INDEX idx_clients_cpf_cnpj ON clients(cpf_cnpj);
CREATE INDEX idx_clients_status ON clients(status);

-- Índices para vehicles
CREATE INDEX idx_vehicles_client_id ON vehicles(client_id);
CREATE INDEX idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX idx_vehicles_placa ON vehicles(placa);

-- Índices para multas
CREATE INDEX idx_multas_company_id ON multas(company_id);
CREATE INDEX idx_multas_client_id ON multas(client_id);
CREATE INDEX idx_multas_vehicle_id ON multas(vehicle_id);
CREATE INDEX idx_multas_placa_veiculo ON multas(placa_veiculo);
CREATE INDEX idx_multas_data_infracao ON multas(data_infracao);
CREATE INDEX idx_multas_status ON multas(status);
CREATE INDEX idx_multas_numero_auto ON multas(numero_auto);

-- Índices para recursos
CREATE INDEX idx_recursos_company_id ON recursos(company_id);
CREATE INDEX idx_recursos_multa_id ON recursos(multa_id);
CREATE INDEX idx_recursos_status ON recursos(status);
CREATE INDEX idx_recursos_data_protocolo ON recursos(data_protocolo);

-- Índices para documents
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_documents_multa_id ON documents(multa_id);
CREATE INDEX idx_documents_recurso_id ON documents(recurso_id);

-- Índices para activity_logs
CREATE INDEX idx_activity_logs_company_id ON activity_logs(company_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers
CREATE TRIGGER update_companies_master_updated_at BEFORE UPDATE ON companies_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_multas_updated_at BEFORE UPDATE ON multas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recursos_updated_at BEFORE UPDATE ON recursos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE companies_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE multas ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- Políticas para companies
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own company" ON companies
  FOR UPDATE USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin')
    )
  );

-- Políticas para users
CREATE POLICY "Users can view company users" ON users
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage company users" ON users
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para clients
CREATE POLICY "Users can view company clients" ON clients
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company clients" ON clients
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'user')
    )
  );

-- Políticas para vehicles
CREATE POLICY "Users can view company vehicles" ON vehicles
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company vehicles" ON vehicles
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'user')
    )
  );

-- Políticas para multas
CREATE POLICY "Users can view company multas" ON multas
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company multas" ON multas
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'user')
    )
  );

-- Políticas para recursos
CREATE POLICY "Users can view company recursos" ON recursos
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company recursos" ON recursos
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'user')
    )
  );

-- Políticas para documents
CREATE POLICY "Users can view company documents" ON documents
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company documents" ON documents
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'user')
    )
  );

-- Políticas para activity_logs
CREATE POLICY "Users can view company logs" ON activity_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir planos padrão
INSERT INTO plans (nome, descricao, preco, limite_empresas, limite_usuarios_por_empresa, limite_clientes, limite_multas, limite_recursos, funcionalidades) VALUES
('Básico', 'Plano básico para pequenas empresas', 99.90, 1, 3, 100, 500, 100, ARRAY['dashboard', 'multas', 'recursos', 'clientes']),
('Profissional', 'Plano profissional para empresas médias', 199.90, 3, 10, 500, 2000, 500, ARRAY['dashboard', 'multas', 'recursos', 'clientes', 'relatorios', 'api']),
('Empresarial', 'Plano empresarial para grandes empresas', 399.90, 10, 50, 2000, 10000, 2000, ARRAY['dashboard', 'multas', 'recursos', 'clientes', 'relatorios', 'api', 'integracao', 'suporte_prioritario']);

-- Inserir empresa master de demonstração
INSERT INTO companies_master (id, nome, email, telefone, endereco) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Empresa Demo Master', 'admin@demo.com', '(11) 99999-9999', 'Rua Demo, 123 - São Paulo, SP');

-- Inserir empresa de demonstração
INSERT INTO companies (id, master_company_id, plan_id, nome, cnpj, email, telefone, endereco, data_inicio_assinatura) VALUES
('550e8400-e29b-41d4-a716-446655440001', 
'550e8400-e29b-41d4-a716-446655440000', 
(SELECT id FROM plans WHERE nome = 'Profissional' LIMIT 1),
'Empresa Demo', 
'12.345.678/0001-90', 
'contato@demo.com', 
'(11) 88888-8888', 
'Av. Demo, 456 - São Paulo, SP',
NOW());

-- Inserir usuário administrador de demonstração
INSERT INTO users (id, company_id, email, nome, password_hash, role) VALUES
('550e8400-e29b-41d4-a716-446655440002',
'550e8400-e29b-41d4-a716-446655440001',
'admin@demo.com',
'Administrador Demo',
crypt('demo123', gen_salt('bf')),
'admin');

-- Inserir cliente de demonstração
INSERT INTO clients (id, company_id, nome, cpf_cnpj, email, telefone, cidade, estado) VALUES
('550e8400-e29b-41d4-a716-446655440003',
'550e8400-e29b-41d4-a716-446655440001',
'João Silva Demo',
'123.456.789-00',
'joao@demo.com',
'(11) 77777-7777',
'São Paulo',
'SP');

-- Inserir veículo de demonstração
INSERT INTO vehicles (id, client_id, company_id, placa, modelo, marca, ano, cor) VALUES
('550e8400-e29b-41d4-a716-446655440004',
'550e8400-e29b-41d4-a716-446655440003',
'550e8400-e29b-41d4-a716-446655440001',
'ABC-1234',
'Civic',
'Honda',
2020,
'Prata');

-- Inserir multa de demonstração
INSERT INTO multas (id, company_id, client_id, vehicle_id, numero_auto, placa_veiculo, data_infracao, local_infracao, codigo_infracao, descricao_infracao, valor_original, valor_final, data_vencimento, orgao_autuador, pontos) VALUES
('550e8400-e29b-41d4-a716-446655440005',
'550e8400-e29b-41d4-a716-446655440001',
'550e8400-e29b-41d4-a716-446655440003',
'550e8400-e29b-41d4-a716-446655440004',
'SP123456789',
'ABC-1234',
'2024-01-15',
'Av. Paulista, 1000 - São Paulo/SP',
'74550',
'Excesso de velocidade',
195.23,
195.23,
'2024-02-15',
'CET-SP',
5);

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para verificar limites do plano
CREATE OR REPLACE FUNCTION check_plan_limits(company_uuid UUID, resource_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    plan_limit INTEGER;
BEGIN
    -- Buscar limite do plano
    SELECT 
        CASE resource_type
            WHEN 'clients' THEN p.limite_clientes
            WHEN 'multas' THEN p.limite_multas
            WHEN 'recursos' THEN p.limite_recursos
            WHEN 'users' THEN p.limite_usuarios_por_empresa
        END INTO plan_limit
    FROM companies c
    JOIN plans p ON c.plan_id = p.id
    WHERE c.id = company_uuid;
    
    -- Contar recursos atuais
    SELECT 
        CASE resource_type
            WHEN 'clients' THEN (SELECT COUNT(*) FROM clients WHERE company_id = company_uuid)
            WHEN 'multas' THEN (SELECT COUNT(*) FROM multas WHERE company_id = company_uuid)
            WHEN 'recursos' THEN (SELECT COUNT(*) FROM recursos WHERE company_id = company_uuid)
            WHEN 'users' THEN (SELECT COUNT(*) FROM users WHERE company_id = company_uuid)
        END INTO current_count;
    
    RETURN current_count < plan_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas da empresa
CREATE OR REPLACE FUNCTION get_company_stats(company_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_clients', (SELECT COUNT(*) FROM clients WHERE company_id = company_uuid),
        'total_multas', (SELECT COUNT(*) FROM multas WHERE company_id = company_uuid),
        'total_recursos', (SELECT COUNT(*) FROM recursos WHERE company_id = company_uuid),
        'multas_pendentes', (SELECT COUNT(*) FROM multas WHERE company_id = company_uuid AND status = 'pendente'),
        'recursos_em_analise', (SELECT COUNT(*) FROM recursos WHERE company_id = company_uuid AND status IN ('protocolado', 'em_analise')),
        'valor_total_multas', (SELECT COALESCE(SUM(valor_final), 0) FROM multas WHERE company_id = company_uuid),
        'valor_multas_pendentes', (SELECT COALESCE(SUM(valor_final), 0) FROM multas WHERE company_id = company_uuid AND status = 'pendente')
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

-- Este schema inclui:
-- ✅ Todas as tabelas necessárias para o SaaS de multas
-- ✅ Relacionamentos e constraints apropriados
-- ✅ Índices para performance
-- ✅ Row Level Security (RLS) para multi-tenancy
-- ✅ Triggers para updated_at automático
-- ✅ Dados iniciais para demonstração
-- ✅ Funções auxiliares para validações e estatísticas
-- ✅ Estrutura preparada para escalabilidade

-- Para usar este schema:
-- 1. Execute este arquivo no SQL Editor do Supabase
-- 2. Configure as variáveis de ambiente no seu projeto
-- 3. Teste a aplicação com os dados de demonstração
-- 4. Customize conforme suas necessidades específicas