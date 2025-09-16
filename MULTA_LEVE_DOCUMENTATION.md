# Funcionalidade de Multa Leve - Documentação

## Visão Geral

Esta funcionalidade implementa a análise automática de multas leves e a sugestão de advertência por escrito para condutores sem histórico de infrações nos últimos 12 meses, conforme previsto no Código de Trânsito Brasileiro.

## Funcionalidades Implementadas

### 1. Análise Automática de Multas
- **Classificação por Gravidade**: Determina automaticamente se uma multa é leve, média, grave ou gravíssima baseado no código da infração
- **Verificação de Histórico**: Consulta o banco de dados para verificar se o condutor possui multas nos últimos 12 meses
- **Sugestão de Advertência**: Para multas leves de condutores sem histórico, sugere advertência por escrito

### 2. Banco de Dados
- **Novos Campos na Tabela `multas`**:
  - `tipo_gravidade`: Tipo da multa (leve, media, grave, gravissima)
  - `condutor_tem_historico_12m`: Indica se o condutor possui histórico nos últimos 12 meses
  - `sugerida_advertencia_escrita`: Flag indicando se foi sugerida advertência
  - `data_verificacao_historico`: Data da verificação do histórico
  - `observacoes_advertencia`: Observações sobre a advertência

- **Nova Tabela `modelos_advertencia`**:
  - Armazena modelos de advertência por escrito
  - Permite personalização por tipo de infração
  - Suporte a placeholders para dados dinâmicos

### 3. Interface de Usuário
- **Componente AdvertenciaEscrita**: Interface para visualizar, editar e baixar advertências
- **Integração no TesteRecursoIA**: Exibe automaticamente quando uma advertência é sugerida
- **Notificações**: Toast messages informando sobre o resultado da análise

## Como Usar

### 1. Processamento Automático

Quando uma multa é processada no sistema (via upload de documento), a análise é executada automaticamente:

```typescript
// No TesteRecursoIA.tsx, após salvar a multa
const resultadoAnalise = await multaLeveService.analisarMultaLeve(
  codigoInfracao,
  cpfCondutor,
  dataInfracao
);

if (resultadoAnalise.advertencia.sugerirAdvertencia) {
  // Exibe componente de advertência
  setShowAdvertencia(true);
}
```

### 2. Uso Programático

#### Verificar Histórico do Condutor
```typescript
import { multaLeveService } from '../services/multaLeveService';

const historico = await multaLeveService.verificarHistoricoCondutor(
  '12345678901', // CPF do condutor
  new Date()     // Data de referência (opcional)
);

console.log('Tem histórico:', historico.temHistorico);
console.log('Quantidade de multas:', historico.quantidadeMultas);
```

#### Determinar Tipo de Gravidade
```typescript
const tipoGravidade = multaLeveService.determinarTipoGravidade('50110');
console.log('Tipo:', tipoGravidade); // 'leve'
```

#### Análise Completa
```typescript
const analise = await multaLeveService.analisarMultaLeve(
  '50110',        // Código da infração
  '12345678901',  // CPF do condutor
  new Date()      // Data de referência
);

console.log('É multa leve:', analise.isMultaLeve);
console.log('Sugerir advertência:', analise.advertencia.sugerirAdvertencia);
```

### 3. Criação de Multa com Análise Integrada

```typescript
import { multasService } from '../services/multasService';

const resultado = await multasService.createMultaWithAnalysis(
  multaData,      // Dados da multa
  cpfCondutor,    // CPF do condutor
  dataReferencia  // Data de referência (opcional)
);

const { multa, analise } = resultado;

if (analise?.advertencia.sugerirAdvertencia) {
  console.log('Advertência sugerida para multa:', multa.id);
}
```

## Estrutura dos Arquivos

### Serviços
- `src/services/multaLeveService.ts`: Lógica principal da funcionalidade
- `src/services/multasService.ts`: Integração com criação de multas

### Componentes
- `src/components/AdvertenciaEscrita.tsx`: Interface para advertências

