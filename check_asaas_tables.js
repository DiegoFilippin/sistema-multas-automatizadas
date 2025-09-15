import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const checkTables = async () => {
  console.log('=== VERIFICANDO TABELAS ASAAS ===\n');
  
  const tables = ['asaas_config', 'asaas_accounts', 'user_profiles', 'subaccounts', 'asaas_subaccounts'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (!error && data) {
        console.log(`✅ ${table}:`, Object.keys(data[0] || {}));
        if (data[0]) {
          console.log('   Exemplo:', data[0]);
        }
      } else if (error?.code === '42P01') {
        console.log(`❌ ${table}: Tabela não existe`);
      } else {
        console.log(`⚠️  ${table}: ${error?.message}`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
    console.log('');
  }
  
  // Verificar se existe alguma tabela com 'asaas' no nome
  console.log('\n=== BUSCANDO TABELAS COM "ASAAS" ===');
  try {
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .ilike('table_name', '%asaas%');
    
    if (tables && tables.length > 0) {
      console.log('Tabelas encontradas:', tables.map(t => t.table_name));
    } else {
      console.log('Nenhuma tabela com "asaas" encontrada');
    }
  } catch (error) {
    console.log('Erro ao buscar tabelas:', error.message);
  }
  
  // Verificar user_profiles do Diego
  console.log('\n=== VERIFICANDO USER_PROFILES DO DIEGO ===');
  try {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'diego@despachante.com');
    
    if (profiles && profiles.length > 0) {
      console.log('Profile do Diego:', profiles[0]);
    } else {
      console.log('Profile do Diego não encontrado');
    }
  } catch (error) {
    console.log('Erro ao buscar profile:', error.message);
  }
};

checkTables().catch(console.error);