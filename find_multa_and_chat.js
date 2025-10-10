import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findMultaAndChat() {
  console.log('🔍 Buscando multas J001565490...');
  
  try {
    // Buscar todas as multas pelo numero_auto (sem .single())
    const { data: multas, error: multaError } = await supabase
      .from('multas')
      .select('id, numero_auto, placa_veiculo, created_at')
      .eq('numero_auto', 'J001565490')
      .order('created_at', { ascending: false });
    
    if (multaError) {
      console.error('❌ Erro ao buscar multas:', multaError);
      return;
    }
    
    if (!multas || multas.length === 0) {
      console.log('❌ Multa J001565490 não encontrada');
      return;
    }
    
    console.log(`✅ ${multas.length} multa(s) encontrada(s):`);
    multas.forEach((multa, index) => {
      console.log(`\n--- Multa ${index + 1} ---`);
      console.log('- ID:', multa.id);
      console.log('- Número:', multa.numero_auto);
      console.log('- Placa:', multa.placa_veiculo);
      console.log('- Criada em:', multa.created_at);
    });
    
    // Usar a multa mais recente
    const multa = multas[0];
    console.log(`\n🎯 Usando multa mais recente: ${multa.id}`);
    
    // Agora buscar mensagens do chat usando diferentes estratégias
    console.log('\n🔍 Buscando mensagens do chat...');
    
    // Estratégia 1: Buscar por session_id que contenha o ID da multa
    console.log('\n📋 Estratégia 1: Buscar por session_id que contenha ID da multa');
    const { data: chatBySessionId, error: chatError1 } = await supabase
      .from('n8n_chat_recurso_de_multas')
      .select('*')
      .ilike('session_id', `%${multa.id}%`);
    
    if (chatError1) {
      console.error('❌ Erro na busca por session_id:', chatError1);
    } else {
      console.log('📊 Mensagens encontradas por session_id:', chatBySessionId?.length || 0);
      if (chatBySessionId && chatBySessionId.length > 0) {
        chatBySessionId.forEach((msg, index) => {
          console.log(`\n--- Mensagem ${index + 1} ---`);
          console.log('Session ID:', msg.session_id);
          console.log('Tipo:', msg.message?.type);
          console.log('Conteúdo (primeiros 100 chars):', msg.message?.content?.substring(0, 100) + '...');
        });
      }
    }
    
    // Estratégia 2: Buscar todas as mensagens e verificar se alguma contém o ID da multa no conteúdo
    console.log('\n📋 Estratégia 2: Buscar no conteúdo das mensagens');
    const { data: allChat, error: chatError2 } = await supabase
      .from('n8n_chat_recurso_de_multas')
      .select('*');
    
    if (chatError2) {
      console.error('❌ Erro na busca geral:', chatError2);
    } else {
      console.log('📊 Total de mensagens na tabela:', allChat?.length || 0);
      
      if (allChat && allChat.length > 0) {
        // Buscar por qualquer ID das multas encontradas
        const multaIds = multas.map(m => m.id);
        const messagesWithMultaId = allChat.filter(msg => {
          const content = JSON.stringify(msg.message || {});
          return multaIds.some(id => content.includes(id)) || content.includes(multa.numero_auto);
        });
        
        console.log('📊 Mensagens que contêm dados da multa:', messagesWithMultaId.length);
        
        if (messagesWithMultaId.length > 0) {
          messagesWithMultaId.forEach((msg, index) => {
            console.log(`\n--- Mensagem relacionada ${index + 1} ---`);
            console.log('Session ID:', msg.session_id);
            console.log('Tipo:', msg.message?.type);
            console.log('Conteúdo (primeiros 200 chars):', msg.message?.content?.substring(0, 200) + '...');
          });
        }
      }
    }
    
    // Estratégia 3: Verificar se existe campo idmultabancodedados em algum lugar
    console.log('\n📋 Estratégia 3: Procurar por idmultabancodedados');
    if (allChat && allChat.length > 0) {
      let foundIdMulta = false;
      allChat.forEach((msg, index) => {
        const messageStr = JSON.stringify(msg.message || {});
        if (messageStr.includes('idmultabancodedados')) {
          console.log(`✅ Campo idmultabancodedados encontrado na mensagem ${index + 1}`);
          console.log('Session ID:', msg.session_id);
          foundIdMulta = true;
        }
      });
      
      if (!foundIdMulta) {
        console.log('❌ Campo idmultabancodedados não encontrado em nenhuma mensagem');
      }
    }
    
    // Estratégia 4: Mostrar estrutura completa de uma mensagem para entender o formato
    console.log('\n📋 Estratégia 4: Analisar estrutura completa de uma mensagem');
    if (allChat && allChat.length > 0) {
      console.log('\n🔍 Estrutura completa da primeira mensagem:');
      console.log(JSON.stringify(allChat[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

findMultaAndChat();