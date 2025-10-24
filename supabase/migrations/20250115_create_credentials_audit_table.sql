-- Migration: Create asaas_credentials_audit table for credential change tracking
-- Created: January 15, 2025
-- Purpose: Audit trail for all credential changes in subaccounts

-- Create audit table for credential changes
CREATE TABLE IF NOT EXISTS asaas_credentials_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subaccount_id UUID REFERENCES asaas_subaccounts(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_credentials_audit_subaccount ON asaas_credentials_audit(subaccount_id);
CREATE INDEX IF NOT EXISTS idx_credentials_audit_changed_at ON asaas_credentials_audit(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_credentials_audit_changed_by ON asaas_credentials_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_credentials_audit_action ON asaas_credentials_audit(action);

-- Add comment descriptions for audit table columns
COMMENT ON TABLE asaas_credentials_audit IS 'Audit trail for subaccount credential changes';
COMMENT ON COLUMN asaas_credentials_audit.id IS 'Unique identifier for audit entry';
COMMENT ON COLUMN asaas_credentials_audit.subaccount_id IS 'Reference to the subaccount whose credentials were changed';
COMMENT ON COLUMN asaas_credentials_audit.action IS 'Type of action: create, update, or delete';
COMMENT ON COLUMN asaas_credentials_audit.field_name IS 'Name of the field that was changed';
COMMENT ON COLUMN asaas_credentials_audit.old_value IS 'Previous value before the change';
COMMENT ON COLUMN asaas_credentials_audit.new_value IS 'New value after the change';
COMMENT ON COLUMN asaas_credentials_audit.changed_by IS 'User who made the change';
COMMENT ON COLUMN asaas_credentials_audit.changed_at IS 'Timestamp when the change was made';
COMMENT ON COLUMN asaas_credentials_audit.ip_address IS 'IP address of the user who made the change';
COMMENT ON COLUMN asaas_credentials_audit.user_agent IS 'User agent string of the user who made the change';

-- Grant permissions for audit table
GRANT SELECT ON asaas_credentials_audit TO authenticated;
GRANT INSERT ON asaas_credentials_audit TO authenticated;
GRANT SELECT ON asaas_credentials_audit TO anon;

-- Create function to automatically log credential changes
CREATE OR REPLACE FUNCTION log_credential_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when manual configuration is enabled/disabled
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
            NEW.credentials_updated_at
        );
    END IF;

    -- Log when manual wallet ID is changed
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
            NEW.credentials_updated_at
        );
    END IF;

    -- Log when manual API key is changed (store only that it was changed, not the actual values)
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
            NEW.credentials_updated_at
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log credential changes
DROP TRIGGER IF EXISTS trigger_log_credential_changes ON asaas_subaccounts;
CREATE TRIGGER trigger_log_credential_changes
    AFTER UPDATE ON asaas_subaccounts
    FOR EACH ROW
    EXECUTE FUNCTION log_credential_changes();