### Banco de Dados
- `supabase/migrations/20250125_add_multa_leve_fields.sql`: Migração com novos campos

### Testes
- `test_multa_leve_functionality.js`: Testes da funcionalidade

## Configuração

### 1. Aplicar Migração
```bash
# A migração já foi aplicada automaticamente
# Caso precise reaplicar:
supabase db reset
```

### 2. Verificar Permissões
```sql
-- Verificar se as permissões estão corretas
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name IN ('multas', 'modelos_advertencia')
AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee;
```

### 3. Personalizar Códigos de Infração

Para adicionar novos códigos de infração, edite o método `determinarTipoGravidade` em `multaLeveService.ts`:

```typescript
// Adicionar novos códigos às listas
const infracoesLeves = [
  '50110', '50120', '50130', // Existentes
  '50140', '50150'           // Novos códigos
];
```

## Modelos de Advertência

### Placeholders Disponíveis
- `{NOME_CONDUTOR}`: Nome do condutor
- `{CPF_CONDUTOR}`: CPF do condutor
- `{DATA_INFRACAO}`: Data da infração
- `{LOCAL_INFRACAO}`: Local da infração
- `{PLACA_VEICULO}`: Placa do veículo
- `{DESCRICAO_INFRACAO}`: Descrição da infração
- `{CODIGO_INFRACAO}`: Código da infração
- `{NUMERO_AUTO}`: Número do auto de infração
- `{ORGAO_AUTUADOR}`: Órgão autuador
- `{CIDADE}`: Cidade (configurável)
- `{DATA_ADVERTENCIA}`: Data atual

### Criar Novo Modelo
```sql
INSERT INTO modelos_advertencia (
  nome, 
  titulo, 
  conteudo, 
  tipo_infracao, 
  ativo
) VALUES (
  'Advertência Personalizada',
  'ADVERTÊNCIA POR ESCRITO - PERSONALIZADA',
  'Seu conteúdo aqui com {PLACEHOLDERS}...',
  'leve',
  true
);
```

## Logs e Monitoramento

A funcionalidade gera logs detalhados para monitoramento:

```
🔍 === INICIANDO ANÁLISE DE MULTA LEVE ===
📋 Parâmetros: { codigoInfracao: '50110', cpfCondutor: '12345678901' }
📊 Tipo de gravidade determinado: leve
📈 Tem histórico 12m: false
📝 Sugerir advertência: true
✅ === ANÁLISE CONCLUÍDA ===
```

## Testes

Executar os testes da funcionalidade:

```bash
# Executar teste completo
node test_multa_leve_functionality.js
```

Os testes cobrem:
- Verificação de histórico do condutor
- Determinação do tipo de gravidade
- Análise completa de multa leve
- Criação de multa com análise integrada
- Modelos de advertência
- Permissões do banco de dados

## Troubleshooting

### Problema: "permission denied for table multas"
**Solução**: Verificar e conceder permissões:
```sql
GRANT SELECT, INSERT, UPDATE ON multas TO authenticated;
GRANT SELECT ON multas TO anon;
```

### Problema: "Modelo de advertência não encontrado"
**Solução**: Verificar se existe modelo ativo:
```sql
SELECT * FROM modelos_advertencia WHERE ativo = true AND tipo_infracao = 'leve';
```

### Problema: "CPF do condutor não disponível"
**Solução**: Garantir que o CPF seja extraído corretamente do documento ou fornecido nos dados do cliente.

## Próximos Passos

1. **Expansão de Códigos**: Adicionar mais códigos de infração ao mapeamento
2. **Relatórios**: Implementar relatórios de advertências emitidas
3. **Integração com Órgãos**: Conectar com sistemas de órgãos de trânsito
4. **Assinatura Digital**: Implementar assinatura digital nas advertências
5. **Notificações**: Sistema de notificações para condutores

## Suporte

Para dúvidas ou problemas:
1. Verificar os logs do console
2. Executar os testes para validar a funcionalidade
3. Consultar esta documentação
4. Verificar permissões do banco de dados