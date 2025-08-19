import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';

// Cria cliente Supabase com chave anônima
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Usuários de teste
const testUsers = [
  {
    email: 'admin@multastrae.com',
    password: 'Admin@123',
    userDetails: {
      nome: 'Administrador Sistema',
      role: 'admin',
      company_id: 'comp_001',
      ativo: true
    }
  },
  {
    email: 'operador@multastrae.com',
    password: 'User@123',
    userDetails: {
      nome: 'João Silva',
      role: 'user',
      company_id: 'comp_001',
      ativo: true
    }
  },
  {
    email: 'visualizador@multastrae.com',
    password: 'Viewer@123',
    userDetails: {
      nome: 'Maria Santos',
      role: 'viewer',
      company_id: 'comp_001',
      ativo: true
    }
  },
  {
    email: 'gerente@outraempresa.com',
    password: 'Gerente@123',
    userDetails: {
      nome: 'Carlos Ferreira',
      role: 'user',
      company_id: 'comp_002',
      ativo: true
    }
  },
  {
    email: 'inativo@multastrae.com',
    password: 'Inativo@123',
    userDetails: {
      nome: 'Pedro Oliveira',
      role: 'user',
      company_id: 'comp_001',
      ativo: false
    }
  },
  {
    email: 'cliente@multastrae.com',
    password: 'Cliente@123',
    userDetails: {
      nome: 'Ana Souza',
      role: 'user',
      company_id: 'comp_001',
      client_id: 'client_001',
      ativo: true
    }
  }
];

// Função para criar um usuário
async function createUser(userData) {
  try {
    // 1. Criar o usuário na autenticação do Supabase usando signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password
    });

    if (authError) {
      throw new Error(`Erro ao criar usuário de autenticação: ${authError.message}`);
    }

    console.log(`Usuário de autenticação criado: ${userData.email}`);

    // 2. Aguardar um pouco para garantir que o usuário foi criado
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Criar o perfil do usuário na tabela users
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          ...userData.userDetails,
          ultimo_login: new Date().toISOString()
        });

      if (profileError) {
        console.warn(`Aviso ao criar perfil do usuário ${userData.email}:`, profileError.message);
        // Não vamos falhar aqui, pois o usuário de autenticação já foi criado
      } else {
        console.log(`Perfil do usuário criado: ${userData.email}`);
      }
    }

    return true;
  } catch (error) {
    console.error(`Falha ao criar usuário ${userData.email}:`, error);
    return false;
  }
}

// Função principal para criar todos os usuários
async function createAllUsers() {
  console.log('Iniciando criação de usuários de teste...');
  
  for (const user of testUsers) {
    console.log(`Processando usuário: ${user.email}`);
    await createUser(user);
  }
  
  console.log('Processo finalizado!');
}

// Executar o script
createAllUsers()
  .catch(error => {
    console.error('Erro na execução do script:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Script finalizado.');
    process.exit(0);
  });
