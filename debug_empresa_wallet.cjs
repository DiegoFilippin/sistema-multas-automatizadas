const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugEmpresaWallet() {
  try {
    console.log('🔍 Buscando empresa com CNPJ: 55.327.791/0001-50');
    
    // Buscar empresa
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('cnpj', '55.327.791/0001-50')
      .single();
    
    if (companyError) {
      console.error('❌ Erro ao buscar empresa:', companyError);
      return;
    }
    
    if (!company) {
      console.log('❌ Empresa não encontrada!');
      return;
    }
    
    console.log('✅ Empresa encontrada:');
    console.log('- ID:', company.id);
    console.log('- Nome:', company.nome);
    console.log('- CNPJ:', company.cnpj);
    console.log('- Wallet ID (companies):', company.asaas_wallet_id);
    
    // Buscar subconta
    const { data: subaccount, error: subaccountError } = await supabase
      .from('asaas_subaccounts')
      .select('*')
      .eq('company_id', company.id)
      .single();
    
    if (subaccountError) {
      console.log('⚠️ Erro ao buscar subconta:', subaccountError);
    } else if (subaccount) {
      console.log('✅ Subconta encontrada:');
      console.log('- Wallet ID (subaccounts):', subaccount.wallet_id);
      console.log('- Account ID:', subaccount.asaas_account_id);
      console.log('- Status:', subaccount.status);
    } else {
      console.log('❌ Subconta não encontrada!');
    }
    
    // Verificar qual wallet seria usado
    const walletId = company.asaas_wallet_id || (subaccount ? subaccount.wallet_id : null);
    console.log('\n🎯 Wallet que seria usado:', walletId);
    
    if (!walletId) {
      console.log('❌ PROBLEMA: Nenhum wallet encontrado!');
    } else {
      console.log('✅ Wallet disponível para uso');
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

debugEmpresaWallet();