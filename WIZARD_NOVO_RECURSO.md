# 🧙‍♂️ Wizard de Criação de Recursos - Planejamento e Acompanhamento

## 📋 Visão Geral
Modernização completa do fluxo de criação de recursos, transformando o processo atual em um wizard intuitivo e guiado com 4 etapas principais.

**Branch**: `feature/wizard-novo-recurso`  
**Data de Início**: 19/11/2025  
**Status Geral**: 🟡 Em Desenvolvimento

---

## 🎯 Objetivos

### Problemas a Resolver
- ❌ Fluxo fragmentado em múltiplas páginas
- ❌ Falta de contexto sobre etapa atual
- ❌ Confusão no processo de pagamento
- ❌ Espera indefinida após pagamento
- ❌ Sem validação prévia de dados
- ❌ Pouco feedback visual

### Resultados Esperados
- ✅ Fluxo unificado em uma única página
- ✅ Indicador visual de progresso
- ✅ Processo de pagamento claro e intuitivo
- ✅ Auto-detecção de pagamento confirmado
- ✅ Validações em tempo real
- ✅ Feedback constante ao usuário

---

## 🏗️ Arquitetura do Wizard

### Estrutura de Passos
```
┌─────────────────────────────────────────────────────────┐
│  ① Cliente  →  ② Serviço  →  ③ Pagamento  →  ④ Recurso │
└─────────────────────────────────────────────────────────┘
```

### Estrutura de Arquivos
```
src/pages/NovoRecursoWizard/
├── index.tsx                      # Container principal do wizard
├── components/
│   ├── StepIndicator.tsx         # Barra de progresso visual
│   ├── Step1Cliente.tsx          # Etapa 1: Seleção de cliente
│   ├── Step2Servico.tsx          # Etapa 2: Escolha de serviço
│   ├── Step3Pagamento.tsx        # Etapa 3: Processamento de pagamento
│   ├── Step4Recurso.tsx          # Etapa 4: Preenchimento do recurso
│   ├── PaymentStatusModal.tsx    # Modal de aguardo de pagamento
│   └── WizardSummary.tsx         # Resumo lateral (desktop)
├── hooks/
│   ├── useWizardState.ts         # Gerenciamento de estado do wizard
│   ├── usePaymentPolling.ts      # Polling automático de pagamento
│   └── useAutoSave.ts            # Auto-save de rascunhos
└── types.ts                       # TypeScript interfaces
```

---

## 📝 Tasks e Progresso

### 🔵 FASE 1: Estrutura Base (MVP)
**Objetivo**: Criar estrutura do wizard e implementar navegação básica  
**Prazo Estimado**: 2-3 dias

#### Task 1.1: Setup Inicial ✅ CONCLUÍDA
- [x] Criar estrutura de pastas `src/pages/NovoRecursoWizard/`
- [x] Criar arquivo `types.ts` com interfaces TypeScript
- [x] Criar hook `useWizardState.ts` para gerenciar estado
- [x] Configurar rota `/recursos/novo-wizard` no App.tsx

**Arquivos Criados**:
- ✅ `src/pages/NovoRecursoWizard/index.tsx`
- ✅ `src/pages/NovoRecursoWizard/types.ts`
- ✅ `src/pages/NovoRecursoWizard/hooks/useWizardState.ts`

**Critérios de Aceitação**:
- ✅ Estrutura de pastas criada
- ✅ Rota acessível no navegador
- ✅ Estado inicial do wizard funcionando

**Commit**: `de3fd66` - feat: implementar estrutura base do wizard (Task 1.1)

---

#### Task 1.2: Componente StepIndicator ⏳ PENDENTE
- [ ] Criar componente `StepIndicator.tsx`
- [ ] Implementar design com círculos e linhas
- [ ] Adicionar animações de transição
- [ ] Tornar responsivo (mobile/desktop)

**Arquivos a Criar**:
- `src/pages/NovoRecursoWizard/components/StepIndicator.tsx`

**Design**:
```
Desktop:
●━━━━━━━━○━━━━━━━━○━━━━━━━━○
Cliente   Serviço  Pagamento  Recurso

Mobile:
● Cliente ✓
↓
○ Serviço
↓
○ Pagamento
↓
○ Recurso
```

**Critérios de Aceitação**:
- ✅ Indicador visual de etapa atual
- ✅ Etapas completadas marcadas com ✓
- ✅ Animação suave ao mudar de etapa
- ✅ Responsivo em todas as telas

---

#### Task 1.3: Etapa 1 - Seleção de Cliente ⏳ PENDENTE
- [ ] Criar componente `Step1Cliente.tsx`
- [ ] Implementar busca de clientes
- [ ] Criar cards de clientes com avatar
- [ ] Adicionar seção "Clientes Recentes"
- [ ] Implementar modal "Novo Cliente" (opcional)
- [ ] Validar seleção antes de avançar

