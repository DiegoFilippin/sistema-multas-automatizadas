const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addDataNascimentoColumn() {
  try {
    console.log('Conectando ao Supabase...');
    
    // Primeiro, vamos verificar se a coluna já existe
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'clients')
      .eq('column_name', 'data_nascimento');

    if (checkError) {
      console.log('Erro ao verificar coluna (esperado):', checkError.message);
    }

    // Executar SQL usando RPC (se disponível) ou método alternativo
    console.log('Tentando adicionar coluna data_nascimento...');
    
    // Método 1: Tentar usar uma função SQL personalizada
    const sqlCommand = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'clients' AND column_name = 'data_nascimento'
        ) THEN
          ALTER TABLE clients ADD COLUMN data_nascimento DATE;
          CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);
          RAISE NOTICE 'Coluna data_nascimento adicionada com sucesso!';
        ELSE
          RAISE NOTICE 'Coluna data_nascimento já existe!';
        END IF;
      END
      $$;
    `;

    // Tentar executar via RPC se houver uma função disponível
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: sqlCommand });
      if (error) throw error;
      console.log('✅ Coluna adicionada com sucesso via RPC!');
      return;
    } catch (rpcError) {
      console.log('RPC não disponível, tentando método alternativo...');
    }

    // Método 2: Tentar inserir um registro de teste para forçar a criação da coluna
    try {
      const { error: insertError } = await supabase
        .from('clients')
        .update({ data_nascimento: '2000-01-01' })
        .eq('id', 'test-id-that-does-not-exist');
      
      if (insertError && insertError.message.includes('column "data_nascimento" of relation "clients" does not exist')) {
        console.log('❌ Confirmado: Coluna data_nascimento não existe');
        console.log('\n🔧 SOLUÇÃO MANUAL NECESSÁRIA:');
        console.log('Execute este SQL no painel do Supabase (SQL Editor):');
        console.log('\nALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;');
        console.log('CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);');
        console.log('\nOu execute esta função mais robusta:');
        console.log(`
CREATE OR REPLACE FUNCTION add_data_nascimento_column()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'data_nascimento'
  ) THEN
    ALTER TABLE clients ADD COLUMN data_nascimento DATE;
    CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);
    RAISE NOTICE 'Coluna data_nascimento adicionada!';
  ELSE
    RAISE NOTICE 'Coluna data_nascimento já existe!';
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT add_data_nascimento_column();
        `);
      } else {
        console.log('✅ Coluna data_nascimento já existe ou foi criada!');
      }
    } catch (testError) {
      console.log('Erro no teste:', testError.message);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

addDataNascimentoColumn();