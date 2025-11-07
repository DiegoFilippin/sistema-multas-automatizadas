// Script para adicionar a coluna data_nascimento à tabela clients
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDataNascimentoColumn() {
  console.log('🔧 Adicionando coluna data_nascimento à tabela clients...');
  
  try {
    // Usando RPC para executar SQL diretamente
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;' 
    });
    
    if (error) {
      console.error('❌ Erro ao adicionar coluna:', error);
    } else {
      console.log('✅ Coluna data_nascimento adicionada com sucesso!');
    }
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna data_nascimento:', error);
  }
}

addDataNascimentoColumn();