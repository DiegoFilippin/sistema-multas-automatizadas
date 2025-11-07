# 🚀 Configuração do Vercel

Este guia explica como configurar o projeto no Vercel para rodar corretamente.

## 📋 Pré-requisitos

- Conta no Vercel
- Repositório Git conectado ao Vercel
- Variáveis de ambiente configuradas

## 🔧 Configuração

### 1. **Variáveis de Ambiente**

No painel do Vercel, vá em **Settings > Environment Variables** e adicione:

#### Supabase
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
```

#### JWT
```
JWT_SECRET=seu-jwt-secret-aqui
```

#### Asaas
```
ASAAS_API_KEY=sua-api-key-asaas
ASAAS_ENVIRONMENT=production
```

#### Gemini (OCR)
```
GEMINI_API_KEY=sua-gemini-api-key
```

#### OpenAI (opcional)
```
OPENAI_API_KEY=sua-openai-api-key
```

#### DataWash
```
DATAWASH_API_KEY=sua-datawash-api-key
```

### 2. **Build Settings**

No Vercel, configure:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. **Node.js Version**

Certifique-se de que o Node.js está na versão 18 ou superior:

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 4. **Arquivos de Configuração**

#### `vercel.json` (já configurado)
- ✅ Rotas de API configuradas
- ✅ Headers CORS configurados
- ✅ Webhooks N8N configurados
- ✅ Redirecionamento SPA configurado

### 5. **Serverless Functions**

O Vercel automaticamente converte as rotas em `/api` para Serverless Functions.

**Importante**: O servidor Express (`src/server.ts`) roda como uma Serverless Function no Vercel.

### 6. **Deploy**

1. **Conecte o repositório** ao Vercel
2. **Configure as variáveis de ambiente**
3. **Faça o deploy**

```bash
# Via CLI (opcional)
npm i -g vercel
vercel --prod
```

## 🔍 Verificação Pós-Deploy

Após o deploy, verifique:

1. ✅ **Frontend carrega**: `https://seu-projeto.vercel.app`
2. ✅ **API responde**: `https://seu-projeto.vercel.app/api/health`
3. ✅ **Webhook N8N funciona**: Teste criando um cliente
4. ✅ **Autenticação funciona**: Faça login no sistema

## 🐛 Troubleshooting

### Erro: "Failed to load resource: 500"

**Causa**: Variáveis de ambiente não configuradas ou incorretas.

**Solução**: 
1. Verifique todas as variáveis de ambiente no Vercel
2. Faça um novo deploy após adicionar/corrigir variáveis

### Erro: "CORS policy"

**Causa**: Headers CORS não configurados corretamente.

**Solução**: 
1. Verifique o `vercel.json`
2. Certifique-se de que os headers estão corretos

### Erro: "Webhook N8N falhou"

**Causa**: Timeout ou erro no webhook N8N.

**Solução**:
1. Verifique se o webhook N8N está ativo
2. Teste o webhook diretamente com curl
3. Verifique os logs no Vercel

### Erro: "Backend não responde"

**Causa**: Serverless function não inicializou corretamente.

**Solução**:
1. Verifique os logs no Vercel Dashboard
2. Certifique-se de que `src/server.ts` está exportando corretamente
3. Verifique se todas as dependências estão instaladas

## 📊 Monitoramento

- **Logs**: Vercel Dashboard > Deployments > Logs
- **Analytics**: Vercel Dashboard > Analytics
- **Performance**: Vercel Dashboard > Speed Insights

## 🔗 Links Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Build Configuration](https://vercel.com/docs/build-step)

## ⚠️ Notas Importantes

1. **Timeout**: Serverless functions no Vercel têm timeout de 10s (plano gratuito) ou 60s (plano Pro)
2. **Cold Start**: A primeira requisição pode ser mais lenta devido ao cold start
3. **Logs**: Use `console.log` para debug, os logs aparecem no Vercel Dashboard
4. **Webhooks**: Certifique-se de que os webhooks N8N estão acessíveis publicamente

## ✅ Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] `vercel.json` atualizado
- [ ] Build local funciona (`npm run build`)
- [ ] Servidor local funciona (`npm run server`)
- [ ] Testes de integração passam
- [ ] Deploy no Vercel
- [ ] Verificação pós-deploy
- [ ] Teste de criação de cliente
- [ ] Teste de webhook N8N
- [ ] Teste de autenticação

---

**Última atualização**: 07/11/2025
