const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase com service_role para ver todos os dados
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

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
    
    console.log(`\n📋 Total de serviços encontrados: ${services?.length || 0}`);
    
    if (services && services.length > 0) {
      console.log('\n📝 Lista de serviços:');
      services.forEach((service, index) => {
        console.log(`\n${index + 1}. ${service.name}`);
        console.log(`   ID: ${service.id}`);
        console.log(`   Categoria: ${service.category}`);
        console.log(`   Ativo: ${service.is_active}`);
        console.log(`   Tipo de preço: ${service.pricing_type}`);
        console.log(`   Descrição: ${service.description}`);
      });
      
      // Verificar especificamente o serviço de recurso de multa
      const recursoMultaService = services.find(s => 
        s.name === 'Recurso de Multa' || 
        s.category === 'recurso_multa' ||
        s.category === 'Recursos'
      );
      
      if (recursoMultaService) {
        console.log('\n✅ Serviço de Recurso de Multa encontrado:');
        console.log('   Nome:', recursoMultaService.name);
        console.log('   Categoria:', recursoMultaService.category);
        console.log('   Ativo:', recursoMultaService.is_active);
        console.log('   ID:', recursoMultaService.id);
        
        // Verificar tipos de multa associados
        const { data: multaTypes, error: multaError } = await supabase
          .from('multa_types')
          .select('*')
          .eq('service_id', recursoMultaService.id);
        
        if (multaError) {
          console.error('❌ Erro ao buscar tipos de multa:', multaError);
        } else {
          console.log(`\n📊 Tipos de multa associados: ${multaTypes?.length || 0}`);
          if (multaTypes && multaTypes.length > 0) {
            multaTypes.forEach(type => {
              console.log(`   - ${type.type}: ${type.name} (ACSM: R$ ${type.acsm_value}, ICETRAN: R$ ${type.icetran_value})`);
            });
          }
        }
      } else {
        console.log('\n❌ Serviço de Recurso de Multa NÃO encontrado!');
        console.log('\n💡 Será necessário criar o serviço ou ajustar a busca no proxy-server.js');
      }
    } else {
      console.log('\n❌ Nenhum serviço encontrado na tabela services!');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkServices();