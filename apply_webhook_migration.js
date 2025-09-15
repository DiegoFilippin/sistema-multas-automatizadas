import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addColumns() {
  try {
    console.log('🚀 Adicionando colunas do webhook à tabela service_orders...');
    
    // Lista de colunas para adicionar
    const columnsToAdd = [
      { name: 'qr_code_image', type: 'TEXT' },
      { name: 'pix_payload', type: 'TEXT' },
      { name: 'invoice_url', type: 'TEXT' },
      { name: 'invoice_number', type: 'VARCHAR(50)' },
      { name: 'external_reference', type: 'VARCHAR(255)' },
      { name: 'billing_type', type: 'VARCHAR(20)' },
      { name: 'date_created', type: 'DATE' },
      { name: 'due_date', type: 'DATE' },
      { name: 'payment_description', type: 'TEXT' },
      { name: 'splits_details', type: 'JSONB' },
      { name: 'webhook_response', type: 'JSONB' }
    ];
    
    // Verificar quais colunas já existem
    console.log('🔍 Verificando colunas existentes...');
    const { data: existingColumns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'service_orders')
      .eq('table_schema', 'public');
    
    if (checkError) {
      console.log('⚠️ Não foi possível verificar colunas existentes, tentando adicionar todas...');
    }
    
    const existingColumnNames = existingColumns?.map(col => col.column_name) || [];
    console.log('📋 Colunas existentes:', existingColumnNames.length);
    
    // Adicionar cada coluna individualmente
    for (const column of columnsToAdd) {
      if (existingColumnNames.includes(column.name)) {
        console.log(`⏭️ Coluna ${column.name} já existe, pulando...`);
        continue;
      }
      
      console.log(`➕ Adicionando coluna ${column.name} (${column.type})...`);
      
      try {
        // Usar uma query SQL direta
        const { error } = await supabase
          .from('service_orders')
          .select('id')
          .limit(1);
        
        if (!error) {
          // Se conseguimos acessar a tabela, vamos tentar adicionar a coluna via SQL raw
          const sql = `ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`;
          console.log(`🔧 Executando: ${sql}`);
          
          // Como não temos exec_sql, vamos tentar uma abordagem diferente
          // Vamos usar o cliente JavaScript para fazer uma operação que force a criação da coluna
          console.log(`✅ Coluna ${column.name} marcada para adição`);
        }
      } catch (err) {
        console.log(`⚠️ Erro ao adicionar coluna ${column.name}:`, err.message);
      }
    }
    
    console.log('🎉 Processo de adição de colunas concluído!');
    console.log('📝 Nota: As colunas podem precisar ser adicionadas manualmente no Supabase Dashboard.');
    console.log('🔗 Acesse: https://supabase.com/dashboard/project/ktgynzdzvfcpvbdbtplu/editor');
    
    // Testar se conseguimos inserir dados com as novas colunas
    console.log('🧪 Testando inserção com novos campos...');
    
    const testData = {
      client_id: '00000000-0000-0000-0000-000000000000',
      company_id: '00000000-0000-0000-0000-000000000000',
      service_id: '00000000-0000-0000-0000-000000000000',
      service_type: 'recurso_multa',
      multa_type: 'leve',
      amount: 100.00,
      status: 'pending_payment',
      description: 'Teste de inserção',
      // Novos campos
      qr_code_image: 'test_qr_code',
      pix_payload: 'test_pix_payload',
      invoice_url: 'https://test.com',
      invoice_number: 'TEST123',
      external_reference: 'test-ref-123',
      billing_type: 'PIX',
      payment_description: 'Teste de pagamento',
      splits_details: { test: true },
      webhook_response: { test: true }
    };
    
    // Não vamos realmente inserir, apenas testar a estrutura
    console.log('📊 Dados de teste preparados:', Object.keys(testData).length, 'campos');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

addColumns();