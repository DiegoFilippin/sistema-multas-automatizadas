import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnosticarPoliticasMultas() {
  console.log('🔍 === DIAGNÓSTICO DAS POLÍTICAS RLS DA TABELA MULTAS ===\n');
  
  try {
    // 1. Verificar políticas atuais da tabela multas
    console.log('1️⃣ VERIFICANDO POLÍTICAS ATUAIS:');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'multas');
    
    if (policiesError) {
      console.error('❌ Erro ao buscar políticas:', policiesError);
      return;
    }
    
    console.log('📋 Políticas encontradas:', policies?.length || 0);
    policies?.forEach(policy => {
      console.log(`  - ${policy.policyname}: ${policy.cmd} - ${policy.qual}`);
    });
    
    // 2. Testar acesso atual às multas
    console.log('\n2️⃣ TESTANDO ACESSO ATUAL ÀS MULTAS:');
    
    // Buscar algumas multas para teste
    const { data: multas, error: multasError } = await supabase
      .from('multas')
      .select('id, company_id, client_id, placa_veiculo')
      .limit(5);
    
    if (multasError) {
      console.error('❌ Erro ao buscar multas:', multasError);
    } else {
      console.log(`✅ Multas encontradas: ${multas?.length || 0}`);
      multas?.forEach(multa => {
        console.log(`  - ID: ${multa.id}, Company: ${multa.company_id}, Client: ${multa.client_id}, Placa: ${multa.placa_veiculo}`);
      });
    }
    
    // 3. Buscar dados de clientes para teste
    console.log('\n3️⃣ BUSCANDO DADOS DE CLIENTES:');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, nome, company_id')
      .limit(3);
    
    if (clientsError) {
      console.error('❌ Erro ao buscar clientes:', clientsError);
    } else {
      console.log(`✅ Clientes encontrados: ${clients?.length || 0}`);
      clients?.forEach(client => {
        console.log(`  - ID: ${client.id}, Nome: ${client.nome}, Company: ${client.company_id}`);
      });
    }
    
    // 4. Testar filtro por client_id (que deve estar falhando)
    if (clients && clients.length > 0) {
      const clienteId = clients[0].id;
      console.log(`\n4️⃣ TESTANDO FILTRO POR CLIENT_ID (${clienteId}):`);
      
      const { data: multasCliente, error: multasClienteError } = await supabase
        .from('multas')
        .select('*')
        .eq('client_id', clienteId);
      
      if (multasClienteError) {
        console.error('❌ Erro ao filtrar por client_id:', multasClienteError);
        console.log('🔍 Este é provavelmente o problema das políticas RLS!');
      } else {
        console.log(`✅ Multas do cliente encontradas: ${multasCliente?.length || 0}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  }
}

async function corrigirPoliticasMultas() {
  console.log('\n🔧 === CORRIGINDO POLÍTICAS RLS DA TABELA MULTAS ===\n');
  
  try {
    // 1. Remover política atual que pode estar causando problema
    console.log('1️⃣ REMOVENDO POLÍTICAS PROBLEMÁTICAS:');
    
    const politicasParaRemover = [
      'Users can manage company multas',
      'Users can view company multas',
      'Multas são visíveis para usuários da mesma empresa'
    ];
    
    for (const politica of politicasParaRemover) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `DROP POLICY IF EXISTS "${politica}" ON multas;`
      });
      
      if (error) {
        console.log(`⚠️ Política "${politica}" não encontrada ou erro:`, error.message);
      } else {
        console.log(`✅ Política "${politica}" removida`);
      }
    }
    
    // 2. Criar nova política que permite acesso por company_id E client_id
    console.log('\n2️⃣ CRIANDO NOVA POLÍTICA CORRIGIDA:');
    
    const novaPolitica = `
      CREATE POLICY "Users can access company multas and client multas" ON multas
        FOR ALL USING (
          -- Permitir acesso se a multa pertence à mesma empresa do usuário
          company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
          )
          OR
          -- OU se a multa pertence a um cliente da mesma empresa do usuário
          client_id IN (
            SELECT c.id FROM clients c
            INNER JOIN users u ON u.company_id = c.company_id
            WHERE u.id = auth.uid()
          )
        );
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: novaPolitica
    });
    
    if (createError) {
      console.error('❌ Erro ao criar nova política:', createError);
    } else {
      console.log('✅ Nova política criada com sucesso!');
    }
    
    // 3. Verificar se a nova política foi criada
    console.log('\n3️⃣ VERIFICANDO NOVA POLÍTICA:');
    const { data: newPolicies, error: newPoliciesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'multas');
    
    if (newPoliciesError) {
      console.error('❌ Erro ao verificar políticas:', newPoliciesError);
    } else {
      console.log('📋 Políticas atuais:');
      newPolicies?.forEach(policy => {
        console.log(`  - ${policy.policyname}: ${policy.cmd}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
  }
}

async function testarCorrecao() {
  console.log('\n🧪 === TESTANDO CORREÇÃO ===\n');
  
  try {
    // 1. Buscar um cliente para teste
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, nome, company_id')
      .limit(1)
      .single();
    
    if (clientsError || !clients) {
      console.error('❌ Erro ao buscar cliente para teste:', clientsError);
      return;
    }
    
    console.log(`1️⃣ TESTANDO COM CLIENTE: ${clients.nome} (ID: ${clients.id})`);
    
    // 2. Tentar buscar multas do cliente
    const { data: multasCliente, error: multasError } = await supabase
      .from('multas')
      .select('*')
      .eq('client_id', clients.id);
    
    if (multasError) {
      console.error('❌ Ainda há erro ao buscar multas por client_id:', multasError);
      console.log('🔍 A correção pode não ter funcionado completamente.');
    } else {
      console.log(`✅ Sucesso! Multas do cliente encontradas: ${multasCliente?.length || 0}`);
      if (multasCliente && multasCliente.length > 0) {
        console.log('📋 Primeiras multas:');
        multasCliente.slice(0, 3).forEach(multa => {
          console.log(`  - ${multa.placa_veiculo} - ${multa.descricao_infracao}`);
        });
      }
    }
    
    // 3. Testar também busca por company_id para garantir que ainda funciona
    console.log('\n2️⃣ TESTANDO BUSCA POR COMPANY_ID:');
    const { data: multasCompany, error: companyError } = await supabase
      .from('multas')
      .select('*')
      .eq('company_id', clients.company_id)
      .limit(5);
    
    if (companyError) {
      console.error('❌ Erro ao buscar por company_id:', companyError);
    } else {
      console.log(`✅ Multas da empresa encontradas: ${multasCompany?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

async function main() {
  console.log('🚀 === CORREÇÃO DAS POLÍTICAS RLS DA TABELA MULTAS ===\n');
  
  // Executar diagnóstico
  await diagnosticarPoliticasMultas();
  
  // Perguntar se deve prosseguir com a correção
  console.log('\n❓ Deseja prosseguir com a correção das políticas? (Pressione Ctrl+C para cancelar)');
  
  // Aguardar um pouco antes de prosseguir
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Executar correção
  await corrigirPoliticasMultas();
  
  // Testar correção
  await testarCorrecao();
  
  console.log('\n✅ === PROCESSO CONCLUÍDO ===');
  console.log('📝 Agora teste a página de detalhes do cliente para verificar se as multas aparecem!');
}

// Executar o script
main().catch(console.error);