// Script para adicionar a coluna data_nascimento e testar a atualização
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

async function addColumnAndTest() {
  try {
    console.log('Adicionando coluna data_nascimento à tabela clients...');
    
    // Executar SQL para adicionar a coluna
    const { error: sqlError } = await supabase.rpc('execute_sql', {
      sql_query: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;'
    });
    
    if (sqlError) {
      console.error('Erro ao adicionar coluna:', sqlError);
      
      // Tentar método alternativo se o RPC falhar
      console.log('Tentando método alternativo...');
      const { error: altError } = await supabase.from('_exec_sql').select('*').eq('query', 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;');
      
      if (altError) {
        console.error('Erro no método alternativo:', altError);
        return;
      }
    }
    
    console.log('Coluna adicionada com sucesso ou já existente!');
    
    // Buscar um cliente para teste
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('id, nome')
      .limit(1);
    
    if (clientError) {
      console.error('Erro ao buscar cliente:', clientError);
      return;
    }
    
    if (!clients || clients.length === 0) {
      console.log('Nenhum cliente encontrado para teste');
      return;
    }
    
    const clientId = clients[0].id;
    console.log(`Testando atualização para o cliente ${clients[0].nome} (ID: ${clientId})...`);
    
    // Atualizar a data de nascimento
    const { data: updateData, error: updateError } = await supabase
      .from('clients')
      .update({ data_nascimento: '1990-01-01' })
      .eq('id', clientId)
      .select();
    
    if (updateError) {
      console.error('Erro ao atualizar data de nascimento:', updateError);
      return;
    }
    
    console.log('Cliente atualizado com sucesso:', updateData);
    
    // Verificar se a atualização foi bem-sucedida
    const { data: verifyData, error: verifyError } = await supabase
      .from('clients')
      .select('id, nome, data_nascimento')
      .eq('id', clientId)
      .single();
    
    if (verifyError) {
      console.error('Erro ao verificar atualização:', verifyError);
      return;
    }
    
    console.log('Verificação da atualização:');
    console.log(verifyData);
    
    console.log('\nPróximos passos:');
    console.log('1. Verifique se a coluna data_nascimento foi adicionada com sucesso');
    console.log('2. Atualize o código da aplicação para usar a nova coluna');
    console.log('3. Teste a funcionalidade na interface do usuário');
    
  } catch (error) {
    console.error('Erro inesperado:', error);
  }
}

addColumnAndTest();