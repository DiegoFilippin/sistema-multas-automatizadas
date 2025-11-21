-- Migration: Adicionar campos para sistema de rascunhos no wizard
-- Permite salvar progresso do wizard e retomar de onde parou

-- 1. Adicionar novos campos para controle do wizard
ALTER TABLE service_orders
ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 3),
ADD COLUMN IF NOT EXISTS wizard_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) CHECK (payment_method IN ('prepaid', 'charge')),
ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS started_filling_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 2. Atualizar constraint de status para novos valores mais descritivos
ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;
ALTER TABLE service_orders ADD CONSTRAINT service_orders_status_check 
CHECK (status IN (
  'rascunho',              -- Wizard não finalizado (steps 1-3)
  'aguardando_pagamento',  -- Cobrança gerada, aguardando pagamento
  'em_preenchimento',      -- Pago, preenchendo dados da multa
  'em_analise',            -- Dados enviados, IA processando
  'concluido',             -- Recurso gerado e disponível
  'cancelado',             -- Cancelado pelo usuário
  'expirado'               -- Expirou sem pagamento (7 dias)
));

-- 3. Criar índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_service_orders_current_step ON service_orders(current_step);
CREATE INDEX IF NOT EXISTS idx_service_orders_last_saved_at ON service_orders(last_saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_orders_payment_method ON service_orders(payment_method);

-- 4. Migrar status existentes para novos valores
UPDATE service_orders 
SET status = CASE 
  WHEN status = 'pending_payment' THEN 'aguardando_pagamento'
  WHEN status = 'paid' THEN 'em_preenchimento'
  WHEN status = 'processing' THEN 'em_analise'
  WHEN status = 'completed' THEN 'concluido'
  WHEN status = 'cancelled' THEN 'cancelado'
  WHEN status = 'expired' THEN 'expirado'
  ELSE status
END
WHERE status IN ('pending_payment', 'paid', 'processing', 'completed', 'cancelled', 'expired');

-- 5. Criar função para atualizar last_saved_at automaticamente
CREATE OR REPLACE FUNCTION update_service_orders_last_saved_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar last_saved_at quando wizard_data ou current_step mudar
  IF OLD.wizard_data IS DISTINCT FROM NEW.wizard_data OR 
     OLD.current_step IS DISTINCT FROM NEW.current_step THEN
    NEW.last_saved_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para atualizar last_saved_at
DROP TRIGGER IF EXISTS trigger_update_service_orders_last_saved_at ON service_orders;
CREATE TRIGGER trigger_update_service_orders_last_saved_at
  BEFORE UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_service_orders_last_saved_at();

-- 7. Criar função para atualizar timestamps baseado em mudanças de status
CREATE OR REPLACE FUNCTION update_service_orders_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando status muda para 'em_preenchimento', marcar started_filling_at
  IF NEW.status = 'em_preenchimento' AND OLD.status != 'em_preenchimento' AND NEW.started_filling_at IS NULL THEN
    NEW.started_filling_at = NOW();
  END IF;
  
  -- Quando status muda para 'em_analise', marcar submitted_at
  IF NEW.status = 'em_analise' AND OLD.status != 'em_analise' AND NEW.submitted_at IS NULL THEN
    NEW.submitted_at = NOW();
  END IF;
  
  -- Quando status muda para 'concluido', marcar completed_at
  IF NEW.status = 'concluido' AND OLD.status != 'concluido' AND NEW.completed_at IS NULL THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger para atualizar timestamps de status
DROP TRIGGER IF EXISTS trigger_update_service_orders_status_timestamps ON service_orders;
CREATE TRIGGER trigger_update_service_orders_status_timestamps
  BEFORE UPDATE ON service_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_service_orders_status_timestamps();

-- 9. Adicionar comentários para documentação
COMMENT ON COLUMN service_orders.current_step IS 'Step atual do wizard (1=Cliente, 2=Serviço, 3=Pagamento)';
COMMENT ON COLUMN service_orders.wizard_data IS 'Dados salvos do wizard em formato JSON: {step1: {cliente}, step2: {servico}, step3: {pagamento}}';
COMMENT ON COLUMN service_orders.payment_method IS 'Método de pagamento escolhido: prepaid (saldo pré-pago) ou charge (cobrança Asaas)';
COMMENT ON COLUMN service_orders.last_saved_at IS 'Última vez que o rascunho foi salvo automaticamente';
COMMENT ON COLUMN service_orders.started_filling_at IS 'Quando o usuário começou a preencher os dados da multa (após pagamento)';
COMMENT ON COLUMN service_orders.submitted_at IS 'Quando os dados foram submetidos para análise da IA';
COMMENT ON COLUMN service_orders.completed_at IS 'Quando o recurso foi concluído e gerado pela IA';

-- 10. Atualizar comentário da coluna status
COMMENT ON COLUMN service_orders.status IS 'Status do recurso: rascunho, aguardando_pagamento, em_preenchimento, em_analise, concluido, cancelado, expirado';
