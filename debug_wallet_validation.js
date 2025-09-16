import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugWalletValidation() {
  console.log('🔍 === DEBUG VALIDAÇÃO DE WALLET ===');
  
  const company_id = '7d573ce0-125d-46bf-9e37-33d0c6074cf9'; // F&Z CONSULTORIA
  
  try {
    // 1. Testar query atual do proxy-server (asaas_wallet_id)
    console.log('\n1️⃣ Testando query atual do proxy-server (asaas_wallet_id)...');
    const { data: company1, error: error1 } = await supabase
      .from('companies')
      .select('asaas_wallet_id, nome')
      .eq('id', company_id)
      .single();
    
    console.log('Resultado query asaas_wallet_id:');
    console.log('  - Data:', company1);
    console.log('  - Error:', error1);
    console.log('  - asaas_wallet_id:', company1?.asaas_wallet_id || 'NÃO ENCONTRADO');
    
    // 2. Testar query com wallet_id (campo correto)
    console.log('\n2️⃣ Testando query com wallet_id (campo correto)...');
    const { data: company2, error: error2 } = await supabase
      .from('companies')
      .select('wallet_id, nome')
      .eq('id', company_id)
      .single();
    
    console.log('Resultado query wallet_id:');
    console.log('  - Data:', company2);
    console.log('  - Error:', error2);
    console.log('  - wallet_id:', company2?.wallet_id || 'NÃO ENCONTRADO');
    
    // 3. Buscar todos os campos da empresa
    console.log('\n3️⃣ Buscando todos os campos da empresa...');
    const { data: company3, error: error3 } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single();
    
    if (error3) {
      console.error('❌ Erro ao buscar empresa:', error3);
    } else {
      console.log('✅ Todos os campos da empresa:');
      Object.keys(company3).forEach(key => {
        console.log(`  - ${key}:`, company3[key]);
      });
    }
    
    // 4. Análise do problema
    console.log('\n📊 === ANÁLISE DO PROBLEMA ===');
    
    if (company1?.asaas_wallet_id) {
      console.log('✅ Campo asaas_wallet_id existe e tem valor:', company1.asaas_wallet_id);
    } else {
      console.log('❌ Campo asaas_wallet_id NÃO existe ou está vazio');
    }
    
    if (company2?.wallet_id) {
      console.log('✅ Campo wallet_id existe e tem valor:', company2.wallet_id);
    } else {
      console.log('❌ Campo wallet_id NÃO existe ou está vazio');
    }
    
    // 5. Conclusão
    console.log('\n🎯 === CONCLUSÃO ===');
    
    if (!company1?.asaas_wallet_id && company2?.wallet_id) {
      console.log('🔧 PROBLEMA IDENTIFICADO:');
      console.log('   - Proxy-server está buscando campo "asaas_wallet_id"');
      console.log('   - Mas o campo correto é "wallet_id"');
      console.log('   - Valor correto do wallet:', company2.wallet_id);
      console.log('\n💡 SOLUÇÃO:');
      console.log('   - Alterar proxy-server.js linha ~1360');
      console.log('   - Trocar "asaas_wallet_id" por "wallet_id"');
    } else if (company1?.asaas_wallet_id) {
      console.log('✅ Validação está correta, problema pode ser em outro lugar');
    } else {
      console.log('❓ Situação não identificada, investigar mais');
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

debugWalletValidation();