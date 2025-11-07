ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;
CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);