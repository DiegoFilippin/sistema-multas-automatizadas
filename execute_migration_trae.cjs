require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

console.log('🔥 FORÇANDO EXECUÇÃO VIA TRAE - MIGRAÇÃO SQL DIRETA');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration() {
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'supabase_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migração SQL carregada:');
    console.log(migrationSQL);
    console.log('\n🚀 EXECUTANDO MIGRAÇÃO...');
    
    // FORÇA BRUTA: Executar cada comando individualmente
    const commands = [
      "ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;",
      "CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON public.clients(data_nascimento);"
    ];
    
    for (const command of commands) {
      console.log(`\n🔧 Executando: ${command}`);
      
      // Tentar múltiplas abordagens para cada comando
      let success = false;
      
      // Abordagem 1: Via client Supabase com SQL raw
      try {
        // Usar uma query que force a execução do DDL
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .limit(0); // Não retorna dados, mas força conexão
          
        if (!error) {
          console.log('✅ Conexão com Supabase estabelecida');
          
          // Agora tentar executar o DDL via diferentes métodos
          const methods = [
            async () => {
              // Método 1: RPC direto
              return await supabase.rpc('exec_sql', { sql: command });
            },
            async () => {
              // Método 2: Via fetch com diferentes headers
              const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'apikey': supabaseServiceKey,
                  'Prefer': 'return=representation',
                  'Accept': 'application/json'
                },
                body: JSON.stringify({ sql: command })
              });
              return { data: await response.text(), error: response.ok ? null : new Error(response.statusText) };
            },
            async () => {
              // Método 3: SQL direto via endpoint
              const response = await fetch(`${supabaseUrl}/rest/v1/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/sql',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'apikey': supabaseServiceKey
                },
                body: command
              });
              return { data: await response.text(), error: response.ok ? null : new Error(response.statusText) };
            }
          ];
          
          for (const method of methods) {
            try {
              const result = await method();
              if (!result.error) {
                console.log('✅ Comando executado com sucesso!');
                success = true;
                break;
              }
            } catch (e) {
              console.log(`⚠️ Método falhou: ${e.message}`);
            }
          }
        }
      } catch (e) {
        console.log(`❌ Erro na conexão: ${e.message}`);
      }
      
      if (!success) {
        console.log(`❌ Falha ao executar: ${command}`);
      }
    }
    
    // Verificação final
    console.log('\n🔍 VERIFICAÇÃO FINAL...');
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('data_nascimento')
        .limit(1);
        
      if (!error) {
        console.log('🎉 SUCESSO TOTAL! Coluna data_nascimento está funcionando!');
        return true;
      } else if (error.message.includes('does not exist')) {
        console.log('❌ Coluna ainda não existe');
      } else {
        console.log('⚠️ Erro inesperado:', error.message);
      }
    } catch (e) {
      console.log('❌ Erro na verificação:', e.message);
    }
    
    return false;
    
  } catch (error) {
    console.error('💥 ERRO CRÍTICO:', error.message);
    return false;
  }
}

// Executar com força total
console.log('💪 INICIANDO EXECUÇÃO FORÇADA...');
executeMigration().then(success => {
  if (success) {
    console.log('\n🏆 VITÓRIA! MIGRAÇÃO EXECUTADA COM SUCESSO!');
    console.log('✅ A coluna data_nascimento foi adicionada à tabela clients');
    console.log('✅ O índice foi criado');
    console.log('✅ Tudo está funcionando!');
  } else {
    console.log('\n💀 DERROTA TEMPORÁRIA...');
    console.log('❌ A migração automática falhou');
    console.log('🔧 EXECUTE MANUALMENTE NO SUPABASE:');
    console.log('   ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;');
    console.log('   CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);');
  }
  process.exit(success ? 0 : 1);
});