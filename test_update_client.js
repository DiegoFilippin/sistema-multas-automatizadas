// Script para testar a atualização de um cliente no Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configurar dotenv
dotenv.config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ID do cliente a ser atualizado (substitua pelo ID real)
const clientId = process.argv[2];

if (!clientId) {
  console.error('Erro: Forneça o ID do cliente como argumento');
  console.log('Uso: node test_update_client.js CLIENT_ID');
  process.exit(1);
}

async function testUpdateClient() {
  try {
    console.log(`Atualizando cliente com ID: ${clientId}`);
    
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

testUpdateClient();