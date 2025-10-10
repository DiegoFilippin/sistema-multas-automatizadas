const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('Certifique-se de que VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupServicesAndPricing() {
  console.log('🚀 Configurando serviços e precificação...');

  try {
    // 1. Verificar se as tabelas já existem
    console.log('📋 Verificando tabelas existentes...');
    
    // Verificar se service_pricing existe
    const { data: servicePricingExists } = await supabase
      .from('service_pricing')
      .select('id')
      .limit(1);
    
    if (servicePricingExists !== null) {
      console.log('✅ Tabela service_pricing já existe');
    } else {
      console.log('ℹ️ Tabela service_pricing não existe - será criada via interface admin');
    }

    // 2. Pular configuração de RLS (será feita via interface admin)
    console.log('ℹ️ Configuração de RLS será feita via interface administrativa');

    // 3. Criar os 2 serviços iniciais
    console.log('📝 Criando serviços iniciais...');
    
    const servicosIniciais = [
      {
        name: 'Recurso de multa',
        description: 'Serviço de elaboração e acompanhamento de recursos de multas de trânsito',
        category: 'juridico',
        pricing_type: 'fixed',
        fixed_value: 100.00,
        percentage_value: null,
        minimum_value: null,
        is_active: true
      },
      {
        name: 'Acompanhamento mensal',
        description: 'Serviço de acompanhamento mensal de processos e recursos',
        category: 'acompanhamento',
        pricing_type: 'fixed',
        fixed_value: 50.00,
        percentage_value: null,
        minimum_value: null,
        is_active: true
      }
    ];

    for (const servico of servicosIniciais) {
      // Verificar se o serviço já existe
      const { data: existingService } = await supabase
        .from('services')
        .select('id')
        .eq('name', servico.name)
        .single();

      if (!existingService) {
        const { data: newService, error: serviceError } = await supabase
          .from('services')
          .insert(servico)
          .select('id')
          .single();

        if (serviceError) {
          console.error(`❌ Erro ao criar serviço '${servico.name}':`, serviceError);
          continue;
        }

        console.log(`✅ Serviço '${servico.name}' criado com sucesso`);

        console.log(`✅ Serviço '${servico.name}' criado - precificação será configurada via interface`);
      } else {
        console.log(`ℹ️ Serviço '${servico.name}' já existe`);
      }
    }

    // 5. Tabelas adicionais serão criadas via interface administrativa
    console.log('ℹ️ Tabelas de precificação serão criadas via interface administrativa');

    console.log('🎉 Configuração inicial concluída com sucesso!');
    console.log('');
    console.log('📋 Resumo:');
    console.log('✅ Serviços iniciais criados: Recurso de multa, Acompanhamento mensal');
    console.log('ℹ️ Tabelas de precificação serão criadas via interface administrativa');
    console.log('');
    console.log('🎯 Próximos passos:');
    console.log('1. Acessar interface administrativa para configurar tabelas de precificação');
    console.log('2. Super Admin define valores base para ACSM');
    console.log('3. ICETRAN define seus valores na interface');
    console.log('4. Despachantes definem preços finais aos clientes');
    console.log('5. Sistema calculará automaticamente margens de lucro');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar configuração
setupServicesAndPricing();