import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSubaccountsTables() {
  console.log('🔧 Iniciando correção das tabelas de subcontas...');
  
  try {
    // 1. Verificar se a tabela companies existe
    console.log('📋 Verificando tabela companies...');
    const { data: companiesCheck, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    if (companiesError) {
      console.error('❌ Erro ao verificar tabela companies:', companiesError.message);
      return;
    }
    console.log('✅ Tabela companies existe');
    
    // 2. Verificar se a tabela asaas_subaccounts existe
    console.log('📋 Verificando tabela asaas_subaccounts...');
    const { data: subaccountsCheck, error: subaccountsError } = await supabase
      .from('asaas_subaccounts')
      .select('id')
      .limit(1);
    
    if (subaccountsError && subaccountsError.code === 'PGRST106') {
      console.log('⚠️  Tabela asaas_subaccounts não existe - isso é esperado se as migrações não foram aplicadas');
    } else if (subaccountsError) {
      console.error('❌ Erro ao verificar tabela asaas_subaccounts:', subaccountsError.message);
    } else {
      console.log('✅ Tabela asaas_subaccounts existe');
    }
    
    // 3. Verificar se a tabela split_configurations existe
    console.log('📋 Verificando tabela split_configurations...');
    const { data: splitCheck, error: splitError } = await supabase
      .from('split_configurations')
      .select('id')
      .limit(1);
    
    if (splitError && splitError.code === 'PGRST106') {
      console.log('⚠️  Tabela split_configurations não existe - isso é esperado se as migrações não foram aplicadas');
    } else if (splitError) {
      console.error('❌ Erro ao verificar tabela split_configurations:', splitError.message);
    } else {
      console.log('✅ Tabela split_configurations existe');
    }
    
    // 4. Tentar inserir configurações padrão de split se a tabela existir
    if (!splitError) {
      console.log('📋 Verificando configurações padrão de split...');
      const { data: existingConfigs } = await supabase
        .from('split_configurations')
        .select('service_type');
      
      const existingTypes = existingConfigs?.map(c => c.service_type) || [];
      
      if (!existingTypes.includes('recurso')) {
        const { error: insertRecursoError } = await supabase
          .from('split_configurations')
          .insert({
            service_type: 'recurso',
            acsm_percentage: 30.00,
            icetran_percentage: 20.00,
            despachante_percentage: 50.00
          });
        
        if (insertRecursoError) {
          console.error('❌ Erro ao inserir config recurso:', insertRecursoError.message);
        } else {
          console.log('✅ Configuração de split para recurso inserida');
        }
      } else {
        console.log('✅ Configuração de split para recurso já existe');
      }
      
      if (!existingTypes.includes('assinatura_acompanhamento')) {
        const { error: insertAssinaturaError } = await supabase
          .from('split_configurations')
          .insert({
            service_type: 'assinatura_acompanhamento',
            acsm_percentage: 40.00,
            icetran_percentage: 15.00,
            despachante_percentage: 45.00
          });
        
        if (insertAssinaturaError) {
          console.error('❌ Erro ao inserir config assinatura:', insertAssinaturaError.message);
        } else {
          console.log('✅ Configuração de split para assinatura inserida');
        }
      } else {
        console.log('✅ Configuração de split para assinatura já existe');
      }
    }
    
    console.log('\n📊 RESUMO DO STATUS:');
    console.log('- Tabela companies:', companiesError ? '❌ ERRO' : '✅ OK');
    console.log('- Tabela asaas_subaccounts:', subaccountsError ? (subaccountsError.code === 'PGRST106' ? '⚠️  NÃO EXISTE' : '❌ ERRO') : '✅ OK');
    console.log('- Tabela split_configurations:', splitError ? (splitError.code === 'PGRST106' ? '⚠️  NÃO EXISTE' : '❌ ERRO') : '✅ OK');
    
    if (subaccountsError?.code === 'PGRST106' || splitError?.code === 'PGRST106') {
      console.log('\n💡 SOLUÇÃO: As tabelas não existem. Você precisa aplicar a migração:');
      console.log('   supabase/migrations/20241222_create_subaccounts_split_system.sql');
      console.log('   Ou executar o SQL diretamente no painel do Supabase.');
    }
    
    console.log('\n🎉 Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
fixSubaccountsTables().then(() => {
  console.log('🏁 Script finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});