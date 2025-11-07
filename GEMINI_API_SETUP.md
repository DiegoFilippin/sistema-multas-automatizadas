# 🔑 Configuração da API do Gemini

## ⚠️ Problema Atual

O OCR automático está falhando com o erro:
```
API key not valid. Please pass a valid API key.
```

Isso acontece porque a variável de ambiente `VITE_GEMINI_API_KEY` não está configurada ou está inválida.

## ✅ Solução Implementada

### 1. **Fallback Manual**
Quando o OCR falhar, o sistema agora:
- ✅ Exibe mensagem clara sobre o erro
- ✅ Permite preenchimento manual dos dados
- ✅ Avança automaticamente para a tela de edição
- ✅ Mostra toast informativo: "💡 Preencha os dados do auto de infração manualmente"

### 2. **Tratamento de Erros Melhorado**
- Detecta erro de API key inválida
- Não tenta reprocessar quando a API key está errada
- Fornece mensagens claras para cada tipo de erro

## 🔧 Como Configurar a API do Gemini

### Passo 1: Obter API Key

1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a chave gerada

### Passo 2: Configurar Localmente

Adicione no arquivo `.env` na raiz do projeto:

```env
VITE_GEMINI_API_KEY=sua-api-key-aqui
```

### Passo 3: Configurar no Vercel

1. Acesse o painel do Vercel
2. Vá em **Settings > Environment Variables**
3. Adicione:
   - **Name**: `VITE_GEMINI_API_KEY`
   - **Value**: Sua API key do Gemini
   - **Environment**: Production, Preview, Development

4. Faça um novo deploy:
   ```bash
   vercel --prod
   ```

## 🧪 Testar Configuração

### Localmente:

1. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev:full
   ```

2. Tente fazer upload de um auto de infração

3. Verifique os logs do console:
   - ✅ Se configurado: "✅ Dados extraídos do documento"
   - ❌ Se não configurado: "⚠️ OCR não configurado. Preencha os dados manualmente."

### No Vercel:

1. Acesse a aplicação em produção
2. Tente fazer upload de um documento
3. Verifique se o OCR funciona ou se o fallback manual é ativado

## 📋 Comportamento Esperado

### Com API Key Configurada:
1. Upload do documento
2. Processamento automático via OCR
3. Dados preenchidos automaticamente
4. Usuário pode revisar e editar

### Sem API Key (Fallback):
1. Upload do documento
2. Erro detectado
3. Toast: "⚠️ OCR não configurado. Preencha os dados manualmente."
4. Formulário vazio é exibido
5. Usuário preenche manualmente
6. Processo continua normalmente

## 🔍 Verificar se está Configurado

Execute no console do navegador:

```javascript
console.log('Gemini API Key:', import.meta.env.VITE_GEMINI_API_KEY ? 'Configurada' : 'Não configurada');
```

## 💡 Notas Importantes

1. **Prefixo VITE_**: Variáveis de ambiente no Vite devem começar com `VITE_` para serem expostas ao cliente
2. **Reiniciar servidor**: Após adicionar a variável, reinicie o servidor de desenvolvimento
3. **Redeploy no Vercel**: Após adicionar no Vercel, faça um novo deploy
4. **Segurança**: A API key é exposta no cliente, use uma key com limites apropriados
5. **Quota**: Verifique os limites de uso da API do Gemini

## 🆘 Troubleshooting

### Erro persiste após configurar:

1. Verifique se a variável está com o nome correto: `VITE_GEMINI_API_KEY`
2. Verifique se não há espaços extras na chave
3. Reinicie o servidor de desenvolvimento
4. Limpe o cache do navegador (Ctrl+Shift+Delete)
5. Verifique se a API key é válida no Google AI Studio

### API key válida mas erro 400:

1. Verifique se a API key tem permissões para o modelo `gemini-2.0-flash-exp`
2. Verifique se há quota disponível
3. Tente gerar uma nova API key

### Fallback manual não funciona:

1. Verifique os logs do console
2. Certifique-se de que está na versão mais recente do código
3. Limpe o localStorage: `localStorage.clear()`

---

**Última atualização**: 07/11/2025
