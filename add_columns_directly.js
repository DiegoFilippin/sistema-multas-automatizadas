import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addColumnsDirectly() {
  try {
    console.log('🚀 Adicionando colunas diretamente via SQL...');
    
    // Lista de comandos SQL para executar
    const sqlCommands = [
      'ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS qr_code_image TEXT;',
      'ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS pix_payload TEXT;',
      'ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS invoice_url TEXT;',
      'ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);',
      'ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255);',
      'ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20);',
      'ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS date_created DATE;',
      'ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS due_date DATE;',
      'ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS payment_description TEXT;',
      'ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS splits_details JSONB;',
      'ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS webhook_response JSONB;'
    ];
    
    // Executar cada comando usando uma query SQL direta
    for (let i = 0; i < sqlCommands.length; i++) {
      const sql = sqlCommands[i];
      console.log(`⚡ Executando (${i + 1}/${sqlCommands.length}): ${sql}`);
      
      try {
        // Usar uma query SQL direta através do REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql })
        });
        
        if (response.ok) {
          console.log(`✅ Comando ${i + 1} executado com sucesso`);
        } else {
          const error = await response.text();
          console.log(`⚠️ Comando ${i + 1} falhou (pode já existir):`, error.substring(0, 100));
        }
      } catch (err) {
        console.log(`⚠️ Erro no comando ${i + 1}:`, err.message);
      }
    }
    
    // Tentar uma abordagem alternativa usando uma função personalizada
    console.log('\n🔄 Tentando abordagem alternativa...');
    
    // Criar uma função SQL que adiciona as colunas
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION add_webhook_columns()
      RETURNS void AS $$
      BEGIN
        -- Adicionar colunas se não existirem
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'qr_code_image') THEN
          ALTER TABLE service_orders ADD COLUMN qr_code_image TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'pix_payload') THEN
          ALTER TABLE service_orders ADD COLUMN pix_payload TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'invoice_url') THEN
          ALTER TABLE service_orders ADD COLUMN invoice_url TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'invoice_number') THEN
          ALTER TABLE service_orders ADD COLUMN invoice_number VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'external_reference') THEN
          ALTER TABLE service_orders ADD COLUMN external_reference VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'billing_type') THEN
          ALTER TABLE service_orders ADD COLUMN billing_type VARCHAR(20);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'date_created') THEN
          ALTER TABLE service_orders ADD COLUMN date_created DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'due_date') THEN
          ALTER TABLE service_orders ADD COLUMN due_date DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'payment_description') THEN
          ALTER TABLE service_orders ADD COLUMN payment_description TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'splits_details') THEN
          ALTER TABLE service_orders ADD COLUMN splits_details JSONB;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_orders' AND column_name = 'webhook_response') THEN
          ALTER TABLE service_orders ADD COLUMN webhook_response JSONB;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
      if (error) {
        console.log('⚠️ Erro ao criar função:', error.message);
      } else {
        console.log('✅ Função criada, executando...');
        
        // Executar a função
        const { data: execData, error: execError } = await supabase.rpc('add_webhook_columns');
        if (execError) {
          console.log('⚠️ Erro ao executar função:', execError.message);
        } else {
          console.log('✅ Função executada com sucesso!');
        }
      }
    } catch (err) {
      console.log('⚠️ Abordagem alternativa falhou:', err.message);
    }
    
    console.log('\n🎉 Processo concluído!');
    console.log('📝 Se as colunas não foram criadas, você pode adicioná-las manualmente no Supabase Dashboard:');
    console.log('🔗 https://supabase.com/dashboard/project/ktgynzdzvfcpvbdbtplu/editor');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

addColumnsDirectly();