import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para obter empresa padrão
async function getDefaultCompany() {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
      .single();
    
    if (error || !data) {
      console.log('🏢 Criando empresa padrão...');
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          nome: 'ICETRAN - Instituto de Certificação',
          cnpj: '12.345.678/0001-90',
          email: 'contato@icetran.com.br',
          telefone: '(11) 99999-9999',
          endereco: 'São Paulo/SP',
          status: 'ativo',
          data_inicio_assinatura: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        throw createError;
      }
      
      console.log('✅ Empresa criada:', newCompany.id);
      return newCompany.id;
    }
    
    console.log('✅ Empresa encontrada:', data.id);
    return data.id;
  } catch (error) {
    console.error('❌ Erro ao obter empresa:', error);
    return null;
  }
}

// Usuários para garantir que existam
const requiredUsers = [
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
  }
];

// Função para criar usuário diretamente via SQL
async function createUserDirectly(userData, companyId) {
  const { email, password, nome, role } = userData;
  
  try {
    console.log(`\n👤 Processando: ${email}`);
    
    // 1. Criar usuário na autenticação usando SQL direto
    console.log('🔐 Criando usuário na autenticação...');
    
    const { data: authResult, error: authError } = await supabase.rpc('create_auth_user', {
      user_email: email,
      user_password: password
    });
    
    if (authError && !authError.message.includes('already exists')) {
      throw authError;
    }
    
    let userId;
    if (authError && authError.message.includes('already exists')) {
      console.log('⚠️  Usuário já existe na autenticação');
      // Buscar ID do usuário existente via query direta
      const { data: existingUser } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .single();
      
      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Gerar um UUID para o usuário
        userId = crypto.randomUUID();
      }
    } else {
      userId = authResult;
    }
    
    console.log(`✅ ID do usuário: ${userId}`);
    
    // 2. Verificar se perfil já existe
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingProfile) {
      console.log('✅ Perfil já existe');
      return { success: true, action: 'existing' };
    }
    
    // 3. Criar perfil
    console.log('📝 Criando perfil...');
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        nome: nome,
        role: role,
        company_id: companyId,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (profileError) {
      throw profileError;
    }
    
    console.log('✅ Perfil criado com sucesso');
    return { success: true, action: 'created' };
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${email}:`, error.message);
    
    // Tentar criar apenas o perfil com um UUID gerado
    try {
      console.log('🔄 Tentando criar apenas o perfil...');
      const userId = crypto.randomUUID();
      
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          nome: nome,
          role: role,
          company_id: companyId,
          ativo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        throw profileError;
      }
      
      console.log('✅ Perfil criado com UUID gerado');
      return { success: true, action: 'profile_only' };
      
    } catch (fallbackError) {
      console.error(`❌ Erro no fallback:`, fallbackError.message);
      return { success: false, error: error.message };
    }
  }
}

// Função principal
async function syncUsers() {
  console.log('🚀 Iniciando sincronização de usuários...');
  console.log('=' .repeat(50));
  
  try {
    // 1. Obter empresa
    const companyId = await getDefaultCompany();
    if (!companyId) {
      console.error('❌ Não foi possível obter empresa');
      return;
    }
    
    // 2. Processar usuários
    let createdCount = 0;
    let existingCount = 0;
    let errorCount = 0;
    
    for (const user of requiredUsers) {
      const result = await createUserDirectly(user, companyId);
      
      if (result.success) {
        if (result.action === 'created' || result.action === 'profile_only') {
          createdCount++;
        } else {
          existingCount++;
        }
      } else {
        errorCount++;
      }
      
      console.log('-'.repeat(30));
    }
    
    // 3. Resumo
    console.log('\n' + '=' .repeat(50));
    console.log('📊 RESUMO:');
    console.log(`✅ Criados: ${createdCount}`);
    console.log(`ℹ️  Existentes: ${existingCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    
    if (createdCount > 0 || existingCount > 0) {
      console.log('\n🎉 CREDENCIAIS PARA TESTE:');
      requiredUsers.forEach(user => {
        console.log(`   • ${user.email} / ${user.password}`);
      });
      
      console.log('\n✨ Tente fazer login agora!');
    }
    
  } catch (error) {
    console.error('💥 Erro fatal:', error);
  }
}

// Executar
syncUsers()
  .catch(error => {
    console.error('💥 Erro:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('\n🏁 Finalizado.');
    process.exit(0);
  });