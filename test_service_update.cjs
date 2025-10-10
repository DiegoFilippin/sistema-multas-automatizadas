const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testServiceUpdate() {
  console.log('🧪 === TESTE DE ATUALIZAÇÃO DE SERVIÇO ===\n');
  
  try {
    // 1. Buscar um serviço existente
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(1);
    
    if (servicesError || !services || services.length === 0) {
      console.error('❌ Erro ao buscar serviços ou nenhum serviço encontrado');
      return;
    }
    
    const service = services[0];
    console.log('📋 Serviço selecionado para teste:');
    console.log(`   Nome: ${service.name}`);
    console.log(`   ID: ${service.id}`);
    console.log(`   ACSM atual: R$ ${service.acsm_value}`);
    console.log(`   ICETRAN atual: R$ ${service.icetran_value}`);
    console.log(`   Sugerido atual: R$ ${service.suggested_price}`);
    console.log('');
    
    // 2. Fazer uma pequena alteração
    const newSuggestedPrice = (service.suggested_price || 60) + 5;
    const newAcsmValue = (service.acsm_value || 6) + 1;
    
    console.log('🔄 Atualizando serviço...');
    console.log(`   Novo ACSM: R$ ${newAcsmValue}`);
    console.log(`   Novo Sugerido: R$ ${newSuggestedPrice}`);
    
    const { data: updatedService, error: updateError } = await supabase
      .from('services')
      .update({
        acsm_value: newAcsmValue,
        suggested_price: newSuggestedPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', service.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Erro ao atualizar serviço:', updateError);
      return;
    }
    
    console.log('✅ Serviço atualizado com sucesso!');
    console.log(`   ACSM atualizado: R$ ${updatedService.acsm_value}`);
    console.log(`   Sugerido atualizado: R$ ${updatedService.suggested_price}`);
    console.log(`   Data de atualização: ${updatedService.updated_at}`);
    console.log('');
    
    // 3. Verificar se a atualização foi persistida
    console.log('🔍 Verificando persistência da atualização...');
    
    const { data: verifyService, error: verifyError } = await supabase
      .from('services')
      .select('*')
      .eq('id', service.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Erro ao verificar serviço:', verifyError);
      return;
    }
    
    console.log('✅ Verificação concluída:');
    console.log(`   ACSM verificado: R$ ${verifyService.acsm_value}`);
    console.log(`   Sugerido verificado: R$ ${verifyService.suggested_price}`);
    console.log(`   Última atualização: ${verifyService.updated_at}`);
    console.log('');
    
    console.log('🎯 RESULTADO DO TESTE:');
    if (verifyService.acsm_value === newAcsmValue && verifyService.suggested_price === newSuggestedPrice) {
      console.log('✅ SUCESSO: Serviço foi atualizado corretamente no banco!');
      console.log('📱 Agora teste na interface do despachante se os valores aparecem atualizados.');
      console.log('🔄 Use o botão "Atualizar Serviços" se necessário.');
    } else {
      console.log('❌ FALHA: Serviço não foi atualizado corretamente.');
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

testServiceUpdate();