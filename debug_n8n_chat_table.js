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

async function debugN8nChatTable() {
  console.log('🔍 Investigando tabela n8n_chat_recurso_de_multas...');
  
  try {
    // Buscar alguns registros para entender a estrutura
    const { data, error } = await supabase
      .from('n8n_chat_recurso_de_multas')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Erro ao buscar dados:', error);
      return;
    }
    
    console.log('📊 Dados encontrados:', data?.length || 0, 'registros');
    
    if (data && data.length > 0) {
      console.log('\n📋 Estrutura dos dados:');
      data.forEach((record, index) => {
        console.log(`\n--- Registro ${index + 1} ---`);
        console.log('ID:', record.id);
        console.log('Session ID:', record.session_id);
        console.log('Message (tipo):', typeof record.message);
        
        if (record.message) {
          console.log('Message (conteúdo):');
          console.log(JSON.stringify(record.message, null, 2));
        }
      });
      
      // Verificar se existe campo idmultabancodedados
      const firstRecord = data[0];
      const fields = Object.keys(firstRecord);
      console.log('\n🔑 Campos disponíveis:', fields);
      
      if (fields.includes('idmultabancodedados')) {
        console.log('✅ Campo idmultabancodedados encontrado!');
      } else {
        console.log('❌ Campo idmultabancodedados NÃO encontrado');
        console.log('💡 Verificando se está dentro do campo message...');
        
        data.forEach((record, index) => {
          if (record.message && typeof record.message === 'object') {
            const messageFields = Object.keys(record.message);
            console.log(`Registro ${index + 1} - campos em message:`, messageFields);
            
            if (record.message.idmultabancodedados) {
              console.log(`✅ idmultabancodedados encontrado em message: ${record.message.idmultabancodedados}`);
            }
          }
        });
      }
    } else {
      console.log('📭 Nenhum dado encontrado na tabela');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugN8nChatTable();