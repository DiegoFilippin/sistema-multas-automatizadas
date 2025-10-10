-- Inserir multas de teste para F&Z CONSULTORIA EMPRESARIAL LTDA
-- Company ID: 7d573ce0-125d-46bf-9e37-33d0c6074cf9

-- Primeiro, vamos verificar se temos clientes para essa empresa
-- Se não tiver, vamos criar alguns clientes de teste

INSERT INTO clients (
  id,
  company_id,
  nome,
  cpf_cnpj,
  email,
  telefone,
  endereco,
  cidade,
  estado,
  cep,
  status,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
  'João Silva Santos',
  '123.456.789-01',
  'joao.silva@email.com',
  '(48) 99999-1111',
  'Rua das Flores, 123',
  'Florianópolis',
  'SC',
  '88000-000',
  'ativo',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
  'Maria Oliveira Costa',
  '987.654.321-02',
  'maria.oliveira@email.com',
  '(48) 99999-2222',
  'Av. Principal, 456',
  'São José',
  'SC',
  '88100-000',
  'ativo',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
  'Carlos Eduardo Lima',
  '456.789.123-03',
  'carlos.lima@email.com',
  '(48) 99999-3333',
  'Rua do Comércio, 789',
  'Palhoça',
  'SC',
  '88130-000',
  'ativo',
  NOW(),
  NOW()
)
ON CONFLICT (cpf_cnpj) DO NOTHING;

-- Agora vamos inserir multas para esses clientes
-- Primeiro, vamos buscar os IDs dos clientes que acabamos de criar

WITH clientes_fz AS (
  SELECT id, nome FROM clients 
  WHERE company_id = '7d573ce0-125d-46bf-9e37-33d0c6074cf9'
  LIMIT 3
)
INSERT INTO multas (
  id,
  company_id,
  client_id,
  numero_auto,
  placa_veiculo,
  data_infracao,
  hora_infracao,
  local_infracao,
  codigo_infracao,
  descricao_infracao,
  valor_original,
  valor_desconto,
  valor_final,
  data_vencimento,
  status,
  orgao_autuador,
  pontos,
  observacoes,
  tipo_gravidade,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
  c.id,
  'FZ' || LPAD((ROW_NUMBER() OVER())::text, 8, '0'),
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'ABC1234'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'DEF5678'
    ELSE 'GHI9012'
  END,
  CURRENT_DATE - INTERVAL '30 days',
  '14:30:00',
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'Av. Beira Mar Norte, Florianópolis/SC'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'BR-101, São José/SC'
    ELSE 'Rua Felipe Schmidt, Florianópolis/SC'
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN '60630'
    WHEN ROW_NUMBER() OVER() = 2 THEN '50410'
    ELSE '70550'
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'Excesso de velocidade em até 20% da velocidade máxima permitida'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'Estacionar em local proibido'
    ELSE 'Avançar sinal vermelho'
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 130.16
    WHEN ROW_NUMBER() OVER() = 2 THEN 195.23
    ELSE 293.47
  END,
  0,
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 130.16
    WHEN ROW_NUMBER() OVER() = 2 THEN 195.23
    ELSE 293.47
  END,
  CURRENT_DATE + INTERVAL '30 days',
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'pendente'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'em_recurso'
    ELSE 'pendente'
  END,
  'DETRAN/SC',
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 4
    WHEN ROW_NUMBER() OVER() = 2 THEN 3
    ELSE 7
  END,
  'Multa cadastrada para teste do sistema',
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'media'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'grave'
    ELSE 'gravissima'
  END,
  NOW(),
  NOW()
FROM clientes_fz c;

-- Inserir mais algumas multas para ter uma lista mais robusta
WITH clientes_fz AS (
  SELECT id, nome FROM clients 
  WHERE company_id = '7d573ce0-125d-46bf-9e37-33d0c6074cf9'
  ORDER BY created_at
  LIMIT 3
)
INSERT INTO multas (
  id,
  company_id,
  client_id,
  numero_auto,
  placa_veiculo,
  data_infracao,
  hora_infracao,
  local_infracao,
  codigo_infracao,
  descricao_infracao,
  valor_original,
  valor_desconto,
  valor_final,
  data_vencimento,
  status,
  orgao_autuador,
  pontos,
  observacoes,
  tipo_gravidade,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
  c.id,
  'FZ' || LPAD((ROW_NUMBER() OVER() + 3)::text, 8, '0'),
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'JKL3456'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'MNO7890'
    ELSE 'PQR1234'
  END,
  CURRENT_DATE - INTERVAL '15 days',
  '09:15:00',
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'SC-401, Florianópolis/SC'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'Av. Madre Benvenuta, Florianópolis/SC'
    ELSE 'BR-282, São José/SC'
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN '60631'
    WHEN ROW_NUMBER() OVER() = 2 THEN '50420'
    ELSE '70560'
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'Excesso de velocidade em mais de 20% até 50% da velocidade máxima permitida'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'Estacionar em vaga para deficientes sem credencial'
    ELSE 'Usar telefone celular ao volante'
  END,
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 195.23
    WHEN ROW_NUMBER() OVER() = 2 THEN 293.47
    ELSE 293.47
  END,
  0,
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 195.23
    WHEN ROW_NUMBER() OVER() = 2 THEN 293.47
    ELSE 293.47
  END,
  CURRENT_DATE + INTERVAL '45 days',
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'pendente'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'pendente'
    ELSE 'em_recurso'
  END,
  'DETRAN/SC',
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 5
    WHEN ROW_NUMBER() OVER() = 2 THEN 7
    ELSE 7
  END,
  'Multa cadastrada para teste do sistema - segunda leva',
  CASE 
    WHEN ROW_NUMBER() OVER() = 1 THEN 'grave'
    WHEN ROW_NUMBER() OVER() = 2 THEN 'gravissima'
    ELSE 'gravissima'
  END,
  NOW(),
  NOW()
FROM clientes_fz c;

-- Verificar se as multas foram inseridas
SELECT 
  COUNT(*) as total_multas_fz,
  COUNT(CASE WHEN status = 'pendente' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'em_recurso' THEN 1 END) as em_recurso
FROM multas 
WHERE company_id = '7d573ce0-125d-46bf-9e37-33d0c6074cf9';

-- Verificar clientes da empresa
SELECT COUNT(*) as total_clientes_fz
FROM clients 
WHERE company_id = '7d573ce0-125d-46bf-9e37-33d0c6074cf9';