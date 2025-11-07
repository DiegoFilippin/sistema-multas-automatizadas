const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Credenciais do Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addDataNascimentoColumn() {
  try {
    console.log('Conectando ao Supabase...');
    
    // Usar a API REST do Supabase para executar SQL
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Erro ao conectar:', error);
      return;
    }

    console.log('Conexão estabelecida. Tentando adicionar coluna...');

    // Como não podemos executar DDL diretamente via REST API,
    // vamos usar o método de fazer uma requisição HTTP direta
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;'
      })
    });

    if (!response.ok) {
      console.log('Método RPC não disponível. Usando abordagem alternativa...');
      
      // Vamos criar uma função temporária no Supabase para executar o DDL
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION add_data_nascimento_column()
        RETURNS void AS $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'clients' AND column_name = 'data_nascimento'
          ) THEN
            ALTER TABLE clients ADD COLUMN data_nascimento DATE;
            CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `;

      console.log('Instruções para adicionar a coluna manualmente:');
      console.log('1. Acesse o painel do Supabase: https://supabase.com/dashboard');
      console.log('2. Vá para SQL Editor');
      console.log('3. Execute o seguinte SQL:');
      console.log('');
      console.log('ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;');
      console.log('CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);');
      console.log('');
      console.log('Ou execute esta função:');
      console.log(createFunctionSQL);
      console.log('SELECT add_data_nascimento_column();');
      
    } else {
      console.log('Coluna adicionada com sucesso!');
    }
    
  } catch (err) {
    console.error('Erro inesperado:', err);
    console.log('');
    console.log('Para resolver manualmente:');
    console.log('1. Acesse https://supabase.com/dashboard');
    console.log('2. Selecione seu projeto');
    console.log('3. Vá para SQL Editor');
    console.log('4. Execute: ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;');
  }
}

addDataNascimentoColumn();