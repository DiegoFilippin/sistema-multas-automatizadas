BEGIN;

-- Corrigir função de auditoria para mapear colunas/valores corretamente
CREATE OR REPLACE FUNCTION log_credential_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log quando is_manual_config muda
    IF TG_OP = 'UPDATE' AND OLD.is_manual_config IS DISTINCT FROM NEW.is_manual_config THEN
        INSERT INTO asaas_credentials_audit (
            subaccount_id,
            action,
            field_name,
            old_value,
            new_value,
            changed_by,
            changed_at
        ) VALUES (
            NEW.id,
            'update',
            'is_manual_config',
            OLD.is_manual_config::TEXT,
            NEW.is_manual_config::TEXT,
            NEW.credentials_updated_by,
            COALESCE(NEW.credentials_updated_at, NOW())
        );
    END IF;

    -- Log quando manual_wallet_id muda
    IF TG_OP = 'UPDATE' AND OLD.manual_wallet_id IS DISTINCT FROM NEW.manual_wallet_id THEN
        INSERT INTO asaas_credentials_audit (
            subaccount_id,
            action,
            field_name,
            old_value,
            new_value,
            changed_by,
            changed_at
        ) VALUES (
            NEW.id,
            'update',
            'manual_wallet_id',
            OLD.manual_wallet_id,
            NEW.manual_wallet_id,
            NEW.credentials_updated_by,
            COALESCE(NEW.credentials_updated_at, NOW())
        );
    END IF;

    -- Log quando manual_api_key muda (sem persistir valor real)
    IF TG_OP = 'UPDATE' AND OLD.manual_api_key IS DISTINCT FROM NEW.manual_api_key THEN
        INSERT INTO asaas_credentials_audit (
            subaccount_id,
            action,
            field_name,
            old_value,
            new_value,
            changed_by,
            changed_at
        ) VALUES (
            NEW.id,
            'update',
            'manual_api_key',
            CASE WHEN OLD.manual_api_key IS NOT NULL THEN '[REDACTED]' ELSE NULL END,
            CASE WHEN NEW.manual_api_key IS NOT NULL THEN '[REDACTED]' ELSE NULL END,
            NEW.credentials_updated_by,
            COALESCE(NEW.credentials_updated_at, NOW())
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger para garantir associação correta
DROP TRIGGER IF EXISTS trigger_log_credential_changes ON asaas_subaccounts;
CREATE TRIGGER trigger_log_credential_changes
    AFTER UPDATE ON asaas_subaccounts
    FOR EACH ROW EXECUTE FUNCTION log_credential_changes();

-- Ajustar RLS permissiva para desenvolvimento (allow all)
ALTER TABLE IF EXISTS asaas_credentials_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS asaas_credentials_audit_allow_all_select ON asaas_credentials_audit;
DROP POLICY IF EXISTS asaas_credentials_audit_allow_all_insert ON asaas_credentials_audit;
DROP POLICY IF EXISTS asaas_credentials_audit_allow_all_update ON asaas_credentials_audit;
DROP POLICY IF EXISTS asaas_credentials_audit_allow_all_delete ON asaas_credentials_audit;
CREATE POLICY asaas_credentials_audit_allow_all_select ON asaas_credentials_audit FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY asaas_credentials_audit_allow_all_insert ON asaas_credentials_audit FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY asaas_credentials_audit_allow_all_update ON asaas_credentials_audit FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY asaas_credentials_audit_allow_all_delete ON asaas_credentials_audit FOR DELETE TO authenticated, anon USING (true);

COMMIT;