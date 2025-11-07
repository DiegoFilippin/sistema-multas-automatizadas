const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addColumnDirectly() {
  try {
    console.log('🔧 Adicionando coluna data_nascimento diretamente...');
    
    // Método 1: Tentar usar uma função personalizada para executar DDL
    console.log('\n1. Tentando criar função temporária para DDL...');
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION temp_add_data_nascimento_column()
      RETURNS text AS $$
      BEGIN
        -- Verificar se a coluna já existe
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'clients' 
          AND column_name = 'data_nascimento'
          AND table_schema = 'public'
        ) THEN
          -- Adicionar a coluna
          ALTER TABLE public.clients ADD COLUMN data_nascimento DATE;
          
          -- Criar índice
          CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON public.clients(data_nascimento);
          
          RETURN 'Coluna data_nascimento adicionada com sucesso!';
        ELSE
          RETURN 'Coluna data_nascimento já existe!';
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN 'Erro: ' || SQLERRM;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // Tentar criar a função
    const { data: createResult, error: createError } = await supabase
      .rpc('exec_sql', { sql: createFunctionSQL });

    if (createError) {
      console.log('⚠️ Não foi possível criar função via RPC:', createError.message);
    } else {
      console.log('✅ Função criada com sucesso!');
      
      // Executar a função
      const { data: execResult, error: execError } = await supabase
        .rpc('temp_add_data_nascimento_column');

      if (execError) {
        console.log('❌ Erro ao executar função:', execError.message);
      } else {
        console.log('✅ Resultado:', execResult);
        return true;
      }
    }

    // Método 2: Tentar inserir um registro com a coluna para forçar erro específico
    console.log('\n2. Testando inserção para confirmar estrutura...');
    
    const { error: insertError } = await supabase
      .from('clients')
      .insert({
        nome: 'TESTE_ESTRUTURA',
        cpf_cnpj: '99999999999',
        data_nascimento: '2000-01-01'
      });

    if (insertError) {
      console.log('❌ Confirmado - coluna não existe:', insertError.message);
      
      // Método 3: Tentar usar SQL direto via REST API
      console.log('\n3. Tentando SQL direto via REST API...');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({
          sql: 'ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;'
        })
      });

      if (response.ok) {
        console.log('✅ SQL executado via REST API!');
        return true;
      } else {
        const errorText = await response.text();
        console.log('❌ Erro na REST API:', errorText);
      }
    }

    return false;

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando processo de adição da coluna data_nascimento...');
  
  const success = await addColumnDirectly();
  
  if (!success) {
    console.log('\n❌ Não foi possível adicionar a coluna automaticamente.');
    console.log('\n🔧 SOLUÇÃO MANUAL OBRIGATÓRIA:');
    console.log('1. Acesse: https://supabase.com/dashboard');
    console.log('2. Vá para seu projeto');
    console.log('3. Clique em "SQL Editor"');
    console.log('4. Execute este SQL:');
    console.log('\n--- COPIE E COLE ESTE SQL ---');
    console.log('ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_nascimento DATE;');
    console.log('CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);');
    console.log('--- FIM DO SQL ---');
    console.log('\n5. Clique em "Run" para executar');
    console.log('6. Reinicie a aplicação após executar o SQL');
  } else {
    console.log('\n✅ Coluna adicionada com sucesso!');
    console.log('💡 Reinicie a aplicação para atualizar o cache do esquema.');
  }
}

main();