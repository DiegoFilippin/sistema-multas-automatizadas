// Criar cliente FÁBIO RIGOLI DA ROSA no banco de dados
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzQ0NzI5MSwiZXhwIjoyMDQzMDIzMjkxfQ.test';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createFabioClient() {
  console.log('🧪 === CRIANDO CLIENTE FÁBIO RIGOLI DA ROSA ===');
  
  const clientData = {
    nome: 'FÁBIO RIGOLI DA ROSA',
    cpf_cnpj: '123.456.789-00',
    email: 'fabio.rigoli@email.com',
    telefone: '(48) 99999-9999',
    endereco: 'Rua das Flores, 123',
    cidade: 'Florianópolis',
    estado: 'SC',
    cep: '88000-000',
    company_id: '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
    created_at: new Date().toISOString()
  };
  
  try {
    // Verificar se cliente já existe
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, nome')
      .eq('nome', 'FÁBIO RIGOLI DA ROSA')
      .single();
    
    if (existingClient) {
      console.log('✅ Cliente FÁBIO já existe:', existingClient.id);
      return existingClient.id;
    }
    
    // Criar novo cliente
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar cliente:', error);
      return null;
    }
    
    console.log('✅ Cliente FÁBIO criado com sucesso!');
    console.log('  - ID:', newClient.id);
    console.log('  - Nome:', newClient.nome);
    
    return newClient.id;
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return null;
  }
}

// Executar
createFabioClient().then(clientId => {
  if (clientId) {
    console.log('\n🎉 CLIENTE CRIADO! ID:', clientId);
    console.log('Agora você pode usar este ID para criar cobranças.');
  } else {
    console.log('\n❌ FALHA AO CRIAR CLIENTE');
  }
}).catch(console.error);