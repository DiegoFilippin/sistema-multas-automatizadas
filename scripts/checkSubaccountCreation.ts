import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Supabase usando as mesmas variáveis do projeto
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas');
  console.log('📝 Certifique-se de que o arquivo .env está configurado corretamente');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubaccountCreation() {
  console.log('🔍 Verificando criação de subconta para empresa DIEGO DA SILVA FILIPPIN...');
  
  try {
    // Buscar a empresa pelo CNPJ
    const { data: empresa, error: empresaError } = await supabase
      .from('companies')
      .select('*')
      .eq('cnpj', '55.327.791/0001-50')
      .single();
    
    if (empresaError) {
      console.error('❌ Erro ao buscar empresa:', empresaError);
      return;
    }
    
    if (!empresa) {
      console.log('❌ Empresa não encontrada no banco de dados');
      return;
    }
    
    console.log('✅ Empresa encontrada:');
    console.log(`   ID: ${empresa.id}`);
    console.log(`   Nome: ${empresa.nome}`);
    console.log(`   CNPJ: ${empresa.cnpj}`);
    console.log(`   Email: ${empresa.email}`);
    console.log(`   Criada em: ${empresa.created_at}`);
    
    // Buscar subconta associada à empresa
    const { data: subconta, error: subcontaError } = await supabase
      .from('asaas_subaccounts')
      .select('*')
      .eq('company_id', empresa.id)
      .single();
    
    if (subcontaError && subcontaError.code !== 'PGRST116') {
      console.error('❌ Erro ao buscar subconta:', subcontaError);
      return;
    }
    
    if (!subconta) {
      console.log('❌ SUBCONTA NÃO FOI CRIADA AUTOMATICAMENTE');
      console.log('   A integração automática pode não estar funcionando');
      
      // Verificar se existe tabela asaas_subaccounts
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'asaas_subaccounts');
      
      if (tablesError || !tables || tables.length === 0) {
        console.log('⚠️  Tabela asaas_subaccounts não existe');
      }
    } else {
      console.log('✅ SUBCONTA CRIADA COM SUCESSO:');
      console.log(`   ID da Subconta: ${subconta.id}`);
      console.log(`   Asaas ID: ${subconta.asaas_id}`);
      console.log(`   Nome: ${subconta.name}`);
      console.log(`   Email: ${subconta.email}`);
      console.log(`   CNPJ: ${subconta.cpf_cnpj}`);
      console.log(`   Status: ${subconta.status}`);
      console.log(`   Criada em: ${subconta.created_at}`);
    }
    
    // Verificar logs de criação (se existir tabela de logs)
    console.log('\n📋 Verificando logs de criação...');
    const { data: logs, error: logsError } = await supabase
      .from('system_logs')
      .select('*')
      .ilike('message', '%subconta%')
      .eq('entity_id', empresa.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (logs && logs.length > 0) {
      console.log('📝 Logs encontrados:');
      logs.forEach(log => {
        console.log(`   ${log.created_at}: ${log.message}`);
      });
    } else {
      console.log('📝 Nenhum log de criação de subconta encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar verificação
checkSubaccountCreation().then(() => {
  console.log('\n🏁 Verificação concluída');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro na execução:', error);
  process.exit(1);
});