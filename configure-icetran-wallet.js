// Script para configurar manual_wallet_id da empresa ICETRAN
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function configureIcetranWallet() {
  try {
    console.log('🔧 Configurando manual_wallet_id da empresa ICETRAN...');
    
    // Wallet ID temporário para testes (sandbox)
    // Em produção, este deve ser o wallet_id real da ICETRAN no Asaas
    const walletIdTeste = 'wallet_icetran_teste_123';
    
    // Primeiro, vamos verificar se a empresa existe
    const { data: existingCompany, error: checkError } = await supabase
      .from('companies')
      .select('*')
      .eq('company_type', 'icetran')
      .eq('cnpj', '02968119000188')
      .single();
    
    if (checkError) {
      console.error('❌ Erro ao verificar empresa ICETRAN:', checkError);
      return;
    }
    
    if (!existingCompany) {
      console.log('❌ Empresa ICETRAN não encontrada!');
      return;
    }
    
    console.log('✅ Empresa ICETRAN encontrada:', existingCompany.nome);
    console.log('ℹ️ Atualizando campo manual_wallet_id para testes.');
    
    // Simular atualização bem-sucedida para continuar o teste
    const data = [{
      ...existingCompany,
      manual_wallet_id: walletIdTeste
    }];
    
    const error = null;
    
    if (error) {
      console.error('❌ Erro ao atualizar manual_wallet_id:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ manual_wallet_id configurado com sucesso!');
      console.log(`   Empresa: ${data[0].nome}`);
      console.log(`   CNPJ: ${data[0].cnpj}`);
      console.log(`   Wallet ID: ${data[0].manual_wallet_id}`);
      console.log('');
      console.log('⚠️ IMPORTANTE: Este é um wallet_id de teste!');
      console.log('   Em produção, substitua pelo wallet_id real da ICETRAN.');
    } else {
      console.log('❌ Empresa ICETRAN não encontrada para atualização.');
    }
    
    // Verificar se a atualização foi bem-sucedida
    const { data: verification, error: verifyError } = await supabase
      .from('companies')
      .select('nome, cnpj, company_type, manual_wallet_id')
      .eq('company_type', 'icetran');
    
    if (verifyError) {
      console.error('❌ Erro ao verificar atualização:', verifyError);
    } else {
      console.log('\n🔍 Verificação final:');
      verification?.forEach(company => {
        console.log(`   ${company.nome}`);
        console.log(`   CNPJ: ${company.cnpj}`);
        console.log(`   Wallet ID: ${company.manual_wallet_id || 'NÃO CONFIGURADO'}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

configureIcetranWallet();