**Arquivos a Criar**:
- `src/pages/NovoRecursoWizard/components/Step1Cliente.tsx`

**Funcionalidades**:
- 🔍 Busca em tempo real
- 📋 Lista de clientes da empresa
- ⭐ Sugestão de clientes recentes
- ➕ Cadastro rápido de novo cliente
- ✅ Validação: cliente obrigatório

**Critérios de Aceitação**:
- ✅ Busca funcionando corretamente
- ✅ Cards clicáveis e com feedback visual
- ✅ Validação impede avançar sem seleção
- ✅ Design moderno e intuitivo

---

#### Task 1.4: Etapa 2 - Escolha de Serviço ⏳ PENDENTE
- [ ] Criar componente `Step2Servico.tsx`
- [ ] Buscar tipos de serviço do banco
- [ ] Criar cards visuais para cada serviço
- [ ] Exibir preço e taxa de sucesso
- [ ] Adicionar tooltips explicativos
- [ ] Validar seleção antes de avançar

**Arquivos a Criar**:
- `src/pages/NovoRecursoWizard/components/Step2Servico.tsx`

**Dados a Exibir**:
- 📄 Nome do serviço
- 💰 Preço
- 📊 Taxa de sucesso (se disponível)
- ℹ️ Descrição detalhada
- ⏱️ Prazo estimado

**Critérios de Aceitação**:
- ✅ Serviços carregados do banco
- ✅ Cards com hover effects
- ✅ Informações claras e visíveis
- ✅ Validação impede avançar sem seleção

---

### 🟢 FASE 2: Pagamento
**Objetivo**: Implementar fluxo completo de pagamento  
**Prazo Estimado**: 2-3 dias

#### Task 2.1: Etapa 3 - Tela de Pagamento ⏳ PENDENTE
- [ ] Criar componente `Step3Pagamento.tsx`
- [ ] Exibir resumo do pedido (cliente + serviço + valor)
- [ ] Verificar saldo pré-pago disponível
- [ ] Criar cards para opções de pagamento
- [ ] Implementar lógica de pagamento pré-pago
- [ ] Implementar geração de cobrança Asaas

**Arquivos a Criar**:
- `src/pages/NovoRecursoWizard/components/Step3Pagamento.tsx`

**Fluxos**:
1. **Com Saldo Pré-Pago**:
   - Exibir saldo atual
   - Calcular novo saldo após desconto
   - Botão "Confirmar Pagamento"
   - Processar imediatamente

2. **Sem Saldo / Escolha Asaas**:
   - Opções: PIX ou Boleto
   - Gerar cobrança
   - Redirecionar para tela de aguardo

**Critérios de Aceitação**:
- ✅ Resumo claro do pedido
- ✅ Verificação de saldo funcionando
- ✅ Pagamento pré-pago processado corretamente
- ✅ Cobrança Asaas gerada com sucesso

---

#### Task 2.2: Modal de Status de Pagamento ⏳ PENDENTE
- [ ] Criar componente `PaymentStatusModal.tsx`
- [ ] Exibir QR Code PIX
- [ ] Adicionar botão "Copiar código PIX"
- [ ] Implementar indicador de status
- [ ] Adicionar botão "Verificar Pagamento"

**Arquivos a Criar**:
- `src/pages/NovoRecursoWizard/components/PaymentStatusModal.tsx`

**Elementos**:
- 📱 QR Code para PIX
- 📋 Código PIX copiável
- 🟡 Indicador de status (aguardando/pago/erro)
- 🔄 Botão de verificação manual
- ⏱️ Tempo decorrido

**Critérios de Aceitação**:
- ✅ QR Code gerado corretamente
- ✅ Código PIX copiável
- ✅ Status atualizado em tempo real
- ✅ UX clara e informativa

---

#### Task 2.3: Polling Automático de Pagamento ⏳ PENDENTE
- [ ] Criar hook `usePaymentPolling.ts`
- [ ] Implementar verificação a cada 5 segundos
- [ ] Atualizar status automaticamente
- [ ] Redirecionar ao confirmar pagamento
- [ ] Limpar interval ao desmontar

**Arquivos a Criar**:
- `src/pages/NovoRecursoWizard/hooks/usePaymentPolling.ts`

**Lógica**:
```typescript
// Verificar status a cada 5 segundos
setInterval(() => {
  checkPaymentStatus(cobrancaId)
  if (status === 'paid') {
    toast.success('Pagamento confirmado!')
    goToNextStep()
  }
}, 5000)
```

**Critérios de Aceitação**:
- ✅ Polling iniciado após gerar cobrança
- ✅ Verificação a cada 5 segundos
- ✅ Redirecionamento automático ao confirmar
- ✅ Cleanup correto ao sair da tela

---

### 🟣 FASE 3: Preenchimento do Recurso
**Objetivo**: Implementar etapa final de criação do recurso  
**Prazo Estimado**: 2-3 dias

#### Task 3.1: Etapa 4 - Formulário de Recurso ⏳ PENDENTE
- [ ] Criar componente `Step4Recurso.tsx`
- [ ] Implementar formulário com validações
- [ ] Adicionar campos obrigatórios
- [ ] Implementar validação em tempo real
- [ ] Adicionar mensagens de erro claras

**Arquivos a Criar**:
- `src/pages/NovoRecursoWizard/components/Step4Recurso.tsx`

**Campos**:
- 📄 Número do Auto de Infração
- 🚗 Placa do Veículo
- 📅 Data da Infração
- 📍 Local da Infração
- 💰 Valor da Multa
- 📝 Observações

**Critérios de Aceitação**:
- ✅ Todos os campos funcionando
- ✅ Validações em tempo real
- ✅ Mensagens de erro claras
- ✅ Máscaras de input (placa, data, valor)

---

#### Task 3.2: Upload de Documentos ⏳ PENDENTE
- [ ] Implementar área de drag & drop
- [ ] Adicionar preview de arquivos
- [ ] Validar tipo e tamanho de arquivo
- [ ] Implementar upload para Supabase Storage
- [ ] Adicionar barra de progresso

**Funcionalidades**:
- 📤 Drag & drop de arquivos
- 👁️ Preview de imagens/PDFs
- ✅ Validação: PDF, JPG, PNG (máx 10MB)
- 📊 Barra de progresso de upload
- 🗑️ Remover arquivos

**Critérios de Aceitação**:
- ✅ Drag & drop funcionando
- ✅ Preview de arquivos
- ✅ Upload para Supabase Storage
- ✅ Validações de tipo e tamanho

---

#### Task 3.3: Integração com IA (Opcional) ⏳ PENDENTE
- [ ] Adicionar botão "Preencher com IA"
- [ ] Integrar com endpoint de IA existente
- [ ] Processar documentos enviados
- [ ] Preencher campos automaticamente
- [ ] Permitir edição manual após IA

**Arquivos a Modificar**:
- `src/pages/NovoRecursoWizard/components/Step4Recurso.tsx`

**Fluxo**:
1. Usuário faz upload de documentos
2. Clica em "Preencher com IA"
3. Sistema processa documentos
4. Campos são preenchidos automaticamente
5. Usuário pode revisar e editar

**Critérios de Aceitação**:
- ✅ Botão visível e funcional
- ✅ Integração com IA funcionando
- ✅ Campos preenchidos corretamente
- ✅ Edição manual possível

---

#### Task 3.4: Auto-Save de Rascunhos ⏳ PENDENTE
- [ ] Criar hook `useAutoSave.ts`
- [ ] Salvar rascunho a cada 30 segundos
- [ ] Salvar ao mudar de etapa
- [ ] Recuperar rascunho ao voltar
- [ ] Exibir indicador "Salvo"

**Arquivos a Criar**:
- `src/pages/NovoRecursoWizard/hooks/useAutoSave.ts`

**Lógica**:
```typescript
// Auto-save a cada 30 segundos
setInterval(() => {
  if (hasChanges) {
    saveDraft(wizardState)
    toast.info('Rascunho salvo')
  }
}, 30000)
```

**Critérios de Aceitação**:
- ✅ Salvamento automático funcionando
- ✅ Recuperação de rascunho ao voltar
- ✅ Indicador visual de salvamento
- ✅ Não perder dados ao navegar

---

### 🎨 FASE 4: Polimento e UX
**Objetivo**: Melhorar experiência visual e usabilidade  
**Prazo Estimado**: 1-2 dias

#### Task 4.1: Animações e Transições ⏳ PENDENTE
- [ ] Adicionar transições entre etapas
- [ ] Implementar fade in/out
- [ ] Adicionar loading states
- [ ] Criar skeleton screens
- [ ] Adicionar micro-interações

**Melhorias**:
- 🎭 Transições suaves entre etapas
- ⏳ Loading states em ações assíncronas
- 💀 Skeleton screens ao carregar dados
- ✨ Hover effects em cards
- 🎉 Animação de sucesso ao completar

**Critérios de Aceitação**:
- ✅ Transições suaves e naturais
- ✅ Feedback visual em todas as ações
- ✅ Loading states implementados
- ✅ Experiência fluida

---

#### Task 4.2: Responsividade Completa ⏳ PENDENTE
- [ ] Testar em mobile (320px - 768px)
- [ ] Testar em tablet (768px - 1024px)
- [ ] Testar em desktop (1024px+)
- [ ] Ajustar layouts para cada breakpoint
- [ ] Testar touch interactions

