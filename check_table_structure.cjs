// Script para verificar a estrutura da tabela clients
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  try {
    // Buscar um cliente para ver a estrutura
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Erro ao buscar clientes:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Estrutura da tabela clients:');
      console.log(Object.keys(data[0]));
      console.log('\nDados do primeiro cliente:');
      console.log(data[0]);
    } else {
      console.log('Nenhum cliente encontrado');
    }
  } catch (error) {
    console.error('Erro inesperado:', error);
  }
}

checkTableStructure();