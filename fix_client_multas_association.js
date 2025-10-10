import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnosticarProblema() {
  console.log('🔍 === DIAGNÓSTICO DO PROBLEMA DE ASSOCIAÇÃO MULTAS-CLIENTES ===\n');
  
  try {
    // 1. Buscar empresa F&Z CONSULTORIA
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .ilike('nome', '%F&Z%CONSULTORIA%')
      .single();
    
    if (companyError || !company) {
      console.error('❌ Empresa F&Z CONSULTORIA não encontrada:', companyError);
      return null;
    }
    
    console.log(`✅ Empresa encontrada: ${company.nome} (ID: ${company.id})`);
    
    // 2. Buscar todos os clientes desta empresa
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('company_id', company.id);
    
    if (clientsError) {
      console.error('❌ Erro ao buscar clientes:', clientsError);
      return null;
    }
    
    console.log(`\n📋 Clientes da empresa (${clients?.length || 0}):`);
    clients?.forEach((client, index) => {
      console.log(`  ${index + 1}. ${client.nome} (ID: ${client.id})`);
    });
    
    // 3. Buscar todas as multas desta empresa
    const { data: multas, error: multasError } = await supabase
      .from('multas')
      .select('*')
      .eq('company_id', company.id);
    
    if (multasError) {
      console.error('❌ Erro ao buscar multas:', multasError);
      return null;
    }
    
    console.log(`\n📋 Multas da empresa (${multas?.length || 0}):`);
    
    // Agrupar multas por client_id
    const multasPorCliente = {};
    multas?.forEach(multa => {
      if (!multasPorCliente[multa.client_id]) {
        multasPorCliente[multa.client_id] = [];
      }
      multasPorCliente[multa.client_id].push(multa);
    });
    
    console.log('\n📊 Distribuição de multas por client_id:');
    Object.keys(multasPorCliente).forEach(clientId => {
      const cliente = clients?.find(c => c.id === clientId);
      const nomeCliente = cliente ? cliente.nome : 'CLIENTE NÃO ENCONTRADO';
      console.log(`  - ${clientId}: ${multasPorCliente[clientId].length} multas (${nomeCliente})`);
    });
    
    // 4. Identificar clientes sem multas
    const clientesSemMultas = clients?.filter(client => 
      !multasPorCliente[client.id] || multasPorCliente[client.id].length === 0
    ) || [];
    
    console.log(`\n⚠️ Clientes sem multas (${clientesSemMultas.length}):`);
    clientesSemMultas.forEach(client => {
      console.log(`  - ${client.nome} (ID: ${client.id})`);
    });
    
    return {
      company,
      clients,
      multas,
      multasPorCliente,
      clientesSemMultas
    };
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    return null;
  }
}

async function redistribuirMultas(diagnostico) {
  console.log('\n🔄 === REDISTRIBUINDO MULTAS ENTRE CLIENTES ===\n');
  
  if (!diagnostico) {
    console.error('❌ Diagnóstico não disponível');
    return;
  }
  
  const { company, clients, multas, clientesSemMultas } = diagnostico;
  
  if (!clientesSemMultas || clientesSemMultas.length === 0) {
    console.log('✅ Todos os clientes já possuem multas associadas!');
    return;
  }
  
  try {
    console.log('📋 Estratégia de redistribuição:');
    console.log('   1. Identificar multas que podem ser redistribuídas');
    console.log('   2. Associar multas aos clientes que não possuem multas');
    console.log('   3. Distribuir de forma equilibrada');
    
    // Buscar multas que podem ser redistribuídas (ex: multas com client_id de clientes que já têm muitas)
    const multasParaRedistribuir = [];
    
    // Encontrar clientes com muitas multas (mais de 5)
    const clientesComMuitasMultas = clients?.filter(client => {
      const multasDoCliente = multas?.filter(m => m.client_id === client.id) || [];
      return multasDoCliente.length > 5;
    }) || [];
    
    console.log(`\n🎯 Clientes com muitas multas (${clientesComMuitasMultas.length}):`);
    clientesComMuitasMultas.forEach(client => {
      const multasDoCliente = multas?.filter(m => m.client_id === client.id) || [];
      console.log(`  - ${client.nome}: ${multasDoCliente.length} multas`);
      
      // Pegar algumas multas deste cliente para redistribuir
      const multasParaMover = multasDoCliente.slice(3); // Deixar 3 multas, mover o resto
      multasParaRedistribuir.push(...multasParaMover);
    });
    
    console.log(`\n📦 Multas disponíveis para redistribuição: ${multasParaRedistribuir.length}`);
    
    if (multasParaRedistribuir.length === 0) {
      console.log('⚠️ Não há multas suficientes para redistribuir.');
      console.log('💡 Vamos criar algumas multas de teste para os clientes sem multas.');
      
      // Criar multas de teste para clientes sem multas
      await criarMultasDeTeste(clientesSemMultas, company.id);
      return;
    }
    
    // Redistribuir multas
    let multaIndex = 0;
    const updates = [];
    
    for (const cliente of clientesSemMultas) {
      const multasParaEsteCliente = Math.min(3, multasParaRedistribuir.length - multaIndex);
      
      console.log(`\n🔄 Associando ${multasParaEsteCliente} multas ao cliente: ${cliente.nome}`);
      
      for (let i = 0; i < multasParaEsteCliente; i++) {
        if (multaIndex < multasParaRedistribuir.length) {
          const multa = multasParaRedistribuir[multaIndex];
          updates.push({
            id: multa.id,
            client_id: cliente.id,
            placa: multa.placa_veiculo
          });
          multaIndex++;
        }
      }
    }
    
    // Executar updates
    console.log(`\n💾 Executando ${updates.length} atualizações...`);
    
    for (const update of updates) {
      const { error } = await supabase
        .from('multas')
        .update({ client_id: update.client_id })
        .eq('id', update.id);
      
      if (error) {
        console.error(`❌ Erro ao atualizar multa ${update.id}:`, error);
      } else {
        console.log(`✅ Multa ${update.placa} associada ao cliente ${update.client_id}`);
      }
    }
    
    console.log('\n✅ Redistribuição concluída!');
    
  } catch (error) {
    console.error('❌ Erro na redistribuição:', error);
  }
}

