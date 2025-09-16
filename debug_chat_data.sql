-- Verificar dados nas tabelas de chat

-- 1. Verificar sessões de chat existentes
SELECT 
  id,
  company_id,
  user_id,
  multa_id,
  session_id,
  status,
  created_at
FROM chat_sessions 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Verificar mensagens de chat existentes
SELECT 
  cm.id,
  cm.chat_session_id,
  cm.message_type,
  LEFT(cm.content, 100) as content_preview,
  cm.created_at,
  cs.multa_id,
  cs.session_id
FROM chat_messages cm
JOIN chat_sessions cs ON cm.chat_session_id = cs.id
ORDER BY cm.created_at DESC 
LIMIT 10;

-- 3. Contar total de sessões e mensagens
SELECT 
  'chat_sessions' as table_name,
  COUNT(*) as total_records
FROM chat_sessions
UNION ALL
SELECT 
  'chat_messages' as table_name,
  COUNT(*) as total_records
FROM chat_messages;

-- 4. Verificar sessões por multa_id específico (se houver)
SELECT 
  cs.id,
  cs.multa_id,
  cs.session_id,
  cs.status,
  COUNT(cm.id) as message_count
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cs.id = cm.chat_session_id
WHERE cs.multa_id IS NOT NULL
GROUP BY cs.id, cs.multa_id, cs.session_id, cs.status
ORDER BY cs.created_at DESC;