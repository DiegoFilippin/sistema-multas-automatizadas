import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAsaasWallets() {
  try {
    console.log('🔍 Verificando wallets disponíveis no Asaas...');
    
    // Buscar configuração do Asaas
    const { data: config, error } = await supabase
      .from('asaas_config')
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Erro ao buscar config Asaas:', error);
      return;
    }
    
    const apiKey = config.environment === 'production' 
      ? config.api_key_production 
      : config.api_key_sandbox;
    
    const baseUrl = config.environment === 'production' 
      ? 'https://api.asaas.com/v3' 
      : 'https://api-sandbox.asaas.com/v3';
    
    console.log('🌐 Ambiente:', config.environment);
    console.log('🔑 API Key:', apiKey ? 'Configurada' : 'Não encontrada');
    
    // Listar wallets
    const response = await fetch(`${baseUrl}/wallets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro ao buscar wallets:', data);
      return;
    }
    
    console.log('\n📋 WALLETS DISPONÍVEIS:');
    console.log('=====================================');
    
    if (data.data && data.data.length > 0) {
      data.data.forEach((wallet, index) => {
        console.log(`${index + 1}. ID: ${wallet.id}`);
        console.log(`   Nome: ${wallet.name || 'Sem nome'}`);
        console.log(`   Status: ${wallet.status}`);
        console.log(`   Saldo: R$ ${wallet.balance || 0}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ Nenhum wallet encontrado');
    }
    
    console.log('=====================================');
    
    // Verificar configuração atual da ICETRAN
    const { data: icetran } = await supabase
      .from('companies')
      .select('*')
      .eq('name', 'ICETRAN INSTITUTO DE CERTIFICACAO E ESTUDOS DE TRANSITO E TRANSPORTE LTDA')
      .single();
    
    if (icetran) {
      console.log('\n🏢 CONFIGURAÇÃO ATUAL ICETRAN:');
      console.log('  - Nome:', icetran.name);
      console.log('  - Wallet ID:', icetran.asaas_wallet_id);
      console.log('  - Customer ID:', icetran.asaas_customer_id);
    }
    
    // Verificar se o wallet atual existe na lista
    if (icetran?.asaas_wallet_id && data.data) {
      const walletExists = data.data.find(w => w.id === icetran.asaas_wallet_id);
      if (walletExists) {
        console.log('✅ Wallet da ICETRAN encontrado na lista');
      } else {
        console.log('❌ Wallet da ICETRAN NÃO encontrado na lista - PRECISA SER CORRIGIDO');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkAsaasWallets();