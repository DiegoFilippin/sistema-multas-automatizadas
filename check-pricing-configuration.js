import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPricingConfiguration() {
  try {
    console.log('🔍 VERIFICANDO CONFIGURAÇÕES DE PREÇOS');
    console.log('=====================================\n');
    
    // 1. Verificar serviços
    console.log('📋 1. SERVIÇOS CADASTRADOS:');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .order('created_at');
    
    if (servicesError) {
      console.error('❌ Erro ao buscar serviços:', servicesError);
    } else {
      console.log(`   Total: ${services?.length || 0} serviços`);
      services?.forEach((service, index) => {
        console.log(`   ${index + 1}. ID: ${service.id}`);
        console.log(`      Nome: ${service.name}`);
        console.log(`      Categoria: ${service.category}`);
        console.log(`      Ativo: ${service.is_active}`);
        console.log(`      Criado: ${service.created_at}`);
        console.log('      ---');
      });
    }
    
    // 2. Verificar tipos de multa
    console.log('\n🏷️ 2. TIPOS DE MULTA:');
    const { data: multaTypes, error: multaError } = await supabase
      .from('multa_types')
      .select('*')
      .order('type');
    
    if (multaError) {
      console.error('❌ Erro ao buscar tipos de multa:', multaError);
    } else {
      console.log(`   Total: ${multaTypes?.length || 0} tipos`);
      multaTypes?.forEach((type, index) => {
        console.log(`   ${index + 1}. Tipo: ${type.type}`);
        console.log(`      Nome: ${type.name}`);
        console.log(`      ACSM: R$ ${type.acsm_value}`);
        console.log(`      ICETRAN: R$ ${type.icetran_value}`);
        console.log(`      Taxa fixa: R$ ${type.fixed_value}`);
        console.log(`      Custo total: R$ ${type.total_price}`);
        console.log(`      Preço sugerido: R$ ${type.suggested_price || 'NÃO DEFINIDO'}`);
        console.log(`      Ativo: ${type.active}`);
        console.log('      ---');
      });
    }
    
    // 3. Verificar preços por despachante
    console.log('\n👨‍💼 3. PREÇOS POR DESPACHANTE:');
    const { data: despachantesPricing, error: despachantesError } = await supabase
      .from('despachante_service_pricing')
      .select(`
        *,
        despachante:users(id, nome, email),
        service:services(id, name)
      `);
    
    if (despachantesError) {
      console.error('❌ Erro ao buscar preços de despachantes:', despachantesError);
    } else {
      console.log(`   Total: ${despachantesPricing?.length || 0} configurações`);
      despachantesPricing?.forEach((pricing, index) => {
        console.log(`   ${index + 1}. Despachante: ${pricing.despachante?.nome || 'N/A'}`);
        console.log(`      Serviço: ${pricing.service?.name || 'N/A'}`);
        console.log(`      Preço cliente: R$ ${pricing.client_price || 'NÃO DEFINIDO'}`);
        console.log(`      Criado: ${pricing.created_at}`);
        console.log('      ---');
      });
    }
    
    // 4. Verificar configurações de split
    console.log('\n💰 4. CONFIGURAÇÕES DE SPLIT:');
    const { data: splitConfigs, error: splitError } = await supabase
      .from('split_configurations')
      .select('*');
    
    if (splitError) {
      console.error('❌ Erro ao buscar configurações de split:', splitError);
    } else {
      console.log(`   Total: ${splitConfigs?.length || 0} configurações`);
      splitConfigs?.forEach((config, index) => {
        console.log(`   ${index + 1}. Tipo de serviço: ${config.service_type}`);
        console.log(`      ACSM: ${config.acsm_percentage}%`);
        console.log(`      ICETRAN: ${config.icetran_percentage}%`);
        console.log(`      Despachante: ${config.despachante_percentage}%`);
        console.log(`      Ativo: ${config.is_active}`);
        console.log('      ---');
      });
    }
    
    // 5. Verificar usuário atual (se possível)
    console.log('\n👤 5. INFORMAÇÕES DO USUÁRIO:');
    console.log('   (Verificar no frontend qual usuário está logado)');
    
    // 6. Diagnóstico
    console.log('\n🔧 6. DIAGNÓSTICO:');
    
    if (!multaTypes || multaTypes.length === 0) {
      console.log('   ❌ PROBLEMA: Nenhum tipo de multa encontrado');
      console.log('   💡 SOLUÇÃO: Executar setup de tipos de multa');
    } else {
      const typesWithoutSuggestedPrice = multaTypes.filter(t => !t.suggested_price || t.suggested_price === 0);
      if (typesWithoutSuggestedPrice.length > 0) {
        console.log('   ❌ PROBLEMA: Tipos sem preço sugerido:');
        typesWithoutSuggestedPrice.forEach(t => {
          console.log(`      - ${t.type}: ${t.name}`);
        });
        console.log('   💡 SOLUÇÃO: Adicionar preços sugeridos aos tipos');
      } else {
        console.log('   ✅ Todos os tipos têm preços sugeridos');
      }
    }
    
    if (!despachantesPricing || despachantesPricing.length === 0) {
      console.log('   ⚠️ AVISO: Nenhuma configuração de preço por despachante');
      console.log('   💡 SUGESTÃO: Verificar se o usuário tem preços personalizados');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkPricingConfiguration();