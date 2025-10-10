const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase com service_role
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMultaTypes() {
  console.log('🔍 Verificando tipos de multa...');
  
  try {
    // Buscar todos os tipos de multa
    const { data: allTypes, error: allError } = await supabase
      .from('multa_types')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('❌ Erro ao buscar tipos de multa:', allError);
      return;
    }
    
    console.log(`\n📋 Total de tipos de multa: ${allTypes?.length || 0}`);
    
    if (allTypes && allTypes.length > 0) {
      console.log('\n📝 Lista completa:');
      allTypes.forEach((type, index) => {
        console.log(`\n${index + 1}. ${type.name} (${type.type})`);
        console.log(`   ID: ${type.id}`);
        console.log(`   Service ID: ${type.service_id}`);
        console.log(`   Ativo: ${type.active}`);
        console.log(`   ACSM: R$ ${type.acsm_value}`);
        console.log(`   ICETRAN: R$ ${type.icetran_value}`);
        console.log(`   Taxa: R$ ${type.fixed_value}`);
        console.log(`   Total: R$ ${type.acsm_value + type.icetran_value + type.fixed_value}`);
      });
      
      // Verificar duplicatas por tipo
      const typeGroups = {};
      allTypes.forEach(type => {
        if (!typeGroups[type.type]) {
          typeGroups[type.type] = [];
        }
        typeGroups[type.type].push(type);
      });
      
      console.log('\n🔍 Verificando duplicatas:');
      Object.keys(typeGroups).forEach(typeKey => {
        const group = typeGroups[typeKey];
        if (group.length > 1) {
          console.log(`\n⚠️ DUPLICATA ENCONTRADA - Tipo: ${typeKey}`);
          group.forEach((type, index) => {
            console.log(`   ${index + 1}. ID: ${type.id}, Service: ${type.service_id}, Ativo: ${type.active}`);
          });
        } else {
          console.log(`   ✅ ${typeKey}: 1 registro`);
        }
      });
      
      // Testar busca específica como no proxy-server
      console.log('\n🧪 Testando busca específica (como no proxy-server):');
      
      const testTypes = ['leve', 'media', 'grave', 'gravissima'];
      
      for (const testType of testTypes) {
        console.log(`\n   Testando tipo: ${testType}`);
        
        const { data: result, error: testError } = await supabase
          .from('multa_types')
          .select('*')
          .eq('type', testType)
          .eq('active', true);
        
        if (testError) {
          console.log(`   ❌ Erro: ${testError.message}`);
        } else {
          console.log(`   📊 Resultados encontrados: ${result?.length || 0}`);
          if (result && result.length > 0) {
            result.forEach((type, index) => {
              console.log(`      ${index + 1}. ${type.name} (Service: ${type.service_id})`);
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkMultaTypes();