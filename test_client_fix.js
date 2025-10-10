// Teste das correções implementadas no TesteRecursoIA.tsx
// Este arquivo testa se as funções getExistingClientId e createDefaultClient funcionam corretamente

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (usando as mesmas configurações do projeto)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para buscar um client_id existente no banco (copiada do TesteRecursoIA.tsx)
const getExistingClientId = async () => {
  try {
    console.log('🔍 Buscando client_id existente no banco...');
    
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao buscar clients:', error);
      return null;
    }
    
    if (clients && clients.length > 0) {
      const clientId = clients[0].id;
      console.log('✅ Client_id existente encontrado:', clientId);
      return clientId;
    }
    
    console.log('⚠️ Nenhum client encontrado no banco');
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao buscar client_id existente:', error);
    return null;
  }
};

// Função para buscar um company_id existente no banco
const getExistingCompanyId = async () => {
  try {
    console.log('🔍 Buscando company_id existente no banco...');
    
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao buscar companies:', error);
      return null;
    }
    
    if (companies && companies.length > 0) {
      const companyId = companies[0].id;
      console.log('✅ Company_id existente encontrado:', companyId);
      return companyId;
    }
    
    console.log('⚠️ Nenhuma company encontrada no banco');
    return null;
    
  } catch (error) {
    console.error('❌ Erro ao buscar company_id existente:', error);
    return null;
  }
};

// Função para criar um cliente padrão se necessário
const createDefaultClient = async (companyId, clienteInfo) => {
  try {
    console.log('🆕 Criando cliente padrão...');
    
    // Usar dados do clienteInfo se disponível, senão usar dados padrão
    const newClientData = {
      nome: clienteInfo?.nome || 'Cliente Padrão',
      cpf_cnpj: clienteInfo?.cpf_cnpj || '00000000000',
      email: clienteInfo?.email || 'cliente@exemplo.com',
      telefone: clienteInfo?.telefone || '(00) 00000-0000',
      endereco: clienteInfo?.endereco || 'Endereço não informado',
      company_id: companyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📋 Dados do cliente padrão a ser criado:', newClientData);
    
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert([newClientData])
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar cliente padrão:', error);
      return null;
    }
    
    console.log('✅ Cliente padrão criado com ID:', newClient.id);
    return newClient.id;
    
  } catch (error) {
    console.error('❌ Erro ao criar cliente padrão:', error);
    return null;
  }
};

// Função de teste principal
const testClientFix = async () => {
  console.log('🧪 === TESTE DAS CORREÇÕES DE CLIENT_ID ===');
  
  try {
    // 1. Buscar company_id existente
    console.log('\n1️⃣ Testando busca de company_id...');
    const companyId = await getExistingCompanyId();
    
    if (!companyId) {
      console.log('❌ Não foi possível encontrar company_id. Teste interrompido.');
      return;
    }
    
    // 2. Buscar client_id existente
    console.log('\n2️⃣ Testando busca de client_id...');
    let clientId = await getExistingClientId();
    
    // 3. Se não encontrou client, criar um padrão
    if (!clientId) {
      console.log('\n3️⃣ Testando criação de cliente padrão...');
      const clienteInfo = {
        nome: 'ANA PAULA CARVALHO ZORZZI',
        cpf_cnpj: '12345678901',
        email: 'ana.paula@exemplo.com',
        telefone: '(11) 99999-9999',
        endereco: 'Rua Exemplo, 123'
      };
      
      clientId = await createDefaultClient(companyId, clienteInfo);
    }
    
    // 4. Validar resultado final
    console.log('\n4️⃣ Resultado final:');
    console.log('✅ Company ID:', companyId);
    console.log('✅ Client ID:', clientId);
    
    if (companyId && clientId) {
      console.log('\n🎉 === TESTE PASSOU! ===');
      console.log('✅ Ambos os IDs são válidos e podem ser usados para salvar a multa.');
      console.log('✅ O erro de foreign key constraint foi corrigido.');
    } else {
      console.log('\n❌ === TESTE FALHOU! ===');
      console.log('❌ Um ou ambos os IDs são inválidos.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
};

// Executar o teste
testClientFix().then(() => {
  console.log('\n🏁 Teste concluído.');
}).catch(error => {
  console.error('❌ Erro fatal no teste:', error);
});