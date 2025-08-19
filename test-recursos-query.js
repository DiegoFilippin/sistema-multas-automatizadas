// Teste simples para verificar a consulta de recursos
// Execute este código no console do navegador na página da aplicação

console.log('=== TESTE DE CONSULTA DE RECURSOS ===');

// Função para testar a consulta
async function testRecursosQuery() {
  try {
    console.log('1. Testando consulta de recursos com joins...');
    
    // Consulta atual do recursosService.ts
    const { data: recursos, error } = await window.supabase
      .from('recursos')
      .select(`
        *,
        multas!inner(
          id,
          numero_auto,
          placa_veiculo,
          descricao_infracao,
          valor_original,
          data_infracao,
          clients!inner(
            nome,
            cpf_cnpj
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro na consulta:', error);
      return;
    }

    console.log('✅ Recursos encontrados:', recursos?.length || 0);
    console.log('📋 Dados dos recursos:', recursos);

    // Verificar se os dados dos clientes estão presentes
    if (recursos && recursos.length > 0) {
      recursos.forEach((recurso, index) => {
        console.log(`\n--- Recurso ${index + 1} ---`);
        console.log('ID:', recurso.id);
        console.log('Tipo:', recurso.tipo_recurso);
        console.log('Status:', recurso.status);
        console.log('Multa ID:', recurso.multa_id);
        console.log('Dados da multa:', recurso.multas);
        
        if (recurso.multas && recurso.multas.clients) {
          console.log('✅ Cliente encontrado:');
          console.log('  Nome:', recurso.multas.clients.nome);
          console.log('  CPF/CNPJ:', recurso.multas.clients.cpf_cnpj);
        } else {
          console.log('❌ Dados do cliente não encontrados');
        }
      });
    }

    console.log('\n2. Verificando dados individuais das tabelas...');
    
    // Verificar recursos
    const { data: recursosOnly } = await window.supabase
      .from('recursos')
      .select('*');
    console.log('📊 Total de recursos na tabela:', recursosOnly?.length || 0);
    
    // Verificar multas
    const { data: multasOnly } = await window.supabase
      .from('multas')
      .select('*');
    console.log('📊 Total de multas na tabela:', multasOnly?.length || 0);
    
    // Verificar clientes
    const { data: clientsOnly } = await window.supabase
      .from('clients')
      .select('*');
    console.log('📊 Total de clientes na tabela:', clientsOnly?.length || 0);

    console.log('\n=== FIM DO TESTE ===');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
testRecursosQuery();

// Instruções para o usuário
console.log('\n📝 INSTRUÇÕES:');
console.log('1. Abra o console do navegador (F12)');
console.log('2. Navegue até a página de recursos da aplicação');
console.log('3. Cole e execute este código no console');
console.log('4. Verifique os resultados para identificar o problema');