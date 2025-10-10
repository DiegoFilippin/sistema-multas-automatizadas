-- Criar o serviço "Recurso de Multa" que deveria ter sido configurado pelo superadmin

-- Primeiro, verificar se já existe
SELECT * FROM services WHERE name = 'Recurso de Multa';

-- Se não existir, criar o serviço
INSERT INTO services (
  id,
  name,
  description,
  category,
  pricing_type,
  percentage_value,
  minimum_value,
  fixed_value,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Recurso de Multa',
  'Serviço de recurso administrativo para contestação de multas de trânsito',
  'Trânsito',
  'fixed',
  NULL,
  NULL,
  50.00, -- Valor base fixo
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Verificar se foi criado
SELECT 
  id,
  name,
  description,
  category,
  pricing_type,
  fixed_value,
  is_active,
  created_at
FROM services 
WHERE name = 'Recurso de Multa';