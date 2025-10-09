const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateSuggestedPriceSources() {
  console.log('🔍 === INVESTIGAÇÃO DOS VALORES SUGERIDOS ===\n');
  
  try {
    // 1. Consultar tabela 'services' 
    console.log('📋 1. VALORES NA TABELA SERVICES:');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, tipo_multa, base_price, active')
      .eq('category', 'Trânsito')
      .eq('active', true)
      .not('tipo_multa', 'is', null)
      .order('base_price');
    
    if (servicesError) {
      console.error('❌ Erro ao buscar services:', servicesError);
    } else {
      console.log(`   Encontrados ${services?.length || 0} serviços ativos:`);
      services?.forEach(service => {
        console.log(`   - ${service.name} (${service.tipo_multa}): R$ ${service.base_price}`);
      });
    }
    
    console.log('\n📋 2. VALORES NA TABELA MULTA_TYPES:');
    // 2. Consultar tabela 'multa_types'
    const { data: multaTypes, error: multaTypesError } = await supabase
      .from('multa_types')
      .select('id, type, name, suggested_price, total_price, active, service_id')
      .eq('active', true)
      .order('suggested_price');
    
    if (multaTypesError) {
      console.error('❌ Erro ao buscar multa_types:', multaTypesError);
    } else {
      console.log(`   Encontrados ${multaTypes?.length || 0} tipos de multa ativos:`);
      multaTypes?.forEach(type => {
        console.log(`   - ${type.name} (${type.type}): R$ ${type.suggested_price} | Service ID: ${type.service_id}`);
      });
    }
    
    console.log('\n🔄 3. COMPARAÇÃO ENTRE AS TABELAS:');
    
    if (services && multaTypes) {
      // Comparar valores por tipo de multa
      const tiposMulta = ['leve', 'media', 'grave', 'gravissima'];
      
      tiposMulta.forEach(tipo => {
        const serviceData = services.find(s => s.tipo_multa?.toLowerCase() === tipo);
        const multaTypeData = multaTypes.find(mt => mt.type?.toLowerCase() === tipo);
        
        console.log(`\n   📊 TIPO: ${tipo.toUpperCase()}`);
        
        if (serviceData) {
          console.log(`      Services: ${serviceData.name} - R$ ${serviceData.base_price}`);
        } else {
          console.log(`      Services: ❌ Não encontrado`);
        }
        
        if (multaTypeData) {
          console.log(`      MultaTypes: ${multaTypeData.name} - R$ ${multaTypeData.suggested_price}`);
        } else {
          console.log(`      MultaTypes: ❌ Não encontrado`);
        }
        
        // Verificar inconsistência
        if (serviceData && multaTypeData) {
          const servicePriceNum = parseFloat(serviceData.base_price) || 0;
          const multaTypePriceNum = parseFloat(multaTypeData.suggested_price) || 0;
          
          if (servicePriceNum !== multaTypePriceNum) {
            console.log(`      ⚠️  INCONSISTÊNCIA: Services (R$ ${servicePriceNum}) ≠ MultaTypes (R$ ${multaTypePriceNum})`);
          } else {
            console.log(`      ✅ Valores consistentes: R$ ${servicePriceNum}`);
          }
        }
      });
    }
    
    console.log('\n🎯 4. ANÁLISE DO CÓDIGO ATUAL:');
    console.log('   O arquivo MeusServicos.tsx (linha 500) está usando:');
    console.log('   suggested_price: service.base_price || 0');
    console.log('   Isso significa que está pegando da tabela SERVICES, não MULTA_TYPES');
    
    console.log('\n💡 5. RECOMENDAÇÕES:');
    console.log('   - Se você atualizou os valores na tabela multa_types como superadmin,');
    console.log('   - O código precisa ser alterado para buscar de multa_types ao invés de services');
    console.log('   - OU sincronizar os valores entre as duas tabelas');
    
  } catch (error) {
    console.error('💥 Erro na investigação:', error);
  }
}

// Executar investigação
investigateSuggestedPriceSources();