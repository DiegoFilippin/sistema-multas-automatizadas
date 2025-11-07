const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyColumnExists() {
  try {
    console.log('🔍 Verificando se a coluna data_nascimento existe na tabela clients...');
    
    // Método 1: Tentar fazer uma query que usa a coluna
    console.log('\n1. Testando query com a coluna data_nascimento...');
    const { data: testData, error: testError } = await supabase
      .from('clients')
      .select('id, nome, data_nascimento')
      .limit(1);

    if (testError) {
      console.log('❌ Erro ao consultar coluna:', testError.message);
      if (testError.message.includes('column "data_nascimento" does not exist')) {
        console.log('🚨 CONFIRMADO: A coluna data_nascimento NÃO EXISTE na tabela clients!');
        return false;
      }
    } else {
      console.log('✅ Query executada com sucesso! A coluna existe.');
      console.log('📊 Dados de teste:', testData);
      return true;
    }

    // Método 2: Verificar estrutura da tabela usando information_schema
    console.log('\n2. Verificando estrutura da tabela via information_schema...');
    const { data: columns, error: schemaError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'clients' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });

    if (schemaError) {
      console.log('⚠️ Não foi possível usar information_schema:', schemaError.message);
    } else {
      console.log('📋 Colunas da tabela clients:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
      
      const hasDataNascimento = columns.some(col => col.column_name === 'data_nascimento');
      if (hasDataNascimento) {
        console.log('✅ Coluna data_nascimento encontrada na estrutura!');
        return true;
      } else {
        console.log('❌ Coluna data_nascimento NÃO encontrada na estrutura!');
        return false;
      }
    }

    // Método 3: Tentar inserir um valor de teste
    console.log('\n3. Testando inserção com data_nascimento...');
    const { error: insertError } = await supabase
      .from('clients')
      .insert({
        nome: 'TESTE_COLUNA_DATA_NASCIMENTO',
        cpf_cnpj: '00000000000',
        data_nascimento: '2000-01-01'
      });

    if (insertError) {
      console.log('❌ Erro ao inserir:', insertError.message);
      if (insertError.message.includes('column "data_nascimento"')) {
        console.log('🚨 CONFIRMADO: A coluna data_nascimento NÃO EXISTE!');
        return false;
      }
    } else {
      console.log('✅ Inserção de teste bem-sucedida! A coluna existe.');
      
      // Limpar o registro de teste
      await supabase
        .from('clients')
        .delete()
        .eq('nome', 'TESTE_COLUNA_DATA_NASCIMENTO');
      
      return true;
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return false;
  }
}

async function main() {
  const exists = await verifyColumnExists();
  
  if (!exists) {
    console.log('\n🔧 AÇÃO NECESSÁRIA: Adicionar a coluna data_nascimento');
    console.log('Execute este SQL no painel do Supabase:');
    console.log('\nALTER TABLE clients ADD COLUMN data_nascimento DATE;');
    console.log('CREATE INDEX IF NOT EXISTS idx_clients_data_nascimento ON clients(data_nascimento);');
  } else {
    console.log('\n✅ A coluna data_nascimento existe! O problema pode ser cache do Supabase.');
    console.log('💡 Soluções possíveis:');
    console.log('1. Reiniciar a aplicação');
    console.log('2. Limpar cache do navegador');
    console.log('3. Aguardar alguns minutos para o cache expirar');
  }
}

main();