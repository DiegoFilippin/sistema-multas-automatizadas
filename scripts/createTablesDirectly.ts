import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTablesDirectly() {
  console.log('🔧 Criando tabelas diretamente no Supabase...');
  
  try {
    // 1. Criar tabela asaas_subaccounts
    console.log('📋 Criando tabela asaas_subaccounts...');
    
    // Usar uma query SQL direta através do REST API
    const createSubaccountsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        sql: `
          CREATE TABLE IF NOT EXISTS asaas_subaccounts (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
              asaas_account_id VARCHAR(100) NOT NULL UNIQUE,
              wallet_id VARCHAR(100) NOT NULL UNIQUE,
              account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('subadquirente', 'despachante')),
              status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
              api_key VARCHAR(200),
              webhook_url TEXT,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
          );
        `
      })
    });
    
    if (createSubaccountsResponse.ok) {
      console.log('✅ Tabela asaas_subaccounts criada com sucesso!');
    } else {
      const error = await createSubaccountsResponse.text();
      console.error('❌ Erro ao criar tabela asaas_subaccounts:', error);
    }
    
    // 2. Criar tabela split_configurations
    console.log('📋 Criando tabela split_configurations...');
    
    const createSplitResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        sql: `
          CREATE TABLE IF NOT EXISTS split_configurations (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              service_type VARCHAR(50) NOT NULL,
              acsm_percentage DECIMAL(5,2) NOT NULL DEFAULT 30.00,
              icetran_percentage DECIMAL(5,2) NOT NULL DEFAULT 20.00,
              despachante_percentage DECIMAL(5,2) NOT NULL DEFAULT 50.00,
              is_active BOOLEAN DEFAULT true,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now(),
              
              CONSTRAINT check_split_total CHECK (
                  acsm_percentage + icetran_percentage + despachante_percentage = 100.00
              )
          );
        `
      })
    });
    
    if (createSplitResponse.ok) {
      console.log('✅ Tabela split_configurations criada com sucesso!');
    } else {
      const error = await createSplitResponse.text();
      console.error('❌ Erro ao criar tabela split_configurations:', error);
    }
    
    // 3. Inserir dados padrão na tabela split_configurations
    console.log('📋 Inserindo configurações padrão...');
    
    const { error: insertError1 } = await supabase
      .from('split_configurations')
      .upsert({
        service_type: 'recurso',
        acsm_percentage: 30.00,
        icetran_percentage: 20.00,
        despachante_percentage: 50.00
      }, {
        onConflict: 'service_type'
      });
    
    if (insertError1) {
      console.error('❌ Erro ao inserir config recurso:', insertError1.message);
    } else {
      console.log('✅ Configuração de split para recurso inserida');
    }
    
    const { error: insertError2 } = await supabase
      .from('split_configurations')
      .upsert({
        service_type: 'assinatura_acompanhamento',
        acsm_percentage: 40.00,
        icetran_percentage: 15.00,
        despachante_percentage: 45.00
      }, {
        onConflict: 'service_type'
      });
    
    if (insertError2) {
      console.error('❌ Erro ao inserir config assinatura:', insertError2.message);
    } else {
      console.log('✅ Configuração de split para assinatura inserida');
    }
    
    // 4. Verificar se as tabelas foram criadas
    console.log('🔍 Verificando tabelas criadas...');
    
    const { data: subaccountsTest, error: subaccountsTestError } = await supabase
      .from('asaas_subaccounts')
      .select('id')
      .limit(1);
    
    const { data: splitTest, error: splitTestError } = await supabase
      .from('split_configurations')
      .select('*')
      .limit(5);
    
    console.log('\n📊 RESULTADO FINAL:');
    console.log('- Tabela asaas_subaccounts:', subaccountsTestError ? '❌ ERRO' : '✅ OK');
    console.log('- Tabela split_configurations:', splitTestError ? '❌ ERRO' : '✅ OK');
    
    if (splitTest && splitTest.length > 0) {
      console.log('\n📋 Configurações de split criadas:');
      splitTest.forEach(config => {
        console.log(`  - ${config.service_type}: ACSM ${config.acsm_percentage}%, ICETRAN ${config.icetran_percentage}%, Despachante ${config.despachante_percentage}%`);
      });
    }
    
    console.log('\n🎉 Tabelas criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
createTablesDirectly().then(() => {
  console.log('🏁 Script finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});