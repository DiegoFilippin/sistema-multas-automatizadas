require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const investigate = async () => {
  console.log('🔍 Investigando discrepância entre session_ids...');
  
  console.log('\n📋 Session IDs na tabela chat_sessions:');
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('multa_id, session_id');
  
  sessions?.forEach(s => {
    console.log(`  Multa: ${s.multa_id} → Session: ${s.session_id}`);
  });
  
  console.log('\n📋 Session IDs na tabela n8n_chat_recurso_de_multas:');
  const { data: n8nMessages } = await supabase
    .from('n8n_chat_recurso_de_multas')
    .select('session_id')
    .limit(10);
  
  const uniqueSessionIds = [...new Set(n8nMessages?.map(m => m.session_id))];
  uniqueSessionIds.forEach(id => {
    console.log(`  Session: ${id}`);
  });
  
  console.log('\n🔍 Verificando se há correspondência...');
  const sessionFromChatSessions = sessions?.map(s => s.session_id) || [];
  const sessionFromN8n = uniqueSessionIds;
  
  const matches = sessionFromChatSessions.filter(s => sessionFromN8n.includes(s));
  console.log('Correspondências encontradas:', matches.length);
  
  matches.forEach(match => {
    console.log(`  ✅ ${match}`);
  });
  
  if (matches.length === 0) {
    console.log('\n❌ Nenhuma correspondência encontrada!');
    console.log('Isso explica por que não conseguimos carregar o histórico.');
    console.log('\n💡 Possíveis soluções:');
    console.log('1. As mensagens n8n foram criadas com session_ids diferentes');
    console.log('2. Precisamos usar uma estratégia de busca alternativa');
    console.log('3. Os dados de teste não estão sincronizados');
  }
};

investigate();