import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simular exatamente o que o multasService.getMultas faz
async function simulateMultasService(clientId) {
  console.log(`🔍 === SIMULANDO MULTASSERVICE.GETMULTAS PARA CLIENT_ID: ${clientId} ===\n`);
  
  try {
    // Replicar exatamente a lógica do multasService
    let query = supabase
      .from('multas')
      .select('*')
      .order('data_infracao', { ascending: false });

    // Aplicar filtro por clientId (como no multasService)
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    console.log('📋 Query construída:', {
      table: 'multas',
      select: '*',
      order: 'data_infracao DESC',
      filter: `client_id = ${clientId}`
    });

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro na query:', error);
      console.log('🔍 Detalhes do erro:', JSON.stringify(error, null, 2));
      throw new Error(error.message);
    }

    console.log(`✅ Resultado: ${data?.length || 0} multas encontradas`);
    
    if (data && data.length > 0) {
      console.log('📋 Primeiras 3 multas:');
      data.slice(0, 3).forEach((multa, index) => {
        console.log(`  ${index + 1}. ID: ${multa.id}`);
        console.log(`     Placa: ${multa.placa_veiculo}`);
        console.log(`     Infração: ${multa.descricao_infracao}`);
        console.log(`     Company ID: ${multa.company_id}`);
        console.log(`     Client ID: ${multa.client_id}`);
        console.log(`     Data: ${multa.data_infracao}`);
        console.log('');
      });
    }

    return data || [];
  } catch (error) {
    console.error('❌ Erro na simulação:', error);
    throw error;
  }
}

// Simular exatamente o que acontece no ClienteDetalhes.tsx
async function simulateClienteDetalhes() {
  console.log('🎯 === SIMULANDO FLUXO COMPLETO DO CLIENTEDETALHES.TSX ===\n');
  
  try {
    // 1. Buscar cliente (como no useEffect)
    console.log('1️⃣ BUSCANDO CLIENTE COM DETALHES:');
    
    // Buscar um cliente da F&Z CONSULTORIA
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .ilike('nome', '%F&Z%CONSULTORIA%')
      .single();
    
    if (!company) {
      console.log('⚠️ F&Z CONSULTORIA não encontrada, usando qualquer empresa...');
      const { data: anyCompany } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single();
      
      if (!anyCompany) {
        console.error('❌ Nenhuma empresa encontrada');
        return;
      }
      company.id = anyCompany.id;
    }
    
    // Buscar cliente desta empresa
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .eq('company_id', company.id)
      .limit(1);
    
    if (!clients || clients.length === 0) {
      console.error('❌ Nenhum cliente encontrado para esta empresa');
      return;
    }
    
    const cliente = clients[0];
    console.log(`✅ Cliente encontrado: ${cliente.nome} (ID: ${cliente.id})`);
    
    // 2. Simular clientsService.getClientWithDetails
    console.log('\n2️⃣ SIMULANDO CLIENTSSERVICE.GETCLIENTWITHDETAILS:');
    
    const { data: clienteCompleto, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', cliente.id)
      .single();
    
    if (clientError) {
      console.error('❌ Erro ao buscar cliente completo:', clientError);
      return;
    }
    
    console.log('✅ Cliente completo obtido');
    
    // 3. Simular fetchMultasCliente (a função que está falhando)
    console.log('\n3️⃣ SIMULANDO FETCHMULTASCLIENTE:');
    console.log(`   Chamando multasService.getMultas({ clientId: '${cliente.id}' })`);
    
    const multasCliente = await simulateMultasService(cliente.id);
    
    console.log(`\n📊 RESULTADO FINAL:`);
    console.log(`   - Cliente: ${cliente.nome}`);
    console.log(`   - ID do Cliente: ${cliente.id}`);
    console.log(`   - Company ID: ${cliente.company_id}`);
    console.log(`   - Multas encontradas: ${multasCliente.length}`);
    
    if (multasCliente.length === 0) {
      console.log('\n🔍 INVESTIGANDO POR QUE NÃO HÁ MULTAS:');
      
      // Verificar se existem multas para esta empresa
      const { data: multasEmpresa } = await supabase
        .from('multas')
        .select('*')
        .eq('company_id', cliente.company_id);
      
      console.log(`   - Multas da empresa: ${multasEmpresa?.length || 0}`);
      
      if (multasEmpresa && multasEmpresa.length > 0) {
        console.log('   - Primeiras multas da empresa:');
        multasEmpresa.slice(0, 3).forEach((multa, index) => {
          console.log(`     ${index + 1}. Client ID: ${multa.client_id}, Placa: ${multa.placa_veiculo}`);
        });
        
        // Verificar se alguma multa tem o client_id correto
        const multasComClientId = multasEmpresa.filter(m => m.client_id === cliente.id);
        console.log(`   - Multas com client_id correto: ${multasComClientId.length}`);
        
        if (multasComClientId.length === 0) {
          console.log('\n❗ PROBLEMA IDENTIFICADO:');
          console.log('   As multas da empresa não estão associadas ao client_id correto!');
          console.log('   Isso pode ser devido ao problema que corrigimos no salvamento das multas.');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na simulação completa:', error);
  }
}

async function verificarAssociacaoMultasClientes() {
  console.log('\n🔗 === VERIFICANDO ASSOCIAÇÃO MULTAS-CLIENTES ===\n');
  
  try {
    // 1. Buscar todas as multas e verificar associações
    const { data: multas } = await supabase
      .from('multas')
      .select('id, company_id, client_id, placa_veiculo')
      .limit(20);
    
    console.log(`📋 Analisando ${multas?.length || 0} multas:`);
    
    let multasComClientId = 0;
    let multasSemClientId = 0;
    const clientIds = new Set();
    
    multas?.forEach(multa => {
      if (multa.client_id) {
        multasComClientId++;
        clientIds.add(multa.client_id);
      } else {
        multasSemClientId++;
      }
    });
    
    console.log(`   - Multas com client_id: ${multasComClientId}`);
    console.log(`   - Multas sem client_id: ${multasSemClientId}`);
    console.log(`   - Clientes únicos referenciados: ${clientIds.size}`);
    
    // 2. Verificar se os client_ids existem na tabela clients
    if (clientIds.size > 0) {
      console.log('\n🔍 Verificando se os client_ids existem na tabela clients:');
      
      const clientIdsArray = Array.from(clientIds);
      const { data: clientsExistentes } = await supabase
        .from('clients')
        .select('id, nome')
        .in('id', clientIdsArray);
      
      console.log(`   - Client IDs referenciados nas multas: ${clientIdsArray.length}`);
      console.log(`   - Clientes que existem na tabela: ${clientsExistentes?.length || 0}`);
      
      if (clientsExistentes) {
        console.log('   - Clientes encontrados:');
        clientsExistentes.forEach(client => {
          console.log(`     * ${client.nome} (${client.id})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }
}

async function main() {
  console.log('🚀 === DEBUG COMPLETO: MULTAS NA PÁGINA DE DETALHES DO CLIENTE ===\n');
  
  await simulateClienteDetalhes();
  await verificarAssociacaoMultasClientes();
  
  console.log('\n✅ === DEBUG CONCLUÍDO ===');
  console.log('📝 Verifique os resultados acima para identificar o problema específico.');
}

// Executar o debug
main().catch(console.error);