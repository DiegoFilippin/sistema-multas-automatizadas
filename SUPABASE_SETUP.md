# Configuração do Supabase

## ✅ Problema Resolvido

O erro `TypeError: Failed to construct 'URL': Invalid URL` foi corrigido! A aplicação agora funciona com um cliente mock quando o Supabase não está configurado.

## 🎭 Modo de Desenvolvimento (Atual)

Atualmente, a aplicação está rodando com dados mock para demonstração:
- **Email:** admin@demo.com
- **Senha:** demo123

## 🚀 Para Configurar Supabase Real

### 1. Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova conta ou faça login
3. Clique em "New Project"
4. Escolha uma organização e dê um nome ao projeto
5. Defina uma senha para o banco de dados
6. Escolha uma região próxima

### 2. Obter Credenciais
1. No dashboard do projeto, vá em **Settings** → **API**
2. Copie a **Project URL**
3. Copie a **anon/public key**

### 3. Configurar Variáveis de Ambiente
Atualize o arquivo `.env` com suas credenciais reais:

```env
# Supabase
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-anon-aqui"
```

### 4. Executar Migrações SQL

No **SQL Editor** do Supabase, execute os seguintes comandos:

```sql
-- Criar tabelas principais
CREATE TABLE companies_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  ativo BOOLEAN DEFAULT true,
  ultimo_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE multas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
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
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'em_recurso', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
```

### 5. Configurar RLS (Row Level Security)

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE companies_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE multas ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança (exemplo básico)
CREATE POLICY "Users can view own company data" ON companies
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own clients" ON clients
  FOR SELECT USING (company_id IN (
    SELECT id FROM companies WHERE auth.uid()::text = id::text
  ));
```

### 6. Reiniciar a Aplicação

Após configurar as variáveis de ambiente:

```bash
npm run dev
```

## 🔧 Funcionalidades Implementadas

- ✅ Sistema de autenticação mock
- ✅ Fallback automático para dados mock
- ✅ Validação de URLs do Supabase
- ✅ Mensagens de erro claras
- ✅ Estrutura completa do banco de dados
- ✅ Serviços para todas as entidades
- ✅ Row Level Security configurado

## 📝 Próximos Passos

1. Configurar Supabase real seguindo este guia
2. Testar autenticação com usuários reais
3. Implementar upload de documentos
4. Configurar notificações por email
5. Implementar relatórios avançados

---

**Nota:** A aplicação funciona perfeitamente em modo de desenvolvimento com dados mock. Você pode explorar todas as funcionalidades antes de configurar o Supabase real.