**Breakpoints**:
- 📱 Mobile: 320px - 767px
- 📱 Tablet: 768px - 1023px
- 💻 Desktop: 1024px+

**Critérios de Aceitação**:
- ✅ Funcional em todos os tamanhos
- ✅ Layout adaptado para cada tela
- ✅ Touch-friendly em mobile
- ✅ Sem scroll horizontal

---

#### Task 4.3: Resumo Lateral (Desktop) ⏳ PENDENTE
- [ ] Criar componente `WizardSummary.tsx`
- [ ] Exibir resumo do pedido
- [ ] Atualizar em tempo real
- [ ] Mostrar apenas em desktop
- [ ] Adicionar animações

**Arquivos a Criar**:
- `src/pages/NovoRecursoWizard/components/WizardSummary.tsx`

**Conteúdo**:
- 👤 Cliente selecionado
- 📄 Serviço escolhido
- 💰 Valor total
- 📊 Status de cada etapa
- 🎯 Próxima ação

**Critérios de Aceitação**:
- ✅ Visível apenas em desktop (lg+)
- ✅ Atualizado em tempo real
- ✅ Design moderno e limpo
- ✅ Informações claras

---

#### Task 4.4: Testes e Ajustes Finais ⏳ PENDENTE
- [ ] Testar fluxo completo end-to-end
- [ ] Testar todos os cenários de pagamento
- [ ] Verificar validações
- [ ] Testar em diferentes navegadores
- [ ] Corrigir bugs encontrados

**Cenários a Testar**:
1. ✅ Fluxo com saldo pré-pago
2. ✅ Fluxo com PIX
3. ✅ Fluxo com Boleto
4. ✅ Voltar e avançar entre etapas
5. ✅ Recuperar rascunho
6. ✅ Upload de documentos
7. ✅ Preenchimento com IA
8. ✅ Validações de campos

**Critérios de Aceitação**:
- ✅ Todos os fluxos funcionando
- ✅ Sem bugs críticos
- ✅ Performance adequada
- ✅ UX validada

---

## 📊 Métricas de Sucesso

### KPIs para Medir Melhoria
- **Taxa de Conclusão**: % de usuários que completam o wizard
- **Tempo Médio**: Tempo para criar um recurso
- **Taxa de Abandono**: Em qual etapa usuários desistem
- **Erros**: Quantidade de erros/validações falhadas
- **Satisfação**: Feedback dos usuários

### Antes vs Depois
| Métrica | Antes | Meta Depois |
|---------|-------|-------------|
| Taxa de Conclusão | ? | > 90% |
| Tempo Médio | ? | < 5 min |
| Taxa de Abandono | ? | < 10% |
| Erros por Sessão | ? | < 1 |

---

## 🔄 Changelog

### [19/11/2025 - 11:40] - Task 1.1 Concluída ✅
- ✅ Estrutura de pastas criada
- ✅ Interfaces TypeScript definidas (types.ts)
- ✅ Hook useWizardState implementado
- ✅ Componente principal do wizard criado
- ✅ Rota /recursos/novo-wizard configurada
- ✅ Step indicator básico implementado
- ✅ Auto-save a cada 30 segundos
- ✅ Commit: `de3fd66`

### [19/11/2025 - 11:10] - Planejamento Inicial
- ✅ Documento de planejamento criado
- ✅ Branch `feature/wizard-novo-recurso` criada
- ✅ Estrutura de tasks definida
- ✅ Commit: `3392f1e`

---

## 📝 Notas e Observações

### Decisões Técnicas
- **Framework**: React com TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Hooks (useState, useEffect)
- **Validação**: Validação inline + validação ao submeter
- **Storage**: Supabase Storage para documentos
- **Polling**: Verificação a cada 5 segundos

### Dependências
- Nenhuma nova dependência necessária
- Usar bibliotecas já existentes no projeto

### Riscos e Mitigações
| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Polling sobrecarregar servidor | Médio | Limitar a 5s, timeout após 10min |
| Upload de arquivos grandes | Baixo | Validar tamanho máximo (10MB) |
| Perda de dados ao navegar | Alto | Implementar auto-save robusto |
| Compatibilidade mobile | Médio | Testar em dispositivos reais |

---

## 🎯 Próximos Passos Imediatos

1. **Validar planejamento** com o time
2. **Iniciar Task 1.1**: Setup inicial da estrutura
3. **Criar interfaces TypeScript** para o wizard
4. **Implementar hook de estado** básico

---

## 📞 Contatos e Referências

- **Documentação Supabase**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Hook Form** (se necessário): https://react-hook-form.com/

---

**Última Atualização**: 19/11/2025  
**Responsável**: Diego Filippin  
**Status**: 🟡 Em Planejamento
