import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testSubaccountTable() {
  console.log('🔍 Testando tabela asaas_subaccounts...');
  
  try {
    // Testar se a tabela existe
    const { data, error } = await supabase
      .from('asaas_subaccounts')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Erro ao acessar tabela:', error.message);
      return;
    }
    
    console.log('✅ Tabela asaas_subaccounts existe e é acessível');
    console.log(`📊 Registros encontrados: ${data?.length || 0}`);
    
    // Verificar se existe subconta para a empresa do Diego
    const { data: subconta, error: subcontaError } = await supabase
      .from('asaas_subaccounts')
      .select('*')
      .eq('company_id', 'c1f4c95f-1f16-4680-b568-aefc43390564')
      .single();
    
    if (subcontaError && subcontaError.code !== 'PGRST116') {
      console.log('❌ Erro ao buscar subconta:', subcontaError.message);
      return;
    }
    
    if (!subconta) {
      console.log('❌ Subconta não encontrada para a empresa do Diego');
      console.log('🔧 A integração automática não funcionou durante a criação da empresa');
    } else {
      console.log('✅ Subconta encontrada:');
      console.log(`   ID: ${subconta.id}`);
      console.log(`   Nome: ${subconta.name}`);
      console.log(`   Email: ${subconta.email}`);
      console.log(`   Status: ${subconta.status}`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testSubaccountTable().then(() => {
  console.log('\n🏁 Teste concluído');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro na execução:', error);
  process.exit(1);
});