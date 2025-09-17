import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQ2Mjk3NCwiZXhwIjoyMDUwMDM4OTc0fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestClient() {
  try {
    console.log('👤 Criando cliente de teste no Supabase...');
    
    const clientData = {
      nome: 'ANA PAULA CARVALHO ZORZZI',
      cpf_cnpj: '12345678901',
      email: 'ana.paula@email.com',
      telefone: '(47) 99999-9999',
      endereco: 'Rua Teste, 123',
      cidade: 'Joinville',
      estado: 'SC',
      cep: '89200-000',
      company_id: '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
      asaas_customer_id: 'cus_test_' + Date.now(),
      status: 'ativo'
    };
    
    console.log('📋 Dados do cliente:', clientData);
    
    const { data: client, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar cliente:', error);
      return null;
    }
    
    console.log('✅ Cliente criado com sucesso!');
    console.log('🆔 ID do cliente:', client.id);
    console.log('👤 Nome:', client.nome);
    
    return client.id;
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
    return null;
  }
}

// Executar
createTestClient().then(clientId => {
  if (clientId) {
    console.log('\n🎯 CLIENTE CRIADO COM SUCESSO!');
    console.log('📋 Use este ID no teste:', clientId);
    console.log('\n🔄 Agora execute: node test_save_api_with_valid_client.js');
  } else {
    console.log('\n❌ Falha ao criar cliente');
  }
});