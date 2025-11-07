const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Credenciais do Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addDataNascimentoColumn() {
  try {
    console.log('Adicionando coluna data_nascimento na tabela clients...');
    
    // Executar a migração SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS data_nascimento DATE;
        
        CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);
      `
    });

    if (error) {
      console.error('Erro ao executar migração:', error);
      
      // Tentar método alternativo usando query direta
      console.log('Tentando método alternativo...');
      
      const { error: altError } = await supabase
        .from('clients')
        .select('data_nascimento')
        .limit(1);
        
      if (altError && altError.message.includes('column "data_nascimento" does not exist')) {
        console.log('Coluna data_nascimento não existe. Será necessário adicionar manualmente no painel do Supabase.');
        console.log('SQL para executar no SQL Editor do Supabase:');
        console.log('ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;');
        console.log('CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);');
      } else {
        console.log('Coluna data_nascimento já existe ou outro erro:', altError);
      }
    } else {
      console.log('Migração executada com sucesso!');
    }
    
  } catch (err) {
    console.error('Erro inesperado:', err);
  }
}

addDataNascimentoColumn();