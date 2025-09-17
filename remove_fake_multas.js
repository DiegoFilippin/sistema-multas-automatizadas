import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeFakeMultas() {
  console.log('🗑️ === REMOVENDO MULTAS FAKE ===\n');
  
  try {
    // 1. Buscar a Ana Paula
    console.log('1️⃣ BUSCANDO CLIENTE ANA PAULA:');
    const { data: anaPaula, error: anaPaulaError } = await supabase
      .from('clients')
      .select('*')
      .ilike('nome', '%ANA PAULA%CARVALHO%ZORZZI%')
      .single();
    
    if (anaPaulaError) {
      console.error('❌ Erro ao buscar Ana Paula:', anaPaulaError);
      return;
    }
    
    console.log('✅ Ana Paula encontrada:', anaPaula.nome);
    console.log('📋 ID:', anaPaula.id);
    
    // 2. Buscar multas fake (criadas recentemente)
    console.log('\n2️⃣ BUSCANDO MULTAS FAKE:');
    const { data: multasFake, error: multasFakeError } = await supabase
      .from('multas')
      .select('*')
      .eq('client_id', anaPaula.id)
      .in('numero_auto', ['AUTO175807938809000', 'AUTO175807938809401']); // Números das multas fake
    
    if (multasFakeError) {
      console.error('❌ Erro ao buscar multas fake:', multasFakeError);
      return;
    }
    
    console.log(`✅ Encontradas ${multasFake?.length || 0} multas fake:`);
    multasFake?.forEach((multa, index) => {
      console.log(`  ${index + 1}. ${multa.numero_auto} - ${multa.placa_veiculo} - ${multa.descricao_infracao}`);
    });
    
    if (!multasFake || multasFake.length === 0) {
      console.log('⚠️ Nenhuma multa fake encontrada para remover');
      return;
    }
    
    // 3. Confirmar remoção
    console.log('\n3️⃣ REMOVENDO MULTAS FAKE:');
    const multaIds = multasFake.map(multa => multa.id);
    
    const { error: deleteError } = await supabase
      .from('multas')
      .delete()
      .in('id', multaIds);
    
    if (deleteError) {
      console.error('❌ Erro ao remover multas fake:', deleteError);
      return;
    }
    
    console.log(`✅ ${multasFake.length} multas fake removidas com sucesso!`);
    
    // 4. Verificar se ainda existem multas
    console.log('\n4️⃣ VERIFICANDO MULTAS RESTANTES:');
    const { data: multasRestantes, error: multasRestantesError } = await supabase
      .from('multas')
      .select('*')
      .eq('client_id', anaPaula.id);
    
    if (multasRestantesError) {
      console.error('❌ Erro ao buscar multas restantes:', multasRestantesError);
    } else {
      console.log(`✅ Multas restantes: ${multasRestantes?.length || 0}`);
      multasRestantes?.forEach((multa, index) => {
        console.log(`  ${index + 1}. ${multa.numero_auto} - ${multa.placa_veiculo}`);
      });
    }
    
    console.log('\n🎯 === CONCLUSÃO ===');
    console.log('✅ Multas fake removidas com sucesso!');
    console.log('✅ Agora apenas os service_orders com processos iniciados serão exibidos');
    console.log('✅ Teste a página de detalhes do cliente para ver os processos reais');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar remoção
removeFakeMultas();