const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testValuesSync() {
  console.log('🧪 === TESTE DE SINCRONIZAÇÃO DE VALORES ===\n');
  
  try {
    // 1. Buscar um serviço específico para testar
    console.log('📋 1. BUSCANDO SERVIÇO PARA TESTE:');
    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('name', 'Recurso de Multa - Média')
      .single();
    
    if (error) {
      console.error('❌ Erro ao buscar serviço:', error);
      return;
    }
    
    console.log('✅ Serviço encontrado:', service.name);
    console.log('   - ACSM Value: R$', service.acsm_value);
    console.log('   - ICETRAN Value: R$', service.icetran_value);
    console.log('   - Taxa Cobrança: R$', service.taxa_cobranca);
    console.log('   - Suggested Price: R$', service.suggested_price);
    console.log('   - Base Price: R$', service.base_price);
    
    // 2. Simular como MeusServicos.tsx converte para MultaType
    console.log('\n🔄 2. CONVERSÃO PARA MULTATYPE (como MeusServicos faz):');
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
    
    console.log('   MultaType convertido:');
    console.log('   - Suggested Price: R$', multaType.suggested_price);
    console.log('   - Total Price (custo): R$', multaType.total_price);
    console.log('   - ACSM Value: R$', multaType.acsm_value);
    console.log('   - ICETRAN Value: R$', multaType.icetran_value);
    
    // 3. Simular seleção do tipo (handleSelectMultaType)
    console.log('\n🎯 3. SIMULANDO SELEÇÃO DO TIPO:');
    const splitConfigFromService = {
      acsm_value: multaType.acsm_value || 6.00,
      icetran_value: multaType.icetran_value || 6.00,
      taxa_cobranca: 3.50
    };
    
    const custoMinimoReal = splitConfigFromService.acsm_value + splitConfigFromService.icetran_value + splitConfigFromService.taxa_cobranca;
    const valorInicial = Math.max(custoMinimoReal, multaType.suggested_price || 0);
    
    console.log('   Configuração de splits aplicada:');
    console.log('   - ACSM: R$', splitConfigFromService.acsm_value);
    console.log('   - ICETRAN: R$', splitConfigFromService.icetran_value);
    console.log('   - Taxa: R$', splitConfigFromService.taxa_cobranca);
    console.log('   - Custo Mínimo: R$', custoMinimoReal);
    console.log('   - Valor Inicial: R$', valorInicial);
    
    // 4. Calcular margem
    console.log('\n💰 4. CÁLCULO DE MARGEM:');
    const margem = Math.max(0, valorInicial - custoMinimoReal);
    const percentualMargem = custoMinimoReal > 0 ? ((valorInicial - custoMinimoReal) / custoMinimoReal) * 100 : 0;
    
    console.log('   - Valor da Cobrança: R$', valorInicial);
    console.log('   - Custo Total: R$', custoMinimoReal);
    console.log('   - Margem Despachante: R$', margem);
    console.log('   - Percentual Margem:', percentualMargem.toFixed(1) + '%');
    
    // 5. Verificar consistência
    console.log('\n✅ 5. VERIFICAÇÃO DE CONSISTÊNCIA:');
    
    const valoresConsistentes = {
      acsm_edicao: service.acsm_value,
      acsm_escolha: splitConfigFromService.acsm_value,
      icetran_edicao: service.icetran_value,
      icetran_escolha: splitConfigFromService.icetran_value,
      sugerido_edicao: service.suggested_price,
      sugerido_escolha: multaType.suggested_price
    };
    
    console.log('   Comparação Edição vs Escolha:');
    console.log('   - ACSM:', valoresConsistentes.acsm_edicao, 'vs', valoresConsistentes.acsm_escolha, 
                valoresConsistentes.acsm_edicao === valoresConsistentes.acsm_escolha ? '✅' : '❌');
    console.log('   - ICETRAN:', valoresConsistentes.icetran_edicao, 'vs', valoresConsistentes.icetran_escolha,
                valoresConsistentes.icetran_edicao === valoresConsistentes.icetran_escolha ? '✅' : '❌');
    console.log('   - Sugerido:', valoresConsistentes.sugerido_edicao, 'vs', valoresConsistentes.sugerido_escolha,
                valoresConsistentes.sugerido_edicao === valoresConsistentes.sugerido_escolha ? '✅' : '❌');
    
    const todosConsistentes = 
      valoresConsistentes.acsm_edicao === valoresConsistentes.acsm_escolha &&
      valoresConsistentes.icetran_edicao === valoresConsistentes.icetran_escolha &&
      valoresConsistentes.sugerido_edicao === valoresConsistentes.sugerido_escolha;
    
    console.log('\n🎯 RESULTADO FINAL:', todosConsistentes ? '✅ VALORES CONSISTENTES' : '❌ VALORES INCONSISTENTES');
    
    if (!todosConsistentes) {
      console.log('\n⚠️  AÇÕES NECESSÁRIAS:');
      console.log('   1. Verificar se a função loadServiceSplitConfig está usando os valores corretos');
      console.log('   2. Verificar se handleSelectMultaType está aplicando os valores do serviço selecionado');
      console.log('   3. Verificar se há cache ou estado desatualizado');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testValuesSync();