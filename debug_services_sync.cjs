const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugServicesSync() {
  console.log('🔍 === DEBUG SINCRONIZAÇÃO DE SERVIÇOS ===\n');
  
  try {
    // 1. Verificar todos os serviços
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, acsm_value, icetran_value, taxa_cobranca, base_price, suggested_price, updated_at')
      .order('updated_at', { ascending: false });
    
    if (servicesError) {
      console.error('❌ Erro ao buscar serviços:', servicesError);
      return;
    }
    
    console.log(`📋 Total de serviços encontrados: ${services.length}\n`);
    
    services.forEach((service, i) => {
      console.log(`${i+1}. ${service.name}`);
      console.log(`   ID: ${service.id}`);
      console.log(`   ACSM: R$ ${service.acsm_value || 'N/A'}`);
      console.log(`   ICETRAN: R$ ${service.icetran_value || 'N/A'}`);
      console.log(`   Taxa: R$ ${service.taxa_cobranca || 'N/A'}`);
      console.log(`   Base: R$ ${service.base_price || 'N/A'}`);
      console.log(`   Sugerido: R$ ${service.suggested_price || 'N/A'}`);
      console.log(`   Atualizado: ${service.updated_at}`);
      console.log('');
    });
    
    // 2. Verificar se há split_configurations
    const { data: splits, error: splitsError } = await supabase
      .from('split_configurations')
      .select('*');
    
    if (splitsError) {
      console.warn('⚠️ Erro ao buscar split_configurations:', splitsError);
    } else {
      console.log(`📊 Total de split_configurations: ${splits?.length || 0}\n`);
    }
    
    // 3. Verificar se há despachante_service_pricing
    const { data: pricing, error: pricingError } = await supabase
      .from('despachante_service_pricing')
      .select('*');
    
    if (pricingError) {
      console.warn('⚠️ Erro ao buscar despachante_service_pricing:', pricingError);
    } else {
      console.log(`💰 Total de despachante_service_pricing: ${pricing?.length || 0}\n`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugServicesSync();