import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testServiceQuery() {
  console.log('🔍 Testando query exata do proxy-server...');
  
  const service_id = '55be251f-9287-452c-b2db-f078791a777c';
  
  console.log('Service ID:', service_id);
  console.log('Query: services.select(id, name, category, acsm_value, icetran_value, taxa_cobranca).eq(id, service_id).single()');
  
  try {
    // Reproduzir exatamente a query do proxy-server
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        id, name, category,
        acsm_value, icetran_value, taxa_cobranca
      `)
      .eq('id', service_id)
      .single();
    
    console.log('\n📊 RESULTADO:');
    console.log('Error:', serviceError);
    console.log('Data:', service);
    
    if (serviceError) {
      console.log('\n❌ ERRO DETALHADO:');
      console.log('  - Code:', serviceError.code);
      console.log('  - Message:', serviceError.message);
      console.log('  - Details:', serviceError.details);
      console.log('  - Hint:', serviceError.hint);
      
      // Tentar query sem .single() para ver se retorna múltiplos resultados
      console.log('\n🔍 Testando sem .single():');
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select(`
          id, name, category,
          acsm_value, icetran_value, taxa_cobranca
        `)
        .eq('id', service_id);
      
      console.log('Error (sem single):', servicesError);
      console.log('Data (sem single):', services);
      console.log('Quantidade de resultados:', services?.length || 0);
    } else {
      console.log('\n✅ SUCESSO!');
      console.log('Serviço encontrado:', service);
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

testServiceQuery();