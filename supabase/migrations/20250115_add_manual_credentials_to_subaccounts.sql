-- Migration: Add manual credential fields to asaas_subaccounts table
-- Created: January 15, 2025
-- Purpose: Enable manual configuration of Wallet ID and API Key for subaccounts

-- Add manual credential fields to asaas_subaccounts table
ALTER TABLE asaas_subaccounts 
ADD COLUMN IF NOT EXISTS manual_wallet_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS manual_api_key TEXT,
ADD COLUMN IF NOT EXISTS credentials_source VARCHAR(50) DEFAULT 'auto' CHECK (credentials_source IN ('auto', 'manual')),
ADD COLUMN IF NOT EXISTS credentials_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS credentials_updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_manual_config BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_asaas_subaccounts_manual_wallet ON asaas_subaccounts(manual_wallet_id);
CREATE INDEX IF NOT EXISTS idx_asaas_subaccounts_is_manual ON asaas_subaccounts(is_manual_config);
CREATE INDEX IF NOT EXISTS idx_asaas_subaccounts_credentials_source ON asaas_subaccounts(credentials_source);

-- Add comment descriptions for the new columns
COMMENT ON COLUMN asaas_subaccounts.manual_wallet_id IS 'Manually configured Wallet ID for Asaas subaccount';
COMMENT ON COLUMN asaas_subaccounts.manual_api_key IS 'Encrypted manually configured API Key for Asaas subaccount';
COMMENT ON COLUMN asaas_subaccounts.credentials_source IS 'Source of credentials: auto (automatic) or manual (manual configuration)';
COMMENT ON COLUMN asaas_subaccounts.credentials_updated_at IS 'Timestamp when credentials were last updated';
COMMENT ON COLUMN asaas_subaccounts.credentials_updated_by IS 'User ID who last updated the credentials';
COMMENT ON COLUMN asaas_subaccounts.is_manual_config IS 'Flag indicating if this subaccount uses manual configuration';

-- Grant permissions to authenticated users for the new columns
GRANT SELECT (manual_wallet_id, credentials_source, credentials_updated_at, is_manual_config) ON asaas_subaccounts TO authenticated;
GRANT UPDATE (manual_wallet_id, manual_api_key, credentials_source, credentials_updated_at, is_manual_config) ON asaas_subaccounts TO authenticated;

-- Grant full access to anon for read operations (for public access where appropriate)
GRANT SELECT (manual_wallet_id, credentials_source, credentials_updated_at, is_manual_config) ON asaas_subaccounts TO anon;