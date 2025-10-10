const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugValuesInconsistency() {
  console.log('🔍 === DEBUG: INCONSISTÊNCIA DE VALORES ===\n');
  
  try {
    // 1. Buscar serviços da tabela services (usado em ServicosEsplits.tsx)
    console.log('📋 1. VALORES NA TABELA SERVICES (ServicosEsplits.tsx):');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('category', 'Trânsito')
      .eq('is_active', true)
      .order('name');
    
    if (servicesError) {
      console.error('❌ Erro ao buscar services:', servicesError);
      return;
    }
    
    services?.forEach((service, i) => {
      console.log(`  ${i+1}. ${service.name}:`);
      console.log(`     - ACSM Value: R$ ${service.acsm_value || 'N/A'}`);
      console.log(`     - ICETRAN Value: R$ ${service.icetran_value || 'N/A'}`);
      console.log(`     - Taxa Cobrança: R$ ${service.taxa_cobranca || 'N/A'}`);
      console.log(`     - Base Price: R$ ${service.base_price || 'N/A'}`);
      console.log(`     - Suggested Price: R$ ${service.suggested_price || 'N/A'}`);
      console.log(`     - Tipo Multa: ${service.tipo_multa || 'N/A'}`);
      console.log(`     - Updated At: ${service.updated_at}`);
      console.log('');
    });
    
    // 2. Simular como MeusServicos.tsx carrega os dados
    console.log('\n📱 2. COMO MEUSSERVICOS.TSX CARREGA OS DADOS:');
    
    // Buscar serviços como MeusServicos faz
    const { data: multaServices, error: multaError } = await supabase
      .from('services')
      .select('*')
      .eq('category', 'Trânsito')
      .eq('active', true)  // Note: MeusServicos usa 'active', não 'is_active'
      .not('tipo_multa', 'is', null)
      .order('base_price');
    
    if (multaError) {
      console.error('❌ Erro ao buscar como MeusServicos:', multaError);
    } else {
      console.log(`   Encontrados ${multaServices?.length || 0} serviços com filtro do MeusServicos`);
      
      multaServices?.forEach((service, i) => {
        // Simular conversão para MultaType como MeusServicos faz
        const multaType = {
          id: service.id,
          type: service.tipo_multa,
          name: service.name,
          description: service.description,
          suggested_price: service.suggested_price || 0,
          total_price: service.base_price || (service.acsm_value + service.icetran_value + (service.taxa_cobranca || 3.50)),
          acsm_value: service.acsm_value || 0,
          icetran_value: service.icetran_value || 0,
          fixed_value: service.base_price || 0,
          active: service.active || service.is_active,
          severity: service.tipo_multa?.toLowerCase() || 'leve'
        };
        
        console.log(`  ${i+1}. ${multaType.name} (${multaType.type}):`);
        console.log(`     - Suggested Price: R$ ${multaType.suggested_price}`);
        console.log(`     - Total Price (custo): R$ ${multaType.total_price}`);
        console.log(`     - ACSM Value: R$ ${multaType.acsm_value}`);
        console.log(`     - ICETRAN Value: R$ ${multaType.icetran_value}`);
        console.log(`     - Severity: ${multaType.severity}`);
        console.log('');
      });
    }
    
    // 3. Verificar diferenças nos campos
    console.log('\n⚠️  3. POSSÍVEIS INCONSISTÊNCIAS:');
    
    // Verificar se há diferença entre 'active' e 'is_active'
    const activeServices = await supabase
      .from('services')
      .select('id, name, active, is_active')
      .eq('category', 'Trânsito');
    
    if (activeServices.data) {
      activeServices.data.forEach(service => {
        if (service.active !== service.is_active) {
          console.log(`   ❌ ${service.name}: active=${service.active}, is_active=${service.is_active}`);
        }
      });
    }
    
    // 4. Verificar configuração de splits específica
    console.log('\n🔧 4. CONFIGURAÇÃO DE SPLITS ESPECÍFICA (loadServiceSplitConfig):');
    
    const { data: splitConfig, error: splitError } = await supabase
      .from('services')
      .select('acsm_value, icetran_value, taxa_cobranca')
      .eq('name', 'Recurso de Multa')
      .eq('category', 'Trânsito')
      .single();
    
    if (splitError) {
      console.log('   ⚠️ Configuração específica não encontrada, usando valores padrão:');
      console.log('     - ACSM: R$ 6.00');
      console.log('     - ICETRAN: R$ 6.00');
      console.log('     - Taxa: R$ 3.50');
    } else {
      console.log('   ✅ Configuração específica encontrada:');
      console.log(`     - ACSM: R$ ${splitConfig.acsm_value}`);
      console.log(`     - ICETRAN: R$ ${splitConfig.icetran_value}`);
      console.log(`     - Taxa: R$ ${splitConfig.taxa_cobranca}`);
    }
    
    // 5. Verificar se há serviços com company_id
    console.log('\n🏢 5. VERIFICAR FILTRO POR COMPANY_ID:');
    
    const servicesWithCompany = await supabase
      .from('services')
      .select('id, name, company_id')
      .not('company_id', 'is', null);
    
    if (servicesWithCompany.data?.length > 0) {
      console.log('   ⚠️ Alguns serviços têm company_id definido:');
      servicesWithCompany.data.forEach(service => {
        console.log(`     - ${service.name}: company_id=${service.company_id}`);
      });
    } else {
      console.log('   ✅ Nenhum serviço tem company_id definido (correto para serviços globais)');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugValuesInconsistency();