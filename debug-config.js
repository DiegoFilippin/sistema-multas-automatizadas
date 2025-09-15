// Debug da configuração do Asaas - versão simplificada
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugConfig() {
  try {
    console.log('🔍 Verificando configuração do Asaas...');
    
    const { data, error } = await supabase
      .from('asaas_config')
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Erro ao buscar configuração:', error);
      return;
    }
    
    console.log('📋 Configuração encontrada:');
    console.log('- ID:', data.id);
    console.log('- Environment:', data.environment);
    console.log('- API Key Sandbox:', data.api_key_sandbox ? 'PRESENTE' : 'AUSENTE');
    console.log('- API Key Production:', data.api_key_production ? 'PRESENTE' : 'AUSENTE');
    
    if (data.api_key_sandbox) {
      console.log('- Sandbox Key (10 chars):', data.api_key_sandbox.substring(0, 10) + '...');
    }
    
    if (data.api_key_production) {
      console.log('- Production Key (10 chars):', data.api_key_production.substring(0, 10) + '...');
    }
    
    // Simular o que o subaccountService faz
    const apiKey = data.environment === 'production'
      ? data.api_key_production
      : data.api_key_sandbox;
      
    console.log('\n🔑 Chave que seria usada:', apiKey ? apiKey.substring(0, 10) + '...' : 'NENHUMA');
    
    if (!apiKey) {
      console.log('❌ PROBLEMA: Nenhuma chave API disponível para o ambiente', data.environment);
    } else {
      console.log('✅ Chave API disponível para o ambiente', data.environment);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

debugConfig();