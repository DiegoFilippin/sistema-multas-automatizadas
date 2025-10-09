# 🛠️ GUIA DE CONFIGURAÇÃO - CPF AUTOFILL NO VERCEL

## 📋 Problema
O autopreenchimento de CPF está falhando no Vercel porque as variáveis de ambiente não estão configuradas corretamente.

## 🔍 Diagnóstico
Execute este comando para verificar o status atual:
```bash
curl https://sua-aplicacao.vercel.app/api/debug-cpf-status
```

## ⚙️ Variáveis de Ambiente Necessárias

### 1. DataWash API (Consulta Direta)
Configure estas variáveis para a consulta direta via DataWash:

```env
DATAWASH_USERNAME="felipe@nexmedia.com.br"
DATAWASH_PASSWORD="neoshare2015"
DATAWASH_CLIENTE="Neoshare"
DATAWASH_BASE_URL="http://webservice.datawash.com.br/localizacao.asmx/ConsultaCPFCompleta"
```

### 2. Webhook n8n (Método Alternativo)
Configure estas variáveis para usar o webhook n8n:

```env
N8N_DATAWASH_WEBHOOK_URL="https://webhookn8n.synsoft.com.br/webhook/dataws3130178c-4c85-4899-854d-17eafaffff05"
# OU (fallback)
N8N_WEBHOOK_CPF_URL="https://webhookn8n.synsoft.com.br/webhook/dataws3130178c-4c85-4899-854d-17eafaffff05"
```

## 📝 Passo a Passo para Configurar no Vercel

### Passo 1: Acessar o Painel do Vercel
1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto "sistema-multas-automatizadas"
3. Clique em "Settings" (Configurações)
4. Vá para "Environment Variables"

### Passo 2: Adicionar as Variáveis
Adicione cada variável uma por vez:

**Para DataWash API:**
- Name: `DATAWASH_USERNAME`
- Value: `felipe@nexmedia.com.br`
- Environment: `Production` ✓

- Name: `DATAWASH_PASSWORD`
- Value: `neoshare2015`
- Environment: `Production` ✓

- Name: `DATAWASH_CLIENTE`
- Value: `Neoshare`
- Environment: `Production` ✓

- Name: `DATAWASH_BASE_URL`
- Value: `http://webservice.datawash.com.br/localizacao.asmx/ConsultaCPFCompleta`
- Environment: `Production` ✓

**Para Webhook n8n (recomendado):**
- Name: `N8N_DATAWASH_WEBHOOK_URL`
- Value: `https://webhookn8n.synsoft.com.br/webhook/dataws3130178c-4c85-4899-854d-17eafaffff05`
- Environment: `Production` ✓

### Passo 3: Redeploy
Após configurar todas as variáveis:
1. Vá para "Deployments"
2. Clique em "Redeploy" (ou "Promote to Production")
3. Aguarde o deploy ser concluído

## 🧪 Testando Após a Configuração

### Teste 1: Verificar Status
```bash
curl https://sua-aplicacao.vercel.app/api/debug-cpf-status
```

### Teste 2: Testar API DataWash Direta
```bash
curl "https://sua-aplicacao.vercel.app/api/datawash/11144477735"
```

### Teste 3: Testar Webhook n8n
```bash
curl -X POST "https://sua-aplicacao.vercel.app/api/datawash/webhook-cpf" \
  -H "Content-Type: application/json" \
  -d '{"cpf":"11144477735"}'
```

### Teste 4: Testar no Frontend
1. Acesse: https://sua-aplicacao.vercel.app
2. Vá para a página de Clientes
3. Crie um novo cliente
4. Digite um CPF completo (11 dígitos)
5. Os dados devem ser preenchidos automaticamente

## 🔧 Solução de Problemas

### Se ainda não funcionar:

1. **Verifique os logs do Vercel:**
   - Vá para "Deployments"
   - Clique na build mais recente
   - Verifique os logs de runtime

2. **Teste localmente:**
   ```bash
   node test-cpf-autofill.js
   ```

3. **Verifique se as variáveis estão carregadas:**
   ```bash
   curl https://sua-aplicacao.vercel.app/api/debug-env
   ```

4. **Erro de CORS:**
   - Certifique-se de que as URLs estão corretas
   - Verifique se o endpoint está retornando dados válidos

## 📊 Status Esperado Após Configuração

```json
{
  "timestamp": "2025-01-01T00:00:00.000Z",
  "environment": "production",
  "variables": {
    "datawash": {
      "username": true,
      "password": true,
      "cliente": true,
      "baseUrl": true
    },
    "n8n": {
      "webhookUrl": true
    }
  },
  "endpoints": {
    "datawashDirect": {
      "status": "working",
      "message": "API DataWash direta está funcionando"
    },
    "webhook": {
      "status": "working", 
      "message": "Webhook n8n está funcionando"
    }
  },
  "recommendations": ["Todas as configurações estão corretas! O CPF autofill deve funcionar."]
}
```

## 🎯 Resultado Final
Após a configuração correta:
- ✅ CPF autofill funcionará no formulário de clientes
- ✅ Dados serão preenchidos automaticamente ao digitar o CPF
- ✅ Sistema terá fallback entre DataWash direto e webhook n8n
- ✅ Funcionará tanto em desenvolvimento quanto em produção

## 📞 Suporte
Se ainda tiver problemas após seguir este guia:
1. Execute o diagnóstico: `node test-cpf-autofill.js`
2. Verifique os logs do Vercel
3. Teste os endpoints manualmente com os comandos curl fornecidos
4. Confirme que todas as variáveis estão configuradas corretamente