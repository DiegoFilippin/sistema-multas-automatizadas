import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkServiceOrdersColumns() {
  try {
    console.log('🔍 Verificando colunas da tabela service_orders...');
    
    // Tentar fazer uma query simples para ver a estrutura
    const { data: sample, error: sampleError } = await supabase
      .from('service_orders')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('❌ Erro ao buscar dados de exemplo:', sampleError);
    } else {
      console.log('📋 Exemplo de registro (primeiros campos):');
      if (sample && sample.length > 0) {
        const columns = Object.keys(sample[0]);
        console.log(`📊 Total de colunas: ${columns.length}`);
        console.log('📝 Colunas disponíveis:');
        columns.forEach((col, index) => {
          console.log(`  ${index + 1}. ${col}`);
        });
        
        // Verificar se existem campos relacionados ao webhook
        const webhookFields = columns.filter(col => 
          col.includes('webhook') || 
          col.includes('qr') || 
          col.includes('pix') || 
          col.includes('invoice') || 
          col.includes('payment')
        );
        
        console.log('\n🔍 Campos relacionados ao webhook/pagamento:');
        if (webhookFields.length > 0) {
          webhookFields.forEach(field => {
            console.log(`  ✅ ${field}`);
          });
        } else {
          console.log('  ❌ Nenhum campo relacionado encontrado');
        }
        
        // Verificar campos básicos necessários
        const requiredFields = [
          'id', 'client_id', 'company_id', 'service_id', 
          'amount', 'status', 'description', 'asaas_payment_id',
          'customer_id', 'splits_config'
        ];
        
        console.log('\n🔍 Verificando campos obrigatórios:');
        requiredFields.forEach(field => {
          if (columns.includes(field)) {
            console.log(`  ✅ ${field}`);
          } else {
            console.log(`  ❌ ${field} - AUSENTE`);
          }
        });
        
      } else {
        console.log('📭 Nenhum registro encontrado na tabela');
      }
    }
    
    // Tentar inserir um registro de teste simples
    console.log('\n🧪 Testando inserção com campos básicos...');
    
    const testData = {
      client_id: '11d64113-575f-4618-8f81-a301ec3ec881',
      company_id: '8e6d04a6-251f-457e-a2c2-84fc3d861f5f',
      service_id: '31a8b93e-d459-40f4-8a3f-74137c910675',
      service_type: 'recurso_multa',
      multa_type: 'grave',
      amount: 80.00,
      status: 'pending_payment',
      description: 'Teste de inserção - Recurso de Multa Grave'
    };
    
    console.log('📋 Dados de teste:', testData);
    
    const { data: insertResult, error: insertError } = await supabase
      .from('service_orders')
      .insert(testData)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro na inserção de teste:', insertError);
      console.log('💡 Isso nos ajuda a identificar quais campos estão faltando');
    } else {
      console.log('✅ Inserção de teste bem-sucedida!');
      console.log('🆔 ID criado:', insertResult.id);
      
      // Limpar o registro de teste
      await supabase
        .from('service_orders')
        .delete()
        .eq('id', insertResult.id);
      console.log('🧹 Registro de teste removido');
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

checkServiceOrdersColumns();