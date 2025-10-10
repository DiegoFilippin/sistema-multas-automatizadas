import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testarAcessoMultasCliente() {
  console.log('🧪 === TESTE DE ACESSO ÀS MULTAS POR CLIENT_ID ===\n');
  
  try {
    // 1. Simular login de usuário (você pode usar um token real aqui)
    console.log('1️⃣ TESTANDO SEM AUTENTICAÇÃO (ANON):');
    
    // Buscar clientes disponíveis
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, nome, company_id')
      .limit(3);
    
    if (clientsError) {
      console.error('❌ Erro ao buscar clientes:', clientsError);
    } else {
      console.log(`✅ Clientes encontrados: ${clients?.length || 0}`);
      clients?.forEach(client => {
        console.log(`  - ${client.nome} (ID: ${client.id}, Company: ${client.company_id})`);
      });
    }
    
    // 2. Testar busca de multas por client_id
    if (clients && clients.length > 0) {
      const clienteId = clients[0].id;
      console.log(`\n2️⃣ TESTANDO BUSCA DE MULTAS PARA CLIENTE: ${clients[0].nome}`);
      
      const { data: multas, error: multasError } = await supabase
        .from('multas')
        .select('*')
        .eq('client_id', clienteId);
      
      if (multasError) {
        console.error('❌ Erro ao buscar multas por client_id:', multasError);
        console.log('🔍 Detalhes do erro:', JSON.stringify(multasError, null, 2));
      } else {
        console.log(`✅ Multas encontradas: ${multas?.length || 0}`);
        if (multas && multas.length > 0) {
          console.log('📋 Primeiras 3 multas:');
          multas.slice(0, 3).forEach((multa, index) => {
            console.log(`  ${index + 1}. Placa: ${multa.placa_veiculo}, Infração: ${multa.descricao_infracao}`);
          });
        }
      }
    }
    
    // 3. Testar o mesmo que o multasService.getMultas faz
    console.log('\n3️⃣ SIMULANDO CHAMADA DO MULTASSERVICE:');
    
    if (clients && clients.length > 0) {
      const clienteId = clients[0].id;
      
      // Replicar exatamente o que o multasService faz
      let query = supabase
        .from('multas')
        .select('*')
        .order('data_infracao', { ascending: false });
      
      // Aplicar filtro por clientId
      query = query.eq('client_id', clienteId);
      
      const { data: multasService, error: serviceError } = await query;
      
      if (serviceError) {
        console.error('❌ Erro na simulação do multasService:', serviceError);
      } else {
        console.log(`✅ MultasService simulado - Multas encontradas: ${multasService?.length || 0}`);
      }
    }
    
    // 4. Verificar se há diferença entre company_id e client_id
    console.log('\n4️⃣ COMPARANDO ACESSO POR COMPANY_ID vs CLIENT_ID:');
    
    if (clients && clients.length > 0) {
      const cliente = clients[0];
      
      // Buscar por company_id
      const { data: multasCompany, error: companyError } = await supabase
        .from('multas')
        .select('*')
        .eq('company_id', cliente.company_id)
        .limit(10);
      
      // Buscar por client_id
      const { data: multasClient, error: clientError } = await supabase
        .from('multas')
        .select('*')
        .eq('client_id', cliente.id);
      
      console.log('📊 Resultados da comparação:');
      console.log(`  - Por company_id (${cliente.company_id}): ${multasCompany?.length || 0} multas`);
      console.log(`  - Por client_id (${cliente.id}): ${multasClient?.length || 0} multas`);
      
      if (companyError) {
        console.log('  - Erro company_id:', companyError.message);
      }
      if (clientError) {
        console.log('  - Erro client_id:', clientError.message);
      }
    }
    
    // 5. Verificar estrutura da tabela multas
    console.log('\n5️⃣ VERIFICANDO ESTRUTURA DA TABELA MULTAS:');
    
    const { data: sampleMulta, error: sampleError } = await supabase
      .from('multas')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleError) {
      console.error('❌ Erro ao buscar amostra:', sampleError);
    } else if (sampleMulta) {
      console.log('📋 Campos disponíveis na tabela multas:');
      Object.keys(sampleMulta).forEach(key => {
        console.log(`  - ${key}: ${typeof sampleMulta[key]} (${sampleMulta[key] ? 'preenchido' : 'vazio'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

async function testarClienteEspecifico() {
  console.log('\n🎯 === TESTE COM CLIENTE ESPECÍFICO (F&Z CONSULTORIA) ===\n');
  
  try {
    // Buscar empresa F&Z CONSULTORIA
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .ilike('nome', '%F&Z%CONSULTORIA%')
      .single();
    
    if (companyError || !company) {
      console.log('⚠️ Empresa F&Z CONSULTORIA não encontrada, buscando qualquer empresa...');
      
      const { data: anyCompany, error: anyError } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single();
      
      if (anyError || !anyCompany) {
        console.error('❌ Nenhuma empresa encontrada:', anyError);
        return;
      }
      
      console.log(`✅ Usando empresa: ${anyCompany.nome} (ID: ${anyCompany.id})`);
      
      // Buscar clientes desta empresa
      const { data: companyClients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', anyCompany.id)
        .limit(3);
      
      if (clientsError) {
        console.error('❌ Erro ao buscar clientes da empresa:', clientsError);
        return;
      }
      
      console.log(`📋 Clientes da empresa: ${companyClients?.length || 0}`);
      
      if (companyClients && companyClients.length > 0) {
        const cliente = companyClients[0];
        console.log(`\n🔍 Testando com cliente: ${cliente.nome} (ID: ${cliente.id})`);
        
        // Buscar multas deste cliente
        const { data: clientMultas, error: multasError } = await supabase
          .from('multas')
          .select('*')
          .eq('client_id', cliente.id);
        
        if (multasError) {
          console.error('❌ Erro ao buscar multas do cliente:', multasError);
        } else {
          console.log(`✅ Multas do cliente encontradas: ${clientMultas?.length || 0}`);
          
          if (clientMultas && clientMultas.length > 0) {
            console.log('📋 Detalhes das multas:');
            clientMultas.slice(0, 5).forEach((multa, index) => {
              console.log(`  ${index + 1}. ${multa.placa_veiculo} - ${multa.descricao_infracao} (Company: ${multa.company_id})`);
            });
          } else {
            console.log('⚠️ Cliente não possui multas cadastradas');
          }
        }
      }
    } else {
      console.log(`✅ Empresa F&Z CONSULTORIA encontrada: ${company.nome} (ID: ${company.id})`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste específico:', error);
  }
}

async function main() {
  console.log('🚀 === DIAGNÓSTICO COMPLETO DE ACESSO ÀS MULTAS ===\n');
  
  await testarAcessoMultasCliente();
  await testarClienteEspecifico();
  
  console.log('\n✅ === DIAGNÓSTICO CONCLUÍDO ===');
  console.log('📝 Verifique os resultados acima para identificar o problema.');
}

// Executar o teste
main().catch(console.error);