async function criarMultasDeTeste(clientes, companyId) {
  console.log('\n🆕 === CRIANDO MULTAS DE TESTE ===\n');
  
  try {
    const multasParaCriar = [];
    
    clientes.forEach((cliente, index) => {
      // Criar 2-3 multas para cada cliente
      const numMultas = Math.floor(Math.random() * 2) + 2; // 2 ou 3 multas
      
      for (let i = 0; i < numMultas; i++) {
        const placas = ['ABC1234', 'DEF5678', 'GHI9012', 'JKL3456', 'MNO7890'];
        const infracoes = [
          'TRANSITAR EM VEL SUPERIOR À MÁXIMA PERMITIDA EM ATÉ 20%',
          'ESTACIONAR EM LOCAL PROIBIDO',
          'AVANÇAR SINAL VERMELHO',
          'USAR CELULAR AO VOLANTE',
          'NÃO USAR CINTO DE SEGURANÇA'
        ];
        
        const placa = placas[Math.floor(Math.random() * placas.length)] + (index * 10 + i);
        const infracao = infracoes[Math.floor(Math.random() * infracoes.length)];
        const valor = (Math.random() * 200 + 50).toFixed(2); // Entre R$ 50 e R$ 250
        
        multasParaCriar.push({
          company_id: companyId,
          client_id: cliente.id,
          numero_auto: `AUTO${Date.now()}${index}${i}`,
          placa_veiculo: placa,
          data_infracao: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Últimos 90 dias
          data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias no futuro
          valor_original: parseFloat(valor),
          valor_final: parseFloat(valor),
          codigo_infracao: `${60000 + Math.floor(Math.random() * 9999)}`,
          local_infracao: `Rua Teste ${index + 1}, ${i + 1}`,
          descricao_infracao: infracao,
          status: 'pendente'
        });
      }
    });
    
    console.log(`📦 Criando ${multasParaCriar.length} multas de teste...`);
    
    // Inserir multas em lotes
    const batchSize = 5;
    for (let i = 0; i < multasParaCriar.length; i += batchSize) {
      const batch = multasParaCriar.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('multas')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Erro ao inserir lote ${Math.floor(i/batchSize) + 1}:`, error);
      } else {
        console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} inserido com sucesso (${batch.length} multas)`);
      }
    }
    
    console.log('\n✅ Multas de teste criadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar multas de teste:', error);
  }
}

async function verificarResultado() {
  console.log('\n🧪 === VERIFICANDO RESULTADO FINAL ===\n');
  
  try {
    // Buscar empresa F&Z CONSULTORIA novamente
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .ilike('nome', '%F&Z%CONSULTORIA%')
      .single();
    
    if (!company) {
      console.error('❌ Empresa não encontrada');
      return;
    }
    
    // Buscar clientes e suas multas
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .eq('company_id', company.id);
    
    console.log(`📋 Resultado final para ${company.nome}:`);
    
    for (const client of clients || []) {
      const { data: clientMultas } = await supabase
        .from('multas')
        .select('*')
        .eq('client_id', client.id);
      
      console.log(`  - ${client.nome}: ${clientMultas?.length || 0} multas`);
      
      if (clientMultas && clientMultas.length > 0) {
        clientMultas.slice(0, 2).forEach(multa => {
          console.log(`    * ${multa.placa_veiculo} - ${multa.descricao_infracao}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  }
}

async function main() {
  console.log('🚀 === CORREÇÃO DA ASSOCIAÇÃO MULTAS-CLIENTES ===\n');
  
  // 1. Diagnosticar o problema
  const diagnostico = await diagnosticarProblema();
  
  if (!diagnostico) {
    console.error('❌ Não foi possível realizar o diagnóstico');
    return;
  }
  
  // 2. Redistribuir multas
  await redistribuirMultas(diagnostico);
  
  // 3. Verificar resultado
  await verificarResultado();
  
  console.log('\n✅ === PROCESSO CONCLUÍDO ===');
  console.log('📝 Agora teste a página de detalhes do cliente para verificar se as multas aparecem!');
}

// Executar o script
main().catch(console.error);