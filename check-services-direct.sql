-- Verificar serviços diretamente no banco
-- Desabilitar RLS temporariamente para verificar se há dados

-- Verificar se há serviços na tabela
SELECT COUNT(*) as total_services FROM services;

-- Listar todos os serviços (ignorando RLS)
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
ORDER BY created_at DESC;

-- Verificar políticas RLS da tabela services
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'services';

-- Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'services';