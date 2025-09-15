// Script para verificar configuração do Asaas no banco
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iqhqjqjqjqjqjqjqjqjq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxaHFqcWpxanFqcWpxanFqcWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU0NTU0NzQsImV4cCI6MjA0MTAzMTQ3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAsaasConfig() {
  try {
    console.log('🔍 Verificando configuração do Asaas no banco...');
    
    const { data, error } = await supabase
      .from('asaas_config')
      .select('*');
    
    if (error) {
      console.error('❌ Erro ao buscar configuração:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️  Nenhuma configuração encontrada na tabela asaas_config');
      return;
    }
    
    const config = data[0];
    console.log('📋 Configuração encontrada:');
    console.log('- Environment:', config.environment);
    console.log('- API Key Sandbox:', config.api_key_sandbox ? `${config.api_key_sandbox.substring(0, 10)}...` : 'AUSENTE');
    console.log('- API Key Production:', config.api_key_production ? `${config.api_key_production.substring(0, 10)}...` : 'AUSENTE');
    console.log('- Webhook URL:', config.webhook_url || 'AUSENTE');
    
    // Verificar qual chave está sendo usada
    const activeKey = config.environment === 'production' 
      ? config.api_key_production 
      : config.api_key_sandbox;
      
    console.log('🔑 Chave ativa para', config.environment + ':', activeKey ? `${activeKey.substring(0, 10)}...` : 'AUSENTE');
    
    if (!activeKey) {
      console.log('❌ PROBLEMA: Não há chave API configurada para o ambiente', config.environment);
    } else {
      console.log('✅ Chave API configurada corretamente');
    }
    
  } catch (error) {
    console.error('❌ Erro no script:', error);
  }
}

checkAsaasConfig();