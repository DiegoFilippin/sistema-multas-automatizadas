-- Add account_origin to identify if account is system-managed (ACMS) or external (client-provided)
BEGIN;

-- 1) Add column (nullable initially for safe backfill)
ALTER TABLE public.asaas_subaccounts
  ADD COLUMN IF NOT EXISTS account_origin TEXT;

-- 2) Backfill existing rows as 'system' (ACMS-managed by default)
UPDATE public.asaas_subaccounts
  SET account_origin = 'system'
WHERE account_origin IS NULL;

-- 3) Add CHECK constraint to restrict allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'asaas_subaccounts_account_origin_chk'
  ) THEN
    ALTER TABLE public.asaas_subaccounts
      ADD CONSTRAINT asaas_subaccounts_account_origin_chk
      CHECK (account_origin IN ('system','external'));
  END IF;
END $$;

-- 4) Set NOT NULL after backfill
ALTER TABLE public.asaas_subaccounts
  ALTER COLUMN account_origin SET NOT NULL;

COMMIT;