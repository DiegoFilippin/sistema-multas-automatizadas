# Configuração MCP no Trae.ia - MultasTrae

Este guia explica como configurar o Model Context Protocol (MCP) no Trae.ia para conectar com o projeto Supabase MultasTrae.

## O que é MCP?

O Model Context Protocol (MCP) é um protocolo aberto que padroniza como aplicações fornecem contexto para LLMs. <mcreference link="https://modelcontextprotocol.io/introduction" index="1">1</mcreference> Funciona como um "USB-C para aplicações de IA", permitindo que modelos de IA se conectem a diferentes fontes de dados e ferramentas. <mcreference link="https://modelcontextprotocol.io/introduction" index="1">1</mcreference>

## Configuração no Trae.ia

### Pré-requisitos

1. **Node.js**: Versão 18 ou superior instalada
2. **Trae.ia**: Versão 1.3.0 ou superior (que suporta MCP) <mcreference link="https://traeide.com/news/6" index="2">2</mcreference>
3. **Token de Acesso Pessoal do Supabase**: Necessário para autenticação

### Passo 1: Criar Personal Access Token no Supabase

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para **Settings** → **Access Tokens**
3. Clique em **Generate new token**
4. Dê um nome descritivo como "Trae.ia MCP Server"
5. **Copie o token** (você não poderá vê-lo novamente)

### Passo 2: Configurar o arquivo MCP

O arquivo `.trae/mcp.json` já foi criado com a configuração base. <mcreference link="https://docs.trae.ai/ide/model-context-protocol" index="3">3</mcreference> Você precisa apenas substituir os placeholders:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server",
        "--project-ref",
        "ktgynzdzvfcpvbdbtplu",
        "--access-token",
        "SUPABASE_ACCESS_TOKEN"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "SEU_TOKEN_AQUI"
      }
    },
    "postgrest": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres"
      ],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://postgres:[YOUR-PASSWORD]@db.ktgynzdzvfcpvbdbtplu.supabase.co:5432/postgres"
      }
    }
  }
}
```

### Passo 3: Editar a configuração

1. Abra o arquivo `.trae/mcp.json`
2. Substitua `SUPABASE_ACCESS_TOKEN` pelo token criado no Passo 1
3. Substitua `[YOUR-PASSWORD]` pela senha do banco de dados Postgres do Supabase
4. Salve o arquivo

### Estrutura de Configuração do Trae

O Trae.ia utiliza a seguinte estrutura para configuração do MCP:

```json
{
  "mcpServers": {
    "nome-do-servidor": {
      "command": "npx",
      "args": [
        "-y",
        "nome-do-pacote-mcp"
      ],
      "env": {
        "VARIAVEL_AMBIENTE": "valor"
      }
    }
  }
}
```

**Onde:**
- `mcpServers`: Objeto contendo todos os servidores MCP
- `command`: Comando para executar o servidor (geralmente "npx")
- `args`: Argumentos do comando, incluindo o pacote MCP
- `env`: Variáveis de ambiente necessárias para o servidor

### Passo 4: Ativar no Trae.ia

1. No Trae.ia, clique no ícone de **Configurações** (⚙️) no canto superior direito do chat
2. Selecione **MCP** no menu <mcreference link="https://docs.trae.ai/ide/model-context-protocol" index="3">3</mcreference>
3. Você deve ver o servidor "supabase" listado
4. Verifique se há um indicador verde mostrando que está ativo

## Funcionalidades Disponíveis

Com o MCP configurado, você poderá: <mcreference link="https://supabase.com/blog/mcp-server" index="3">3</mcreference>

- 🗃️ **Gerenciar tabelas** e acompanhar usando migrações
- 📊 **Buscar dados** e executar relatórios usando consultas SQL
- 🌿 **Criar branches** do banco de dados para desenvolvimento
- ⚙️ **Buscar configuração** do projeto
- 🚀 **Criar novos projetos** Supabase
- ⏸️ **Pausar e restaurar** projetos
- 📋 **Recuperar logs** para debug
- 🔧 **Gerar tipos TypeScript** baseados no esquema do banco

## Configuração de Segurança

### Modo Somente Leitura
A configuração atual usa `--read-only` que restringe o servidor a consultas somente leitura. <mcreference link="https://github.com/supabase-community/supabase-mcp" index="2">2</mcreference> Isso previne operações de escrita não intencionais no banco de dados.

### Escopo do Projeto
O parâmetro `--project-ref=ktgynzdzvfcpvbdbtplu` limita o acesso apenas ao projeto MultasTrae. <mcreference link="https://github.com/supabase-community/supabase-mcp" index="2">2</mcreference>

## Informações do Projeto MultasTrae

- **Project Ref**: `ktgynzdzvfcpvbdbtplu`
- **URL**: `https://ktgynzdzvfcpvbdbtplu.supabase.co`
- **Região**: Detectada automaticamente pelo MCP

## Solução de Problemas

### Servidor não aparece como ativo
1. Verifique se o Node.js está instalado: `node -v`
2. Verifique se o token está correto no arquivo `mcp.json`
3. Reinicie o Trae.ia

### Erro de "Tenant or user not found"
Este erro geralmente indica problema com a região. O MCP detecta automaticamente, mas se persistir, verifique a região do projeto no dashboard do Supabase.

### Comando não encontrado no Windows
No Windows, você pode precisar prefixar o comando com `cmd /c`: <mcreference link="https://github.com/supabase-community/supabase-mcp" index="2">2</mcreference>

```json
{
  "command": "cmd",
  "args": [
    "/c",
    "npx",
    "-y",
    "@supabase/mcp-server-supabase@latest",
    "--read-only",
    "--project-ref=ktgynzdzvfcpvbdbtplu"
  ]
}
```

## Próximos Passos

Após a configuração, você pode:

1. **Testar a conexão**: Pergunte ao assistente sobre as tabelas do projeto
2. **Explorar dados**: Solicite consultas específicas sobre multas, empresas, etc.
3. **Gerar relatórios**: Use linguagem natural para criar consultas complexas
4. **Gerenciar esquema**: Solicite modificações na estrutura do banco

## Recursos Adicionais

- [Documentação oficial MCP](https://modelcontextprotocol.io/)
- [Supabase MCP Server](https://github.com/supabase-community/supabase-mcp)
- [Trae.ia MCP Documentation](https://docs.trae.ai/ide/model-context-protocol)

---

**Nota**: Mantenha seu Personal Access Token seguro e nunca o compartilhe publicamente. Se comprometido, revogue-o imediatamente no dashboard do Supabase.