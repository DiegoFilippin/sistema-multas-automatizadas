# 🚀 Deploy no Render - Sistema de Multas

## ✅ Serviços Criados

### 1. Backend API (Node.js)
- **Nome**: sistema-multas-api
- **URL**: https://sistema-multas-api.onrender.com
- **Dashboard**: https://dashboard.render.com/web/srv-d4cehvi4d50c73d5atpg
- **Tipo**: Web Service
- **Região**: Ohio
- **Plano**: Starter

### 2. Frontend (Static Site)
- **Nome**: sistema-multas-frontend
- **URL**: https://sistema-multas-frontend.onrender.com
- **Dashboard**: https://dashboard.render.com/static/srv-d4cem475r7bs73ackc50
- **Tipo**: Static Site
- **Plano**: Free

---

## 🔧 Configuração Necessária

### Backend - Variáveis de Ambiente Obrigatórias

Acesse: https://dashboard.render.com/web/srv-d4cehvi4d50c73d5atpg

Adicione as seguintes variáveis em **Environment**:

```bash
# ===== SUPABASE (Obrigatório) =====
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
SUPABASE_ANON_KEY=sua_anon_key
VITE_SUPABASE_URL=mesma_url_supabase
VITE_SUPABASE_ANON_KEY=mesma_anon_key

# ===== ASAAS (Obrigatório) =====
ASAAS_API_KEY=sua_chave_asaas
ASAAS_ENVIRONMENT=production

# ===== JWT (Obrigatório) =====
# Gere um segredo aleatório: openssl rand -base64 32
JWT_SECRET=seu_jwt_secret_aqui

# ===== DATAWASH (Opcional) =====
DATAWASH_USERNAME=seu_usuario
DATAWASH_PASSWORD=sua_senha
DATAWASH_BASE_URL=http://webservice.datawash.com.br/localizacao.asmx/ConsultaCPFCompleta

# ===== N8N =====
N8N_DATAWASH_WEBHOOK_URL=https://webhookn8n.synsoft.com.br/webhook/dataws3130178c-4c85-4899-854d-17eafaffff05

# ===== CONFIGURAÇÕES =====
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://sistema-multas-frontend.onrender.com
ENABLE_N8N_PROXY_AUTH=false
```

### Frontend - Variáveis de Ambiente

Acesse: https://dashboard.render.com/static/srv-d4cem475r7bs73ackc50

Atualize as variáveis em **Environment**:

```bash
# ===== SUPABASE =====
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_anon_key

# ===== API =====
VITE_API_BASE_URL=https://sistema-multas-api.onrender.com

# ===== GEMINI (Opcional) =====
VITE_GEMINI_API_KEY=sua_chave_gemini

# ===== OPENAI (Opcional) =====
VITE_OPENAI_API_KEY=sua_chave_openai
VITE_OPENAI_ASSISTANT_ID=seu_assistant_id
```

---

## 📝 Passos para Completar o Deploy

### 1. Configurar Backend
1. Acesse o dashboard do backend
2. Vá em **Environment**
3. Adicione todas as variáveis listadas acima
4. Clique em **Save Changes**
5. O Render fará redeploy automático

### 2. Configurar Frontend
1. Acesse o dashboard do frontend
2. Vá em **Environment**
3. Atualize as variáveis com os valores corretos
4. Clique em **Save Changes**
5. O Render fará redeploy automático

### 3. Aguardar Deploy
- Backend: ~5-10 minutos
- Frontend: ~3-5 minutos

### 4. Testar
1. Acesse: https://sistema-multas-frontend.onrender.com
2. Faça login
3. Teste criar uma cobrança

---

## 🔍 Monitoramento

### Logs do Backend
```bash
# Via dashboard
https://dashboard.render.com/web/srv-d4cehvi4d50c73d5atpg/logs

# Via CLI (opcional)
render logs -s srv-d4cehvi4d50c73d5atpg
```

### Health Check
```bash
# Backend
curl https://sistema-multas-api.onrender.com/api/health

# Deve retornar:
# {"status":"OK","timestamp":"..."}
```

---

## 🎯 Vantagens do Render

✅ **Sem Cold Starts** - Servidor sempre ativo (plano Starter)  
✅ **Logs Centralizados** - Fácil debug  
✅ **Deploy Automático** - Push no GitHub = deploy automático  
✅ **HTTPS Gratuito** - SSL incluído  
✅ **Variáveis de Ambiente** - Gerenciamento fácil  
✅ **Rollback Simples** - Voltar para deploy anterior com 1 clique  
✅ **Monitoramento** - Métricas de CPU, memória e requests  

---

## 🔄 Deploy Manual (se necessário)

Se precisar fazer deploy manual:

```bash
# 1. Commit suas mudanças
git add .
git commit -m "sua mensagem"
git push origin main

# 2. O Render detecta automaticamente e faz deploy
```

---

## 🌐 Domínio Customizado (Opcional)

Para usar seu próprio domínio:

1. Acesse o dashboard do serviço
2. Vá em **Settings** > **Custom Domain**
3. Adicione seu domínio
4. Configure os DNS conforme instruções do Render

---

## ⚠️ Importante

- **Primeiro Deploy**: Pode demorar mais (instalação de dependências)
- **Free Tier**: Frontend é gratuito, backend precisa do plano Starter ($7/mês)
- **Sleep Mode**: Plano Free dorme após 15min de inatividade
- **Plano Starter**: Servidor sempre ativo, sem sleep

---

## 📞 Suporte

- Documentação: https://render.com/docs
- Status: https://status.render.com
- Dashboard: https://dashboard.render.com
