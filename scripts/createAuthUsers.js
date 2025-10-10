import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase com service_role_key para permissões administrativas
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para obter ou criar empresa padrão
async function getOrCreateDefaultCompany() {
  try {
    console.log('🏢 Verificando empresa padrão...');
    
    // Primeiro, tenta buscar uma empresa existente
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('cnpj', '12.345.678/0001-90')
      .single();

    if (existingCompany) {
      console.log('✅ Empresa padrão encontrada:', existingCompany.id);
      return existingCompany.id;
    }

    // Se não existe, cria uma nova
    console.log('🔄 Criando empresa padrão...');
    const { data, error } = await supabase
      .from('companies')
      .insert({
        nome: 'Empresa Padrão ICETRAN',
        cnpj: '12.345.678/0001-90',
        email: 'contato@empresapadrao.com',
        telefone: '(11) 99999-9999',
        endereco: 'Rua Padrão, 123 - São Paulo/SP',
        status: 'ativo',
        data_inicio_assinatura: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Empresa padrão criada:', data.id);
    return data.id;
  } catch (error) {
    console.error('❌ Erro ao obter/criar empresa:', error);
    return null;
  }
}

// Usuários para criar
const usersToCreate = [
  {
    email: 'operador@icetran.com.br',
    password: 'User@123',
    nome: 'Operador ICETRAN',
    role: 'user'
  },
  {
    email: 'admin@icetran.com.br',
    password: 'Admin@123',
    nome: 'Administrador ICETRAN',
    role: 'admin'
  },
  {
    email: 'operador@multastrae.com',
    password: 'User@123',
    nome: 'João Silva',
    role: 'user'
  },
  {
    email: 'admin@multastrae.com',
    password: 'Admin@123',
    nome: 'Administrador Sistema',
    role: 'admin'
  },
  {
    email: 'visualizador@multastrae.com',
    password: 'Viewer@123',
    nome: 'Maria Santos',
    role: 'viewer'
  }
];

// Função para buscar usuário na autenticação por email
async function findAuthUserByEmail(email) {
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    return users.users.find(u => u.email === email);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return null;
  }
}

// Função para criar um usuário completo (auth + perfil)
async function createCompleteUser(userData, companyId) {
  const { email, password, nome, role } = userData;
  
  try {
    console.log(`\n👤 Processando usuário: ${email}`);
    console.log(`   Nome: ${nome}`);
    console.log(`   Role: ${role}`);
    
    let userId;
    let authUserExists = false;
    
    // 1. Verificar se usuário já existe na autenticação
    console.log('🔍 Verificando usuário na autenticação...');
    const existingAuthUser = await findAuthUserByEmail(email);
    
    if (existingAuthUser) {
      userId = existingAuthUser.id;
      authUserExists = true;
      console.log(`✅ Usuário já existe na autenticação: ${userId}`);
    } else {
      // Criar usuário na autenticação
      console.log('🔐 Criando usuário na autenticação...');
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      });

      if (authError) {
        throw authError;
      }
      
      userId = authData.user.id;
      console.log(`✅ Usuário criado na autenticação: ${userId}`);
    }
    
    // 2. Verificar se já existe perfil na tabela users
    console.log('📋 Verificando perfil existente...');
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id, email, nome, role')
      .eq('id', userId)
      .single();
    
    if (existingProfile) {
      console.log('✅ Perfil já existe na tabela users');
      console.log(`   Email: ${existingProfile.email}`);
      console.log(`   Nome: ${existingProfile.nome}`);
      console.log(`   Role: ${existingProfile.role}`);
      return { success: true, action: 'existing' };
    }
    
    // 3. Verificar se existe perfil com o mesmo email (mas ID diferente)
    const { data: profileByEmail } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (profileByEmail) {
      console.log(`⚠️  Perfil com email ${email} já existe com ID diferente: ${profileByEmail.id}`);
      console.log('🔄 Atualizando ID do perfil para corresponder à autenticação...');
      
      // Atualizar o ID do perfil existente
      const { error: updateError } = await supabase
        .from('users')
        .update({ id: userId })
        .eq('email', email);
      
      if (updateError) {
        console.log('❌ Erro ao atualizar ID, tentando deletar e recriar...');
        
        // Se não conseguir atualizar, deletar e recriar
        await supabase.from('users').delete().eq('email', email);
        
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: email,
            nome: nome,
            role: role,
            company_id: companyId,
            ativo: true,
            ultimo_login: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          throw new Error(`Erro ao recriar perfil: ${insertError.message}`);
        }
        
        console.log('✅ Perfil recriado com sucesso');
      } else {
        console.log('✅ ID do perfil atualizado com sucesso');
      }
      
      return { success: true, action: 'updated' };
    }
    
    // 4. Criar novo perfil na tabela users
    console.log('📝 Criando perfil na tabela users...');
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        nome: nome,
        role: role,
        company_id: companyId,
        ativo: true,
        ultimo_login: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      throw new Error(`Erro ao criar perfil: ${profileError.message}`);
    }

    console.log('✅ Perfil criado com sucesso na tabela users');
    return { success: true, action: 'created' };
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${email}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Função principal
async function createAllAuthUsers() {
  console.log('🚀 Iniciando sincronização de usuários...');
  console.log('=' .repeat(60));
  
  try {
    // 1. Obter empresa padrão
    const defaultCompanyId = await getOrCreateDefaultCompany();
    if (!defaultCompanyId) {
      console.error('❌ Não foi possível obter empresa padrão. Abortando.');
      return;
    }
    
    // 2. Processar todos os usuários
    let createdCount = 0;
    let updatedCount = 0;
    let existingCount = 0;
    let errorCount = 0;
    
    for (const user of usersToCreate) {
      const result = await createCompleteUser(user, defaultCompanyId);
      
      if (result.success) {
        if (result.action === 'created') {
          createdCount++;
        } else if (result.action === 'updated') {
          updatedCount++;
        } else {
          existingCount++;
        }
      } else {
        errorCount++;
      }
      
      console.log('-'.repeat(40));
    }
    
    // 3. Resumo final
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESUMO FINAL:');
    console.log(`✅ Perfis criados: ${createdCount}`);
    console.log(`🔄 Perfis atualizados: ${updatedCount}`);
    console.log(`ℹ️  Perfis já existentes: ${existingCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📈 Total processado: ${usersToCreate.length}`);
    
    if (createdCount > 0 || updatedCount > 0 || existingCount > 0) {
      console.log('\n🎉 CREDENCIAIS DISPONÍVEIS:');
      usersToCreate.forEach(user => {
        console.log(`   • ${user.email} / ${user.password} (${user.role})`);
      });
      
      console.log('\n✨ Agora você pode fazer login com qualquer uma dessas credenciais!');
      console.log('\n🔧 Problema "Invalid login credentials" resolvido!');
    }
    
  } catch (error) {
    console.error('💥 Erro fatal:', error);
  }
}

// Executar o script
createAllAuthUsers()
  .catch(error => {
    console.error('💥 Erro na execução do script:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('\n🏁 Script finalizado.');
    process.exit(0);
  });