# Funcionalidade: Gerenciamento Manual de Wallet ID e API Key para Subcontas

## 📋 Visão Geral

Esta documentação descreve a implementação da funcionalidade que permite ao **superadmin** inserir manualmente o **Wallet ID** e **API Key** das subcontas Asaas, proporcionando maior flexibilidade no gerenciamento de contas de clientes e despachantes.

## 🎯 Objetivos

- Permitir que o superadmin configure manualmente as credenciais de subcontas Asaas
- Facilitar a correção de subcontas com problemas de sincronização automática
- Fornecer controle total sobre as configurações de pagamento das empresas
- Garantir segurança no armazenamento e acesso às credenciais sensíveis

## 🏗️ Estrutura de Dados

### 1. Tabela `asaas_subaccounts` (Existente - Modificada)

```sql
-- Adicionar campos para armazenar credenciais manualmente
ALTER TABLE asaas_subaccounts 
ADD COLUMN IF NOT EXISTS manual_wallet_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS manual_api_key TEXT,
ADD COLUMN IF NOT EXISTS credentials_source VARCHAR(50) DEFAULT 'auto' CHECK (credentials_source IN ('auto', 'manual')),
ADD COLUMN IF NOT EXISTS credentials_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS credentials_updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_manual_config BOOLEAN DEFAULT FALSE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_asaas_subaccounts_manual_wallet ON asaas_subaccounts(manual_wallet_id);
CREATE INDEX IF NOT EXISTS idx_asaas_subaccounts_is_manual ON asaas_subaccounts(is_manual_config);
```

### 2. Tabela de Auditoria (Nova)

```sql
-- Tabela para registrar alterações de credenciais
CREATE TABLE IF NOT EXISTS asaas_credentials_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subaccount_id UUID REFERENCES asaas_subaccounts(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Índice para consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_credentials_audit_subaccount ON asaas_credentials_audit(subaccount_id);
CREATE INDEX IF NOT EXISTS idx_credentials_audit_changed_at ON asaas_credentials_audit(changed_at DESC);
```

## 🎨 Interface do Usuário

### 1. Modal de Configuração Manual

**Localização:** `/src/components/ManualSubaccountConfigModal.tsx`

**Componentes:**
- Formulário com campos para Wallet ID e API Key
- Toggle para ativar/desativar configuração manual
- Preview mascarado das credenciais existentes
- Botões de ação (Salvar, Cancelar, Testar Conexão)

**Layout Proposto:**

```tsx
interface ManualConfigModalProps {
  subaccount: AsaasSubaccount;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Estrutura do formulário:
// 1. Toggle switch: "Usar configuração manual"
// 2. Campo Wallet ID (habilitado apenas quando manual estiver ativo)
// 3. Campo API Key (type="password" com botão de revelar)
// 4. Botão "Testar Conexão" para validar as credenciais
// 5. Preview das credenciais atuais (mascaradas)
```

### 2. Coluna de Ações na Listagem

**Localização:** `/src/pages/SubcontasAdmin.tsx` (modificar tabela existente)

**Adicionar:**
- Botão "Configurar Manualmente" em cada linha da subconta
- Ícone indicando quando uma subconta usa configuração manual
- Tooltip mostrando "Configuração Manual" vs "Configuração Automática"

### 3. Indicadores Visuais

- **Badge** na cor azul para subcontas com configuração manual
- **Ícone** de chave/engrenagem ao lado do nome da subconta
- **Tooltip** explicando o tipo de configuração ao passar o mouse

## ⚙️ Fluxo de Implementação

### 1. Backend - Service Layer

**Arquivo:** `/src/services/subaccountService.ts`

```typescript
interface ManualConfigData {
  wallet_id?: string;
  api_key?: string;
  is_manual: boolean;
}

interface ConfigTestResult {
  success: boolean;
  message: string;
  tested_at: string;
  response_time?: number;
}

class SubaccountService {
  
  // Atualizar configuração manual
  async updateManualConfig(subaccountId: string, config: ManualConfigData): Promise<AsaasSubaccount> {
    // 1. Validar credenciais (formato básico)
    // 2. Criptografar API key antes de salvar
    // 3. Registrar auditoria
    // 4. Atualizar registro no banco
    // 5. Invalidar cache se existir
  }

  // Testar conexão com credenciais manualmente
  async testManualConnection(walletId: string, apiKey: string): Promise<ConfigTestResult> {
    // 1. Fazer requisição de teste ao Asaas
    // 2. Medir tempo de resposta
    // 3. Validar se as credenciais têm permissões necessárias
    // 4. Retornar resultado detalhado
  }

  // Obter histórico de alterações
  async getCredentialsHistory(subaccountId: string): Promise<CredentialsAudit[]> {
    // 1. Buscar registros de auditoria
    // 2. Formatar dados para exibição
    // 3. Incluir informações do usuário que fez as alterações
  }

  // Alternar entre configuração manual e automática
  async toggleConfigMode(subaccountId: string, useManual: boolean): Promise<AsaasSubaccount> {
    // 1. Atualizar flag is_manual_config
    // 2. Se voltando para automático, limpar credenciais manuais
    // 3. Registrar mudança na auditoria
  }
}
```

### 2. API Endpoints (Backend)

**Arquivo:** `/src/api/subaccounts/manual-config.ts`

```typescript
// POST /api/subaccounts/:id/manual-config
// Atualizar configuração manual
export async function POST(req: Request, { params }: { params: { id: string } }) {
  // 1. Validar autenticação e permissões (apenas superadmin)
  // 2. Validar dados recebidos
  // 3. Chamar subaccountService.updateManualConfig()
  // 4. Retornar resposta com dados atualizados
}

// GET /api/subaccounts/:id/test-connection
// Testar conexão com credenciais atuais
export async function GET(req: Request, { params }: { params: { id: string } }) {
  // 1. Obter subaccount
  // 2. Determinar quais credenciais usar (manuais ou automáticas)
  // 3. Testar conexão
  // 4. Retornar resultado
}

// GET /api/subaccounts/:id/credentials-history
// Obter histórico de alterações
export async function GET(req: Request, { params }: { params: { id: string } }) {
  // 1. Validar permissões
  // 2. Buscar histórico de auditoria
  // 3. Retornar dados formatados
}
```

### 3. Frontend - Componentes React

**Estrutura de componentes:**

1. **ManualSubaccountConfigModal.tsx** - Modal principal de configuração
2. **CredentialsHistory.tsx** - Componente de histórico de alterações
3. **ConfigTestButton.tsx** - Botão para testar conexão
4. **ManualConfigIndicator.tsx** - Badge/ícone indicador

**Estados do formulário:**

```typescript
interface ConfigFormState {
  is_manual: boolean;
  wallet_id: string;
  api_key: string;
  show_api_key: boolean;
  testing_connection: boolean;
  saving: boolean;
  errors: {
    wallet_id?: string;
    api_key?: string;
    general?: string;
  };
}
```

## 🔒 Validações e Segurança

### 1. Validações de Formato

**Wallet ID:**
- Deve ter entre 10 e 50 caracteres
- Permitir apenas caracteres alfanuméricos e hífens
- Validar formato específico do Asaas (se houver padrão)

**API Key:**
- Deve ter no mínimo 20 caracteres
- Validar se começa com prefixo esperado (ex: "$aact_")
- Verificar formato base64 ou padrão específico

### 2. Validações de Segurança

```typescript
const validateCredentials = (walletId: string, apiKey: string): ValidationResult => {
  const errors: string[] = [];

  // Validações básicas
  if (!walletId || walletId.length < 10) {
    errors.push('Wallet ID deve ter no mínimo 10 caracteres');
  }

  if (!apiKey || apiKey.length < 20) {
    errors.push('API Key deve ter no mínimo 20 caracteres');
  }

  // Validação de formato
  if (apiKey && !apiKey.startsWith('$aact_')) {
    errors.push('API Key deve começar com "$aact_"');
  }

  // Validação de caracteres
  const validWalletPattern = /^[a-zA-Z0-9-]+$/;
  if (walletId && !validWalletPattern.test(walletId)) {
    errors.push('Wallet ID contém caracteres inválidos');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### 3. Segurança de Dados

**Criptografia:**
- Criptografar API key antes de salvar no banco
- Usar algoritmo AES-256 com chave armazenada em variável de ambiente
- Nunca expor API key completa na interface (sempre mascarada)

**Controle de Acesso:**
- Apenas superadmin pode acessar esta funcionalidade
- Verificar permissão em todos os endpoints relacionados
- Registrar IP e user agent em todas as alterações

**Auditoria:**
- Registrar todas as operações de CRUD em credenciais
- Manter histórico completo com valores antigos e novos
- Permitir visualização do histórico para auditoria

### 4. Testes de Segurança

**Testes Recomendados:**
1. **SQL Injection** - Verificar se queries são parametrizadas
2. **XSS** - Validar escape de dados na interface
3. **CSRF** - Implementar tokens de proteção
4. **Rate Limiting** - Limitar tentativas de teste de conexão
5. **Encryption** - Verificar se dados sensíveis estão criptografados

## 🧪 Testes e Validação

### 1. Testes Unitários

**Service Tests:**
```typescript
describe('SubaccountService - Manual Config', () => {
  test('should validate credentials format', () => {
    // Testar validações de formato
  });

  test('should encrypt API key before saving', () => {
    // Verificar criptografia
  });

  test('should create audit log on credential change', () => {
    // Verificar registro de auditoria
  });

  test('should test connection with Asaas API', async () => {
    // Testar integração com Asaas
  });
});
```

### 2. Testes de Integração

**API Tests:**
```typescript
describe('Manual Config API', () => {
  test('should reject non-superadmin users', async () => {
    // Verificar proteção de acesso
  });

  test('should update manual config successfully', async () => {
    // Testar fluxo completo
  });

  test('should test connection and return result', async () => {
    // Testar endpoint de teste
  });

  test('should return credentials history', async () => {
    // Testar histórico de auditoria
  });
});
```

### 3. Testes de Interface

**Component Tests:**
```typescript
describe('ManualConfigModal', () => {
  test('should show validation errors', () => {
    // Testar validações no formulário
  });

  test('should mask/unmask API key', () => {
    // Testar toggle de visibilidade
  });

  test('should disable fields when manual config is off', () => {
    // Testar estado do formulário
  });

  test('should call API on save', async () => {
    // Testar submissão do formulário
  });
});
```

## 📊 Métricas e Monitoramento

### 1. Métricas de Uso

- Número de subcontas com configuração manual
- Taxa de sucesso de testes de conexão
- Tempo médio de configuração manual
- Frequência de alterações de credenciais

### 2. Logs e Monitoramento

```typescript
// Registrar eventos importantes
logger.info('manual_config_enabled', {
  subaccount_id: subaccountId,
  user_id: userId,
  company_id: companyId,
  timestamp: new Date().toISOString()
});

logger.error('connection_test_failed', {
  subaccount_id: subaccountId,
  error: error.message,
  response_time: responseTime
});
```

### 3. Alertas

- Notificar quando credenciais manuais falham no teste
- Alertar sobre alterações frequentes de credenciais
- Monitorar tentativas de acesso não autorizado

## 🚀 Implementação Passo a Passo

### Fase 1: Backend (2-3 horas)
1. [ ] Criar migrations de banco de dados
2. [ ] Implementar service layer com validações
3. [ ] Criar API endpoints com proteção de acesso
4. [ ] Implementar sistema de auditoria
5. [ ] Adicionar criptografia de dados sensíveis

### Fase 2: Frontend (3-4 horas)
1. [ ] Criar componente de modal de configuração
2. [ ] Adicionar formulário com validações
3. [ ] Implementar botão de teste de conexão
4. [ ] Adicionar indicadores visuais na listagem
5. [ ] Criar componente de histórico de alterações

### Fase 3: Integração e Testes (2-3 horas)
1. [ ] Integrar frontend com backend
2. [ ] Adicionar tratamento de erros
3. [ ] Escrever testes unitários
4. [ ] Realizar testes de integração
5. [ ] Validar segurança e permissões

### Fase 4: Documentação e Deploy (1 hora)
1. [ ] Atualizar documentação técnica
2. [ ] Criar guia de uso para superadmin
3. [ ] Realizar deploy em ambiente de teste
4. [ ] Validar funcionamento em produção

## 🔧 Manutenção e Troubleshooting

### Problemas Comuns

1. **Credenciais não funcionam**
   - Verificar se Wallet ID e API Key estão corretos
   - Testar conexão no ambiente correto (sandbox/production)
   - Verificar se a conta Asaas tem as permissões necessárias

2. **Erro de criptografia**
   - Verificar se a chave de criptografia está configurada
   - Validar se o algoritmo de criptografia é suportado

3. **Auditoria não registra**
   - Verificar triggers do banco de dados
   - Validar permissões de inserção na tabela de auditoria

### Manutenção Preventiva

- Revisar logs de auditoria mensalmente
- Testar conexões manuais periodicamente
- Atualizar validações conforme mudanças na API do Asaas
- Realizar backup das credenciais criptografadas

## 📚 Referências

- [Documentação API Asaas](https://docs.asaas.com/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://github.com/colinhacks/zod)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)

---

**Status:** Documentação Técnica Completa  
**Versão:** 1.0.0  
**Data:** Janeiro