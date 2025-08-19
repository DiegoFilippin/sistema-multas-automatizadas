import { authService } from '../src/services/authService.ts';

// Usuários de teste
const testUsers = [
  {
    email: 'admin@multastrae.com',
    password: 'Admin@123',
    nome: 'Administrador Sistema',
    company_id: '550e8400-e29b-41d4-a716-446655440001',
    role: 'admin'
  },
  {
    email: 'operador@multastrae.com',
    password: 'User@123',
    nome: 'João Silva',
    company_id: '550e8400-e29b-41d4-a716-446655440001',
    role: 'user'
  },
  {
    email: 'visualizador@multastrae.com',
    password: 'Viewer@123',
    nome: 'Maria Santos',
    company_id: '550e8400-e29b-41d4-a716-446655440001',
    role: 'viewer'
  },
  {
    email: 'gerente@outraempresa.com',
    password: 'Gerente@123',
    nome: 'Carlos Ferreira',
    company_id: '550e8400-e29b-41d4-a716-446655440001',
    role: 'user'
  },
  {
    email: 'cliente@multastrae.com',
    password: 'Cliente@123',
    nome: 'Ana Souza',
    company_id: '550e8400-e29b-41d4-a716-446655440001',
    role: 'user'
  }
];

// Função para criar um usuário usando authService
async function createUser(userData) {
  try {
    console.log(`Criando usuário: ${userData.email}`);
    
    const result = await authService.register(userData);
    
    console.log(`✅ Usuário criado com sucesso: ${userData.email}`);
    console.log(`   - ID: ${result.user.id}`);
    console.log(`   - Nome: ${result.user.nome}`);
    console.log(`   - Role: ${result.user.role}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Erro ao criar usuário ${userData.email}:`, error.message);
    return false;
  }
}

// Função principal
async function createAllUsers() {
  console.log('🚀 Iniciando criação de usuários de teste...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const user of testUsers) {
    const success = await createUser(user);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    // Aguardar um pouco entre as criações
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(''); // Linha em branco para separar
  }
  
  console.log('📊 Resumo:');
  console.log(`   ✅ Usuários criados com sucesso: ${successCount}`);
  console.log(`   ❌ Erros: ${errorCount}`);
  console.log('\n🎉 Processo finalizado!');
}

// Executar o script
createAllUsers()
  .catch(error => {
    console.error('💥 Erro na execução do script:', error);
    process.exit(1);
  });
