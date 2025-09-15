import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.wCOzw0cQSKhJJ8W8VJhLJQJQJQJQJQJQJQJQJQJQJQJQ'; // Service role key needed for schema changes
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addWalletColumn() {
  try {
    console.log('🔧 Adicionando coluna asaas_wallet_id à tabela companies...');
    
    // Verificar estrutura atual da tabela
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'companies' });
    
    if (columnsError) {
      console.log('⚠️ Não foi possível verificar colunas existentes, tentando adicionar coluna...');
    } else {
      console.log('📋 Colunas atuais da tabela companies:');
      columns?.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    }
    
    // Tentar adicionar a coluna usando SQL direto
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          ALTER TABLE companies 
          ADD COLUMN IF NOT EXISTS asaas_wallet_id VARCHAR(255);
          
          COMMENT ON COLUMN companies.asaas_wallet_id IS 'ID do wallet no Asaas para recebimento de splits';
        `
      });
    
    if (error) {
      console.error('❌ Erro ao adicionar coluna:', error);
      
      // Tentar método alternativo
      console.log('🔄 Tentando método alternativo...');
      
      const { error: altError } = await supabase
        .from('companies')
        .select('asaas_wallet_id')
        .limit(1);
      
      if (altError && altError.code === '42703') {
        console.log('❌ Coluna realmente não existe. Será necessário adicionar via SQL direto no Supabase.');
        console.log('\n📝 Execute este SQL no Supabase Dashboard:');
        console.log('=====================================');
        console.log('ALTER TABLE companies ADD COLUMN IF NOT EXISTS asaas_wallet_id VARCHAR(255);');
        console.log('COMMENT ON COLUMN companies.asaas_wallet_id IS \'ID do wallet no Asaas para recebimento de splits\';');
        console.log('=====================================');
      } else {
        console.log('✅ Coluna já existe!');
      }
    } else {
      console.log('✅ Coluna adicionada com sucesso!');
    }
    
    // Verificar se a coluna existe agora
    const { data: testData, error: testError } = await supabase
      .from('companies')
      .select('id, nome, asaas_wallet_id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Coluna ainda não está disponível:', testError.message);
    } else {
      console.log('✅ Coluna está funcionando!');
      
      // Agora atualizar a ICETRAN
      const correctWalletId = '7f9702c1-08da-43c9-b0d3-122130b41ee8';
      
      const { data: updated, error: updateError } = await supabase
        .from('companies')
        .update({ asaas_wallet_id: correctWalletId })
        .eq('nome', 'ICETRAN INSTITUTO DE CERTIFICACAO E ESTUDOS DE TRANSITO E TRANSPORTE LTDA')
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Erro ao atualizar ICETRAN:', updateError);
      } else {
        console.log('\n✅ ICETRAN atualizada com wallet correto!');
        console.log('  - Nome:', updated.nome);
        console.log('  - Wallet ID:', updated.asaas_wallet_id);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

addWalletColumn();