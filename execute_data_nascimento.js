// Script para executar o SQL que adiciona a coluna data_nascimento
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Configuração do dotenv
dotenv.config();

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
      // Se falhar com RPC, tentar método alternativo
      console.log('⚠️ Erro ao usar RPC, tentando método alternativo...');
      console.error('Erro RPC:', error.message);
      
      // Método alternativo: usar a API REST do Supabase para executar SQL
      const { error: sqlError } = await supabase
        .from('_exec_sql')
        .insert({ query: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;' });
      
      if (sqlError) {
        throw sqlError;
      } else {
        console.log('✅ Coluna data_nascimento adicionada com sucesso (método alternativo)!');
      }
    } else {
      console.log('✅ Coluna data_nascimento adicionada com sucesso!');
    }
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna data_nascimento:', error);
  }
}

addDataNascimentoColumn()
  .then(() => {
    console.log('🏁 Processo concluído');
  })
  .catch(err => {
    console.error('❌ Erro inesperado:', err);
  });