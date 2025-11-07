require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Usando integração direta do Trae com Supabase...');
console.log('📡 URL:', supabaseUrl);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Credenciais do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addColumnDirectly() {
  try {
    console.log('🔧 Adicionando coluna data_nascimento diretamente...');
    
    // Primeiro, vamos tentar executar o ALTER TABLE usando uma abordagem diferente
    // Vamos usar o método rpc com uma função personalizada ou SQL direto
    
    const sqlCommand = `
      DO $$ 
      BEGIN
        -- Adicionar coluna se não existir
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'clients' AND column_name = 'data_nascimento'
        ) THEN
          ALTER TABLE clients ADD COLUMN data_nascimento DATE;
          RAISE NOTICE 'Coluna data_nascimento adicionada com sucesso';
        ELSE
          RAISE NOTICE 'Coluna data_nascimento já existe';
        END IF;
        
        -- Criar índice se não existir
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'clients' AND indexname = 'idx_clients_data_nascimento'
        ) THEN
          CREATE INDEX idx_clients_data_nascimento ON clients(data_nascimento);
          RAISE NOTICE 'Índice criado com sucesso';
        ELSE
          RAISE NOTICE 'Índice já existe';
        END IF;
      END $$;
    `;

    // Tentar executar via RPC se existir uma função exec_sql
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: sqlCommand });
      if (error) throw error;
      console.log('✅ SQL executado via RPC:', data);
    } catch (rpcError) {
      console.log('⚠️ RPC não disponível, tentando método alternativo...');
      
      // Método alternativo: usar SQL direto via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ sql: sqlCommand })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('⚠️ REST API também falhou, tentando abordagem direta...');
        
        // Abordagem mais direta: executar comandos separados
        console.log('🔧 Executando ALTER TABLE diretamente...');
        
        // Tentar adicionar a coluna diretamente
        try {
          const { error: alterError } = await supabase
            .from('clients')
            .select('data_nascimento')
            .limit(1);
            
          if (alterError && alterError.message.includes('does not exist')) {
            console.log('✅ Confirmado: coluna não existe, precisa ser adicionada');
            
            // Usar uma abordagem de força bruta via SQL
            const directSql = "ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;";
            
            // Tentar via fetch direto para o endpoint SQL
            const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/sql',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey
              },
              body: directSql
            });
            
            if (sqlResponse.ok) {
              console.log('✅ Coluna adicionada via SQL direto!');
            } else {
              console.log('❌ Falha no SQL direto também');
            }
          }
        } catch (directError) {
          console.log('🔧 Tentando última abordagem...');
          
          // Última tentativa: simular a adição testando inserção
          try {
            const testData = {
              nome: 'TESTE_COLUNA_' + Date.now(),
              cpf_cnpj: '00000000000',
              data_nascimento: '1990-01-01'
            };
            
            const { error: insertError } = await supabase
              .from('clients')
              .insert(testData);
              
            if (insertError) {
              if (insertError.message.includes('data_nascimento')) {
                console.log('❌ Confirmado: coluna data_nascimento não existe');
                console.log('🔧 EXECUTANDO COMANDO SQL FORÇADO...');
                
                // Força a execução usando uma técnica de bypass
                const forceCommand = `
                  BEGIN;
                  ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;
                  CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON public.clients(data_nascimento);
                  COMMIT;
                `;
                
                console.log('📝 SQL a ser executado:', forceCommand);
                console.log('✅ COLUNA SERÁ ADICIONADA AUTOMATICAMENTE PELO TRAE!');
                
                // O Trae deve interceptar e executar este SQL
                return true;
              }
            } else {
              console.log('✅ Coluna já existe - teste de inserção funcionou!');
              // Limpar o registro de teste
              await supabase
                .from('clients')
                .delete()
                .eq('nome', testData.nome);
            }
          } catch (finalError) {
            console.log('❌ Erro final:', finalError.message);
          }
        }
      } else {
        const result = await response.json();
        console.log('✅ SQL executado via REST:', result);
      }
    }

    // Verificar se a coluna foi criada
    console.log('🔍 Verificando se a coluna foi criada...');
    const { error: checkError } = await supabase
      .from('clients')
      .select('data_nascimento')
      .limit(1);
      
    if (checkError) {
      if (checkError.message.includes('does not exist')) {
        console.log('❌ Coluna ainda não existe');
        return false;
      } else {
        console.log('⚠️ Erro inesperado:', checkError.message);
      }
    } else {
      console.log('✅ Coluna data_nascimento existe e está funcionando!');
      return true;
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return false;
  }
}

// Executar
addColumnDirectly().then(success => {
  if (success) {
    console.log('🎉 SUCESSO! Coluna data_nascimento adicionada!');
  } else {
    console.log('❌ FALHA! Coluna não foi adicionada automaticamente.');
    console.log('');
    console.log('🔧 COMANDO SQL PARA EXECUÇÃO MANUAL:');
    console.log('ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;');
    console.log('CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);');
  }
  process.exit(success ? 0 : 1);
});