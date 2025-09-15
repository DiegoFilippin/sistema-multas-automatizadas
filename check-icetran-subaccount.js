// Script para verificar se a API key da subconta ICETRAN foi salva no banco
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkIcetranSubaccount() {
  try {
    console.log('🔍 Verificando subconta ICETRAN no banco de dados...');
    console.log('CNPJ: 02968119000188');
    console.log('Wallet ID: eb35cde4-d0f2-44d1-83c0-aaa3496f7ed0');
    console.log('');

    // 1. Buscar a empresa ICETRAN pelo CNPJ
    console.log('📋 Buscando empresa ICETRAN...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('cnpj', '02968119000188')
      .single();

    if (companyError) {
      console.log('❌ Erro ao buscar empresa:', companyError.message);
      return;
    }

    if (!company) {
      console.log('❌ Empresa ICETRAN não encontrada no banco');
      return;
    }

    console.log('✅ Empresa encontrada:');
    console.log(`   ID: ${company.id}`);
    console.log(`   Nome: ${company.name}`);
    console.log(`   CNPJ: ${company.cnpj}`);
    console.log('');

    // 2. Buscar subconta associada à empresa
    console.log('🔍 Buscando subconta Asaas...');
    const { data: subaccount, error: subaccountError } = await supabase
      .from('asaas_subaccounts')
      .select('*')
      .eq('company_id', company.id)
      .single();

    if (subaccountError) {
      console.log('❌ Erro ao buscar subconta:', subaccountError.message);
      return;
    }

    if (!subaccount) {
      console.log('❌ Subconta não encontrada no banco');
      return;
    }

    console.log('✅ Subconta encontrada:');
    console.log(`   ID: ${subaccount.id}`);
    console.log(`   Asaas Account ID: ${subaccount.asaas_account_id || 'NÃO DEFINIDO'}`);
    console.log(`   Wallet ID: ${subaccount.wallet_id}`);
    console.log(`   Account Type: ${subaccount.account_type}`);
    console.log(`   Status: ${subaccount.status}`);
    console.log(`   API Key: ${subaccount.api_key ? 'SALVA ✅' : 'NÃO SALVA ❌'}`);
    
    if (subaccount.api_key) {
      console.log(`   API Key (primeiros 10 chars): ${subaccount.api_key.substring(0, 10)}...`);
    }
    
    console.log(`   Webhook URL: ${subaccount.webhook_url || 'NÃO DEFINIDO'}`);
    console.log(`   Criado em: ${subaccount.created_at}`);
    console.log('');

    // 3. Verificar se o Wallet ID confere
    const expectedWalletId = 'eb35cde4-d0f2-44d1-83c0-aaa3496f7ed0';
    if (subaccount.wallet_id === expectedWalletId) {
      console.log('✅ Wallet ID confere com o informado');
    } else {
      console.log('⚠️  Wallet ID não confere:');
      console.log(`   Esperado: ${expectedWalletId}`);
      console.log(`   No banco: ${subaccount.wallet_id}`);
    }

    // 4. Resumo final
    console.log('');
    console.log('📊 RESUMO:');
    console.log(`   Empresa: ${company.name}`);
    console.log(`   CNPJ: ${company.cnpj}`);
    console.log(`   Subconta ID: ${subaccount.id}`);
    console.log(`   Asaas Account ID: ${subaccount.asaas_account_id || 'AUSENTE'}`);
    console.log(`   Wallet ID: ${subaccount.wallet_id}`);
    console.log(`   API Key: ${subaccount.api_key ? 'PRESENTE' : 'AUSENTE'}`);
    console.log(`   Status: ${subaccount.status}`);

    if (!subaccount.api_key) {
      console.log('');
      console.log('⚠️  ATENÇÃO: API Key não foi salva!');
      console.log('   Isso pode impedir o onboarding de validação de documentos.');
      console.log('   Verifique os logs da criação da subconta.');
    }

    if (!subaccount.asaas_account_id) {
      console.log('');
      console.log('⚠️  ATENÇÃO: Asaas Account ID não foi salvo!');
      console.log('   Isso pode indicar que a criação no Asaas falhou.');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkIcetranSubaccount();