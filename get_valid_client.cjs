const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getValidClient() {
  try {
    console.log('🔍 Buscando clientes da empresa Diego...');
    
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('company_id', 'c1f4c95f-1f16-4680-b568-aefc43390564')
      .limit(5);
    
    if (error) {
      console.error('❌ Erro ao buscar clientes:', error);
      return;
    }
    
    if (!clients || clients.length === 0) {
      console.log('❌ Nenhum cliente encontrado para a empresa Diego!');
      
      // Buscar qualquer cliente
      console.log('🔍 Buscando qualquer cliente...');
      const { data: anyClients, error: anyError } = await supabase
        .from('clients')
        .select('*')
        .limit(5);
      
      if (anyError || !anyClients || anyClients.length === 0) {
        console.log('❌ Nenhum cliente encontrado no sistema!');
        return;
      }
      
      console.log('✅ Clientes encontrados (qualquer empresa):');
      anyClients.forEach((client, index) => {
        console.log(`${index + 1}. ID: ${client.id}`);
        console.log(`   Nome: ${client.nome}`);
        console.log(`   CPF: ${client.cpf}`);
        console.log(`   Empresa: ${client.company_id}`);
        console.log(`   Asaas Customer ID: ${client.asaas_customer_id}`);
        console.log('   ---');
      });
      
      return anyClients[0];
    }
    
    console.log('✅ Clientes da empresa Diego encontrados:');
    clients.forEach((client, index) => {
      console.log(`${index + 1}. ID: ${client.id}`);
      console.log(`   Nome: ${client.nome}`);
      console.log(`   CPF: ${client.cpf}`);
      console.log(`   Asaas Customer ID: ${client.asaas_customer_id}`);
      console.log('   ---');
    });
    
    // Retornar o primeiro cliente para teste
    const firstClient = clients[0];
    console.log('\n🎯 Usando cliente para teste:');
    console.log(`ID: ${firstClient.id}`);
    console.log(`Nome: ${firstClient.nome}`);
    console.log(`Asaas Customer ID: ${firstClient.asaas_customer_id}`);
    
    return firstClient;
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

getValidClient();