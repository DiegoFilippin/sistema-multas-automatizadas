const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getValidService() {
  try {
    console.log('🔍 Buscando serviços disponíveis...');
    
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Erro ao buscar serviços:', error);
      return;
    }
    
    if (!services || services.length === 0) {
      console.log('❌ Nenhum serviço encontrado!');
      return;
    }
    
    console.log('✅ Serviços encontrados:');
    services.forEach((service, index) => {
      console.log(`${index + 1}. ID: ${service.id}`);
      console.log(`   Nome: ${service.name}`);
      console.log(`   Categoria: ${service.category}`);
      console.log(`   Valor ACSM: R$ ${service.acsm_value}`);
      console.log(`   Valor ICETRAN: R$ ${service.icetran_value}`);
      console.log(`   Taxa: R$ ${service.taxa_cobranca}`);
      console.log('   ---');
    });
    
    // Retornar o primeiro serviço para teste
    const firstService = services[0];
    console.log('\n🎯 Usando serviço para teste:');
    console.log(`ID: ${firstService.id}`);
    console.log(`Nome: ${firstService.name}`);
    
    return firstService;
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

getValidService();