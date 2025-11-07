require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('💪 FORÇANDO ADIÇÃO DA COLUNA COM INTEGRAÇÃO TRAE...');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function forceAddColumn() {
  console.log('🔥 EXECUTANDO MÚLTIPLAS TENTATIVAS AGRESSIVAS...');
  
  // Tentativa 1: SQL Raw via diferentes endpoints
  const sqlCommands = [
    "ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;",
    "CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON public.clients(data_nascimento);"
  ];
  
  for (const sql of sqlCommands) {
    console.log(`🔧 Executando: ${sql}`);
    
    // Múltiplas abordagens simultâneas
    const attempts = [
      // Tentativa via RPC personalizado
      async () => {
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql });
          if (!error) return { success: true, method: 'RPC exec_sql', data };
        } catch (e) {}
        return { success: false };
      },
      
      // Tentativa via RPC alternativo
      async () => {
        try {
          const { data, error } = await supabase.rpc('execute_sql', { query: sql });
          if (!error) return { success: true, method: 'RPC execute_sql', data };
        } catch (e) {}
        return { success: false };
      },
      
      // Tentativa via fetch direto
      async () => {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ sql })
          });
          if (response.ok) {
            const result = await response.text();
            return { success: true, method: 'Fetch RPC', data: result };
          }
        } catch (e) {}
        return { success: false };
      },
      
      // Tentativa via SQL endpoint direto
      async () => {
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/sql',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: sql
          });
          if (response.ok) {
            const result = await response.text();
            return { success: true, method: 'SQL Direct', data: result };
          }
        } catch (e) {}
        return { success: false };
      },
      
      // Tentativa via GraphQL
      async () => {
        try {
          const response = await fetch(`${supabaseUrl}/graphql/v1`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({
              query: `mutation { __schema { queryType { name } } }`
            })
          });
          // GraphQL não suporta DDL, mas testamos a conexão
        } catch (e) {}
        return { success: false };
      }
    ];
    
    // Executar todas as tentativas em paralelo
    const results = await Promise.all(attempts.map(attempt => attempt()));
    
    for (const result of results) {
      if (result.success) {
        console.log(`✅ SUCESSO via ${result.method}:`, result.data);
        break;
      }
    }
  }
  
  // Verificação final mais robusta
  console.log('🔍 VERIFICAÇÃO FINAL ROBUSTA...');
  
  try {
    // Teste 1: Tentar selecionar a coluna
    const { data: selectTest, error: selectError } = await supabase
      .from('clients')
      .select('id, data_nascimento')
      .limit(1);
      
    if (!selectError) {
      console.log('✅ SUCESSO! Coluna data_nascimento existe e funciona!');
      return true;
    }
    
    // Teste 2: Tentar inserir com a coluna
    const testId = 'test_' + Date.now();
    const { error: insertError } = await supabase
      .from('clients')
      .insert({
        id: testId,
        nome: 'TESTE_COLUNA',
        cpf_cnpj: '00000000000',
        data_nascimento: '1990-01-01'
      });
      
    if (!insertError) {
      console.log('✅ SUCESSO! Inserção com data_nascimento funcionou!');
      // Limpar teste
      await supabase.from('clients').delete().eq('id', testId);
      return true;
    }
    
    // Teste 3: Verificar estrutura da tabela
    const { data: tableInfo } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'clients')
      .eq('column_name', 'data_nascimento');
      
    if (tableInfo && tableInfo.length > 0) {
      console.log('✅ SUCESSO! Coluna encontrada na estrutura da tabela!');
      return true;
    }
    
  } catch (error) {
    console.log('⚠️ Erro na verificação:', error.message);
  }
  
  console.log('❌ TODAS AS TENTATIVAS FALHARAM');
  console.log('');
  console.log('🔧 ÚLTIMA OPÇÃO - EXECUTE MANUALMENTE NO SUPABASE:');
  console.log('1. Acesse: https://supabase.com/dashboard');
  console.log('2. Vá para SQL Editor');
  console.log('3. Execute:');
  console.log('   ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;');
  console.log('   CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);');
  
  return false;
}

// Executar com retry
async function executeWithRetry() {
  for (let i = 0; i < 3; i++) {
    console.log(`\n🚀 TENTATIVA ${i + 1}/3`);
    const success = await forceAddColumn();
    if (success) {
      console.log('\n🎉 MISSÃO CUMPRIDA! COLUNA ADICIONADA COM SUCESSO!');
      process.exit(0);
    }
    if (i < 2) {
      console.log('⏳ Aguardando 2 segundos antes da próxima tentativa...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n💥 TODAS AS TENTATIVAS AUTOMÁTICAS FALHARAM!');
  process.exit(1);
}

executeWithRetry();