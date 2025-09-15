// Script para verificar se a empresa ICETRAN existe e tem wallet_id configurado
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIcetranCompany() {
  try {
    console.log('🔍 Verificando empresa ICETRAN...');
    
    // Buscar empresa ICETRAN
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .or('cnpj.eq.02968119000188,nome.ilike.%ICETRAN%,company_type.eq.icetran');
    
    if (error) {
      console.error('❌ Erro ao buscar empresa ICETRAN:', error);
      return;
    }
    
    console.log(`\n📊 Encontradas ${companies?.length || 0} empresas:`);
    
    if (companies && companies.length > 0) {
      companies.forEach((company, index) => {
        console.log(`\n${index + 1}. ${company.nome || 'Nome não informado'}`);
        console.log(`   ID: ${company.id}`);
        console.log(`   CNPJ: ${company.cnpj || 'Não informado'}`);
        console.log(`   Tipo: ${company.company_type || 'Não definido'}`);
        console.log(`   Email: ${company.email || 'Não informado'}`);
        console.log(`   Telefone: ${company.telefone || 'Não informado'}`);
        console.log(`   Status: ${company.status || 'Não definido'}`);
        console.log(`   Wallet ID: ${company.asaas_wallet_id || 'NÃO CONFIGURADO ❌'}`);
        console.log(`   Customer ID: ${company.asaas_customer_id || 'Não configurado'}`);
        console.log(`   Criado em: ${company.created_at}`);
      });
    } else {
      console.log('❌ Nenhuma empresa ICETRAN encontrada!');
    }
    
    // Estatísticas por tipo
    console.log('\n📈 Estatísticas por tipo de empresa:');
    const { data: stats, error: statsError } = await supabase
      .from('companies')
      .select('company_type')
      .not('company_type', 'is', null);
    
    if (statsError) {
      console.error('❌ Erro ao buscar estatísticas:', statsError);
    } else {
      const typeCount = {};
      stats?.forEach(company => {
        const type = company.company_type || 'undefined';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }
    
    // Verificar se precisa criar empresa ICETRAN
    const icetranExists = companies?.some(c => 
      c.cnpj === '02968119000188' || 
      c.company_type === 'icetran' ||
      (c.nome && c.nome.toUpperCase().includes('ICETRAN'))
    );
    
    if (!icetranExists) {
      console.log('\n⚠️ AÇÃO NECESSÁRIA: Empresa ICETRAN não encontrada!');
      console.log('   Será necessário criar a empresa ICETRAN com:');
      console.log('   - Nome: ICETRAN INSTITUTO DE CERTIFICACAO E ESTUDOS DE TRANSITO E TRANSPORTE LTDA');
      console.log('   - CNPJ: 02968119000188');
      console.log('   - Tipo: icetran');
      console.log('   - Wallet ID: [a ser configurado]');
    } else {
      const icetranCompany = companies.find(c => 
        c.cnpj === '02968119000188' || 
        c.company_type === 'icetran' ||
        (c.nome && c.nome.toUpperCase().includes('ICETRAN'))
      );
      
      if (!icetranCompany.asaas_wallet_id) {
        console.log('\n⚠️ AÇÃO NECESSÁRIA: Empresa ICETRAN encontrada mas sem wallet_id!');
        console.log('   É necessário configurar o asaas_wallet_id para receber splits.');
      } else {
        console.log('\n✅ Empresa ICETRAN configurada corretamente!');
        console.log(`   Wallet ID: ${icetranCompany.asaas_wallet_id}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

checkIcetranCompany();