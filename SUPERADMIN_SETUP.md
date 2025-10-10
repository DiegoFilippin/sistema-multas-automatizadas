# Setup do Superadmin - Status Atual

## ✅ O que foi feito com sucesso:

1. **Políticas RLS corrigidas**: As políticas de Row Level Security foram ajustadas para permitir acesso do admin_master
2. **Perfil criado**: O perfil do usuário admin_master foi criado na tabela `user_profiles` com:
   - ID: `00000000-0000-0000-0000-000000000002`
   - Email: `master@sistema.com`
   - Nome: `Admin Master`
   - Role: `admin_master`

3. **AuthService corrigido**: O serviço de autenticação foi atualizado para usar a tabela `user_profiles` corretamente

## ❌ Problema restante:

O usuário de autenticação não foi criado na tabela `auth.users` do Supabase devido a problemas com a API admin.

## 🔧 Como resolver manualmente:

### Opção 1: Via Supabase Dashboard
1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para o projeto: `ktgynzdzvfcpvbdbtplu`
3. Navegue para **Authentication > Users**
4. Clique em **Add user**
5. Preencha:
   - Email: `master@sistema.com`
   - Password: `master123`
   - Confirm email: ✅ (marcado)
   - User ID: `00000000-0000-0000-0000-000000000002`

### Opção 2: Via SQL Editor no Supabase
1. Acesse **SQL Editor** no Supabase Dashboard
2. Execute o seguinte SQL:

```sql
-- Inserir usuário na auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'master@sistema.com',
  crypt('master123', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Admin Master"}',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Inserir identidade
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  created_at,
  updated_at,
  email
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '{"sub": "00000000-0000-0000-0000-000000000002", "email": "master@sistema.com"}',
  'email',
  NOW(),
  NOW(),
  'master@sistema.com'
)
ON CONFLICT (provider, provider_id) DO NOTHING;
```

## 🧪 Como testar:

Após criar o usuário de autenticação, execute:

```bash
npx tsx scripts/checkSuperAdmin.ts
```

Ou acesse diretamente:
- URL: http://localhost:5173/login
- Email: master@sistema.com
- Senha: master123

## 🎯 Funcionalidades do Superadmin:

- ✅ Acesso a todas as rotas do sistema
- ✅ Acesso exclusivo a `/subcontas-admin` e `/subcontas-test`
- ✅ Gerenciamento de subcontas e split de pagamentos
- ✅ Configurações do sistema Asaas
- ✅ Bypass de políticas RLS quando necessário

## 📝 Credenciais:

- **Email**: master@sistema.com
- **Senha**: master123
- **Role**: admin_master
- **Acesso**: http://localhost:5173/login

---

**Status**: ⚠️ Aguardando criação manual do usuário de autenticação
**Próximo passo**: Criar usuário via Supabase Dashboard ou