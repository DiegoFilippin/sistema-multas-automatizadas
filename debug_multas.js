import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMultas() {
  console.log('🔍 === DEBUG MULTAS ===');
  
  try {
    // 1. Verificar se conseguimos conectar no Supabase
    console.log('1. Testando conexão com Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('multas')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erro na conexão:', testError);
      return;
    }
    console.log('✅ Conexão OK');
    
    // 2. Contar total de multas
    console.log('\n2. Contando total de multas...');
    const { count, error: countError } = await supabase
      .from('multas')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erro ao contar multas:', countError);
    } else {
      console.log(`✅ Total de multas no banco: ${count}`);
    }
    
    // 3. Buscar todas as multas (limitado a 10)
    console.log('\n3. Buscando multas (limite 10)...');
    const { data: allMultas, error: allError } = await supabase
      .from('multas')
      .select('*')
      .limit(10);
    
    if (allError) {
      console.error('❌ Erro ao buscar multas:', allError);
    } else {
      console.log(`✅ Multas encontradas: ${allMultas?.length || 0}`);
      if (allMultas && allMultas.length > 0) {
        console.log('📋 Primeira multa:', {
          id: allMultas[0].id,
          numero_auto: allMultas[0].numero_auto,
          client_id: allMultas[0].client_id,
          company_id: allMultas[0].company_id,
          placa_veiculo: allMultas[0].placa_veiculo,
          status: allMultas[0].status
        });
      }
    }
    
    // 4. Verificar companies
    console.log('\n4. Verificando companies...');
    const { data: companies, error: compError } = await supabase
      .from('companies')
      .select('id, nome')
      .limit(5);
    
    if (compError) {
      console.error('❌ Erro ao buscar companies:', compError);
    } else {
      console.log(`✅ Companies encontradas: ${companies?.length || 0}`);
      companies?.forEach(comp => {
        console.log(`  - ${comp.nome} (${comp.id})`);
      });
    }
    
    // 5. Verificar clients
    console.log('\n5. Verificando clients...');
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('id, nome')
      .limit(5);
    
    if (clientError) {
      console.error('❌ Erro ao buscar clients:', clientError);
    } else {
      console.log(`✅ Clients encontrados: ${clients?.length || 0}`);
      clients?.forEach(client => {
        console.log(`  - ${client.nome} (${client.id})`);
      });
    }
    
    // 6. Testar filtro por company_id (usando primeira company)
    if (companies && companies.length > 0) {
      const firstCompanyId = companies[0].id;
      console.log(`\n6. Testando filtro por company_id: ${firstCompanyId}`);
      
      const { data: companyMultas, error: companyError } = await supabase
        .from('multas')
        .select('*')
        .eq('company_id', firstCompanyId)
        .limit(5);
      
      if (companyError) {
        console.error('❌ Erro ao filtrar por company:', companyError);
      } else {
        console.log(`✅ Multas da empresa ${companies[0].nome}: ${companyMultas?.length || 0}`);
      }
    }
    
    // 6.1. Testar com company_id do usuário logado (F&Z CONSULTORIA)
    const userCompanyId = '7d573ce0-125d-46bf-9e37-33d0c6074cf9';
    console.log(`\n6.1. Testando filtro por company_id do usuário logado: ${userCompanyId}`);
    
    const { data: userCompanyMultas, error: userCompanyError } = await supabase
      .from('multas')
      .select('*')
      .eq('company_id', userCompanyId)
      .limit(10);
    
    if (userCompanyError) {
      console.error('❌ Erro ao filtrar por company do usuário:', userCompanyError);
    } else {
      console.log(`✅ Multas da empresa F&Z CONSULTORIA: ${userCompanyMultas?.length || 0}`);
      if (userCompanyMultas && userCompanyMultas.length > 0) {
        console.log('📋 Multas encontradas:');
        userCompanyMultas.forEach((multa, index) => {
          console.log(`  ${index + 1}. ${multa.numero_auto} - ${multa.placa_veiculo} - Status: ${multa.status}`);
        });
      }
    }
    
    // 7. Testar filtro por client_id (usando primeiro client)
    if (clients && clients.length > 0) {
      const firstClientId = clients[0].id;
      console.log(`\n7. Testando filtro por client_id: ${firstClientId}`);
      
      const { data: clientMultas, error: clientError } = await supabase
        .from('multas')
        .select('*')
        .eq('client_id', firstClientId)
        .limit(5);
      
      if (clientError) {
        console.error('❌ Erro ao filtrar por client:', clientError);
      } else {
        console.log(`✅ Multas do cliente ${clients[0].nome}: ${clientMultas?.length || 0}`);
      }
    }
    
    // 8. Verificar RLS (Row Level Security)
    console.log('\n8. Verificando RLS...');
    const { data: rlsData, error: rlsError } = await supabase
      .rpc('check_table_rls', { table_name: 'multas' })
      .single();
    
    if (rlsError) {
      console.log('⚠️ Não foi possível verificar RLS (função não existe)');
    } else {
      console.log('✅ RLS verificado:', rlsData);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
  
  console.log('\n🔍 === FIM DEBUG ===');
}

// Executar debug
debugMultas();