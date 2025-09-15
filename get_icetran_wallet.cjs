const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getIcetranWallet() {
  try {
    console.log('🔍 Buscando wallet da ICETRAN...');
    
    // Buscar empresa ICETRAN
    const { data: icetranCompany, error } = await supabase
      .from('companies')
      .select('*')
      .eq('company_type', 'icetran')
      .single();
    
    if (error) {
      console.error('❌ Erro ao buscar empresa ICETRAN:', error);
      return;
    }
    
    if (!icetranCompany) {
      console.log('❌ Empresa ICETRAN não encontrada!');
      return;
    }
    
    console.log('✅ Empresa ICETRAN encontrada:');
    console.log('- ID:', icetranCompany.id);
    console.log('- Nome:', icetranCompany.nome);
    console.log('- CNPJ:', icetranCompany.cnpj);
    console.log('- Wallet ID:', icetranCompany.asaas_wallet_id);
    
    if (!icetranCompany.asaas_wallet_id) {
      console.log('❌ ICETRAN não tem wallet configurado!');
      
      // Buscar subconta da ICETRAN
      const { data: subaccount, error: subError } = await supabase
        .from('asaas_subaccounts')
        .select('*')
        .eq('company_id', icetranCompany.id)
        .single();
      
      if (subError || !subaccount) {
        console.log('❌ ICETRAN também não tem subconta!');
        return null;
      }
      
      console.log('✅ Subconta ICETRAN encontrada:');
      console.log('- Wallet ID:', subaccount.wallet_id);
      return subaccount.wallet_id;
    }
    
    return icetranCompany.asaas_wallet_id;
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

getIcetranWallet().then(walletId => {
  if (walletId) {
    console.log('\n🎯 Wallet ICETRAN para usar:', walletId);
  } else {
    console.log('\n❌ Nenhum wallet ICETRAN encontrado!');
  }
});