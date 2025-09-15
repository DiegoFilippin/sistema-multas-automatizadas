const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFinalServiceSync() {
  console.log('🎯 === TESTE FINAL DE SINCRONIZAÇÃO ===\n');
  
  try {
    // 1. Listar todos os serviços ativos
    console.log('📋 Listando serviços ativos...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, acsm_value, icetran_value, taxa_cobranca, suggested_price, is_active, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });
    
    if (servicesError) {
      console.error('❌ Erro ao buscar serviços:', servicesError);
      return;
    }
    
    console.log(`✅ ${services.length} serviços ativos encontrados:\n`);
    
    services.forEach((service, i) => {
      console.log(`${i+1}. ${service.name}`);
      console.log(`   ID: ${service.id}`);
      console.log(`   ACSM: R$ ${service.acsm_value}`);
      console.log(`   ICETRAN: R$ ${service.icetran_value}`);
      console.log(`   Taxa: R$ ${service.taxa_cobranca}`);
      console.log(`   Sugerido: R$ ${service.suggested_price}`);
      console.log(`   Atualizado: ${new Date(service.updated_at).toLocaleString('pt-BR')}`);
      console.log('');
    });
    
    // 2. Fazer uma pequena alteração em um serviço
    if (services.length > 0) {
      const serviceToUpdate = services[0];
      const newValue = (serviceToUpdate.suggested_price || 60) + 0.50;
      
      console.log(`🔄 Fazendo pequena alteração no serviço "${serviceToUpdate.name}"...`);
      console.log(`   Valor atual: R$ ${serviceToUpdate.suggested_price}`);
      console.log(`   Novo valor: R$ ${newValue}`);
      
      const { data: updatedService, error: updateError } = await supabase
        .from('services')
        .update({
          suggested_price: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceToUpdate.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Erro ao atualizar:', updateError);
        return;
      }
      
      console.log('✅ Serviço atualizado com sucesso!');
      console.log(`   Novo valor confirmado: R$ ${updatedService.suggested_price}`);
      console.log(`   Nova data: ${new Date(updatedService.updated_at).toLocaleString('pt-BR')}`);
      console.log('');
    }
    
    // 3. Instruções para o usuário
    console.log('🎯 PRÓXIMOS PASSOS:');
    console.log('1. ✅ Serviços foram atualizados no banco de dados');
    console.log('2. 🌐 Acesse a tela "Meus Serviços" no navegador');
    console.log('3. 🔄 Clique no botão "Atualizar Serviços" (canto superior direito)');
    console.log('4. 👀 Verifique se os novos valores aparecem na interface');
    console.log('5. ⏰ Aguarde até 60 segundos para o refresh automático');
    console.log('');
    console.log('🔍 DIAGNÓSTICO:');
    console.log('- Se os valores NÃO aparecerem após o refresh manual: problema de cache no frontend');
    console.log('- Se os valores aparecerem após refresh manual: sistema funcionando corretamente');
    console.log('- Se houver refresh automático a cada 60s: sistema totalmente funcional');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testFinalServiceSync();