# Migração: Sistema de Saldo Pré-Pago

## ⚠️ IMPORTANTE: Execute esta migração no Supabase antes de usar o sistema

### Passo 1: Acessar o Supabase SQL Editor

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral

### Passo 2: Executar a Migração

Copie e execute o seguinte SQL no editor:

```sql
-- Criar tabela de transações de saldo pré-pago se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'prepaid_wallet_transactions'
    ) THEN
        CREATE TABLE public.prepaid_wallet_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES public.companies(id),
            type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
            amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
            service_id UUID NULL REFERENCES public.services(id),
            service_order_id UUID NULL REFERENCES public.service_orders(id),
            balance_after NUMERIC(12,2) NOT NULL,
            notes TEXT NULL,
            created_by UUID NULL REFERENCES public.users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX idx_prepaid_wallet_transactions_company ON public.prepaid_wallet_transactions(company_id, created_at DESC);
        CREATE INDEX idx_prepaid_wallet_transactions_order ON public.prepaid_wallet_transactions(service_order_id);
        RAISE NOTICE 'Tabela prepaid_wallet_transactions criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela prepaid_wallet_transactions já existe';
    END IF;
END $$;

-- Adicionar colunas para sinalizar pagamentos pré-pagos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'service_orders'
          AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.service_orders
            ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'asaas';
        RAISE NOTICE 'Coluna payment_method adicionada na tabela service_orders';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'service_orders'
          AND column_name = 'prepaid_transaction_id'
    ) THEN
        ALTER TABLE public.service_orders
            ADD COLUMN prepaid_transaction_id UUID NULL REFERENCES public.prepaid_wallet_transactions(id);
        RAISE NOTICE 'Coluna prepaid_transaction_id adicionada na tabela service_orders';
    END IF;
END $$;

-- Atualizar tabela payments com flag de pré-pago
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'payments'
          AND column_name = 'is_prepaid'
    ) THEN
        ALTER TABLE public.payments
            ADD COLUMN is_prepaid BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Coluna is_prepaid adicionada na tabela payments';
    END IF;
END $$;

-- Criar tabela de recargas de saldo pré-pago
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'prepaid_recharges'
    ) THEN
        CREATE TABLE public.prepaid_recharges (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES public.companies(id),
            amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
            asaas_payment_id TEXT NULL,
            asaas_customer_id TEXT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'expired')),
            payment_url TEXT NULL,
            qr_code TEXT NULL,
            pix_copy_paste TEXT NULL,
            transaction_id UUID NULL REFERENCES public.prepaid_wallet_transactions(id),
            notes TEXT NULL,
            created_by UUID NULL REFERENCES public.users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            paid_at TIMESTAMPTZ NULL,
            expires_at TIMESTAMPTZ NULL
        );
        CREATE INDEX idx_prepaid_recharges_company ON public.prepaid_recharges(company_id, created_at DESC);
        CREATE INDEX idx_prepaid_recharges_status ON public.prepaid_recharges(status, created_at DESC);
        CREATE INDEX idx_prepaid_recharges_asaas ON public.prepaid_recharges(asaas_payment_id);
        RAISE NOTICE 'Tabela prepaid_recharges criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela prepaid_recharges já existe';
    END IF;
END $$;
```

### Passo 3: Verificar a Migração

Execute este SQL para verificar se as tabelas foram criadas:

```sql
-- Verificar estruturas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('prepaid_wallet_transactions', 'prepaid_recharges');

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'service_orders'
  AND column_name IN ('payment_method', 'prepaid_transaction_id');

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payments'
  AND column_name = 'is_prepaid';
```

### Resultado Esperado

Você deve ver:
- ✅ Tabela `prepaid_wallet_transactions` criada
- ✅ Tabela `prepaid_recharges` criada
- ✅ Coluna `payment_method` em `service_orders`
- ✅ Coluna `prepaid_transaction_id` em `service_orders`
- ✅ Coluna `is_prepaid` em `payments`

### Passo 4: Testar o Sistema

Após executar a migração:

1. **Reinicie o servidor backend** (já feito automaticamente)
2. **Recarregue o frontend** no navegador
3. **Teste criar uma recarga** clicando em "Adicionar Saldo"
4. **Verifique se a cobrança é gerada** no Asaas

### Troubleshooting

Se ainda houver erros:

1. **Verifique os logs do servidor** para ver erros específicos
2. **Confirme que a migração foi executada** com sucesso
3. **Verifique as permissões** do usuário no Supabase
4. **Limpe o cache do navegador** e recarregue

### Estrutura das Tabelas

#### `prepaid_wallet_transactions`
Armazena todas as transações de crédito/débito do saldo pré-pago.

#### `prepaid_recharges`
Armazena as recargas criadas via cobrança Asaas, vinculando o pagamento à transação de crédito.

#### Colunas Adicionadas
- `service_orders.payment_method`: Indica se foi pago via saldo pré-pago ou Asaas
- `service_orders.prepaid_transaction_id`: Referência à transação de débito
- `payments.is_prepaid`: Flag para identificar pagamentos pré-pagos
