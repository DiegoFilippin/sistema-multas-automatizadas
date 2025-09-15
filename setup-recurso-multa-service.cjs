const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase com service_role para permissões administrativas
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupRecursoMultaService() {
  console.log('🚀 Configurando serviço de Recurso de Multa...');
  
  try {
    // 1. Criar o serviço principal
    console.log('\n📝 Criando serviço "Recurso de Multa"...');
    
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert({
        name: 'Recurso de Multa',
        description: 'Serviço de recurso de multas com cobrança por tipificação',
        category: 'recurso_multa',
        pricing_type: 'fixed',
        is_active: true
      })
      .select()
      .single();
    
    if (serviceError) {
      console.error('❌ Erro ao criar serviço:', serviceError);
      return;
    }
    
    console.log('✅ Serviço criado com sucesso!');
    console.log('   ID:', service.id);
    console.log('   Nome:', service.name);
    
    // 2. Criar os tipos de multa
    console.log('\n📊 Criando tipos de multa...');
    
    const multaTypes = [
      {
        service_id: service.id,
        type: 'leve',
        name: 'Multa Leve',
        description: 'Infrações de natureza leve',
        acsm_value: 8.00,
        icetran_value: 8.00,
        fixed_value: 3.50,
        active: true
      },
      {
        service_id: service.id,
        type: 'media',
        name: 'Multa Média',
        description: 'Infrações de natureza média',
        acsm_value: 15.00,
        icetran_value: 15.00,
        fixed_value: 3.50,
        active: true
      },
      {
        service_id: service.id,
        type: 'grave',
        name: 'Multa Grave',
        description: 'Infrações de natureza grave',
        acsm_value: 25.00,
        icetran_value: 25.00,
        fixed_value: 3.50,
        active: true
      },
      {
        service_id: service.id,
        type: 'gravissima',
        name: 'Multa Gravíssima',
        description: 'Infrações de natureza gravíssima',
        acsm_value: 40.00,
        icetran_value: 40.00,
        fixed_value: 3.50,
        active: true
      }
    ];
    
    for (const multaType of multaTypes) {
      console.log(`   Criando tipo: ${multaType.name}...`);
      
      const { data: createdType, error: typeError } = await supabase
        .from('multa_types')
        .insert(multaType)
        .select()
        .single();
      
      if (typeError) {
        console.error(`   ❌ Erro ao criar tipo ${multaType.name}:`, typeError);
      } else {
        console.log(`   ✅ ${createdType.name} criado - Custo total: R$ ${createdType.acsm_value + createdType.icetran_value + createdType.fixed_value}`);
        console.log(`      ACSM: R$ ${createdType.acsm_value}, ICETRAN: R$ ${createdType.icetran_value}, Taxa: R$ ${createdType.fixed_value}`);
      }
    }
    
    // 3. Verificar configuração final
    console.log('\n🔍 Verificando configuração final...');
    
    const { data: finalService, error: finalError } = await supabase
      .from('services')
      .select(`
        *,
        multa_types(*)
      `)
      .eq('id', service.id)
      .single();
    
    if (finalError) {
      console.error('❌ Erro ao verificar configuração:', finalError);
    } else {
      console.log('\n✅ Configuração completa!');
      console.log(`📋 Serviço: ${finalService.name}`);
      console.log(`📊 Tipos de multa: ${finalService.multa_types?.length || 0}`);
      
      if (finalService.multa_types && finalService.multa_types.length > 0) {
        console.log('\n💰 Resumo dos custos:');
        finalService.multa_types.forEach(type => {
          const total = type.acsm_value + type.icetran_value + type.fixed_value;
          console.log(`   ${type.name}: R$ ${total.toFixed(2)} (ACSM: R$ ${type.acsm_value}, ICETRAN: R$ ${type.icetran_value}, Taxa: R$ ${type.fixed_value})`);
        });
      }
    }
    
    console.log('\n🎉 Setup concluído com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. O proxy-server.js agora deve encontrar o serviço "recurso_multa"');
    console.log('   2. Execute o teste novamente para verificar o split');
    console.log('   3. Verifique os logs do proxy server para confirmar os cálculos');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

setupRecursoMultaService();