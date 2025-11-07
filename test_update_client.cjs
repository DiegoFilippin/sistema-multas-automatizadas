// Script para testar a atualização de um cliente no Supabase
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

// Função para listar clientes e escolher um para teste
async function listClients() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, nome, cpf_cnpj, data_nascimento')
      .limit(10);
    
    if (error) {
      console.error('Erro ao buscar clientes:', error);
      return;
    }
    
    console.log('Clientes disponíveis:');
    data.forEach((cliente, index) => {
      console.log(`${index + 1}. ID: ${cliente.id}, Nome: ${cliente.nome}, CPF: ${cliente.cpf_cnpj}, Data Nascimento: ${cliente.data_nascimento || 'Não definida'}`);
    });
    
    // Escolher o primeiro cliente para teste
    if (data.length > 0) {
      return data[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Erro inesperado:', error);
    return null;
  }
}

async function testUpdateClient(clientId) {
  try {
    console.log(`\nAtualizando cliente com ID: ${clientId}`);
    
    // Data de nascimento de teste
    const dataNascimento = '1990-01-01';
    
    // Buscar cliente atual para verificar
    const { data: clienteAtual, error: errorBusca } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    
    if (errorBusca) {
      console.error('Erro ao buscar cliente:', errorBusca);
      return;
    }
    
    console.log('Cliente atual:', clienteAtual);
    console.log('Data de nascimento atual:', clienteAtual.data_nascimento);
    
    // Atualizar cliente
    const { data, error } = await supabase
      .from('clients')
      .update({ data_nascimento: dataNascimento })
      .eq('id', clientId)
      .select();
    
    if (error) {
      console.error('Erro ao atualizar cliente:', error);
      return;
    }
    
    console.log('Cliente atualizado com sucesso:', data);
    
    // Verificar se a atualização foi bem-sucedida
    const { data: clienteAtualizado, error: errorVerificacao } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    
    if (errorVerificacao) {
      console.error('Erro ao verificar cliente atualizado:', errorVerificacao);
      return;
    }
    
    console.log('Cliente após atualização:', clienteAtualizado);
    console.log('Data de nascimento após atualização:', clienteAtualizado.data_nascimento);
  } catch (error) {
    console.error('Erro inesperado:', error);
  }
}

// Executar o teste
async function main() {
  const clientId = await listClients();
  if (clientId) {
    await testUpdateClient(clientId);
  } else {
    console.log('Nenhum cliente encontrado para teste.');
  }
}

main();