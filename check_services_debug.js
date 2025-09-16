import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkServices() {
  console.log('🔍 Verificando serviços na tabela services...');
  
  try {
    // Buscar todos os serviços
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar serviços:', error);
      return;
    }
    
    console.log(`✅ Encontrados ${services?.length || 0} serviços:`);
    
    if (services && services.length > 0) {
      services.forEach((service, index) => {
        console.log(`\n${index + 1}. Serviço:`);
        console.log(`   - ID: ${service.id}`);
        console.log(`   - Nome: ${service.name}`);
        console.log(`   - Categoria: ${service.category}`);
        console.log(`   - Tipo Multa: ${service.tipo_multa}`);
        console.log(`   - Ativo: ${service.active}`);
        console.log(`   - ACSM Value: ${service.acsm_value}`);
        console.log(`   - ICETRAN Value: ${service.icetran_value}`);
        console.log(`   - Taxa Cobrança: ${service.taxa_cobranca}`);
        console.log(`   - Base Price: ${service.base_price}`);
      });
      
      // Verificar se o ID específico do erro existe
      const problematicId = '55be251f-9287-452c-b2db-f078791a777c';
      const foundService = services.find(s => s.id === problematicId);
      
      console.log(`\n🔍 Verificando ID específico do erro: ${problematicId}`);
      if (foundService) {
        console.log('✅ Serviço encontrado!');
        console.log('Dados:', foundService);
      } else {
        console.log('❌ Serviço NÃO encontrado!');
        console.log('IDs disponíveis:');
        services.forEach(s => console.log(`   - ${s.id} (${s.name})`));
      }
    } else {
      console.log('❌ Nenhum serviço encontrado na tabela!');
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

checkServices();