import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixIcetranWallet() {
  try {
    console.log('🔧 Corrigindo wallet da ICETRAN...');
    
    // Wallet ID correto encontrado no Asaas
    const correctWalletId = '7f9702c1-08da-43c9-b0d3-122130b41ee8';
    
    // Verificar se ICETRAN existe
    const { data: icetran, error: selectError } = await supabase
      .from('companies')
      .select('*')
      .eq('nome', 'ICETRAN INSTITUTO DE CERTIFICACAO E ESTUDOS DE TRANSITO E TRANSPORTE LTDA')
      .single();
    
    if (selectError) {
      console.error('❌ Erro ao buscar ICETRAN:', selectError);
      return;
    }
    
    if (!icetran) {
      console.log('❌ ICETRAN não encontrada no banco');
      return;
    }
    
    console.log('📋 ICETRAN atual:');
    console.log('  - ID:', icetran.id);
    console.log('  - Nome:', icetran.nome);
    console.log('  - Wallet ID atual:', icetran.asaas_wallet_id);
    console.log('  - Customer ID:', icetran.asaas_customer_id);
    
    // Atualizar com wallet correto
    const { data: updated, error: updateError } = await supabase
      .from('companies')
      .update({ 
        asaas_wallet_id: correctWalletId 
      })
      .eq('id', icetran.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Erro ao atualizar ICETRAN:', updateError);
      return;
    }
    
    console.log('\n✅ ICETRAN atualizada com sucesso!');
    console.log('📋 ICETRAN atualizada:');
    console.log('  - ID:', updated.id);
    console.log('  - Nome:', updated.nome);
    console.log('  - Wallet ID novo:', updated.asaas_wallet_id);
    console.log('  - Customer ID:', updated.asaas_customer_id);
    
    console.log('\n🎯 Próximos passos:');
    console.log('1. Reiniciar o proxy-server.js');
    console.log('2. Testar criação de cobrança');
    console.log('3. Verificar se o split está funcionando');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

fixIcetranWallet();