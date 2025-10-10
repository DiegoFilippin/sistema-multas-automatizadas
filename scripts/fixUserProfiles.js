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

// Função para determinar role baseado no email
function getRoleFromEmail(email) {
  if (email.includes('admin@')) {
    return 'admin';
  } else if (email.includes('operador@') || email.includes('user@')) {
    return 'user';
  } else if (email.includes('visualizador@') || email.includes('viewer@')) {
    return 'viewer';
  } else if (email.includes('master@')) {
    return 'admin_master';
  }
  return 'user'; // padrão
}

// Função para obter nome baseado no email
function getNameFromEmail(email) {
  const emailPart = email.split('@')[0];
  
  const nameMap = {
    'admin': 'Administrador Sistema',
    'operador': 'João Silva',
    'user': 'Usuário Sistema',
    'visualizador': 'Maria Santos',
    'viewer': 'Visualizador Sistema',
    'master': 'Master Admin'
  };
  
  return nameMap[emailPart] || `Usuário ${emailPart.charAt(0).toUpperCase() + emailPart.slice(1)}`;
}

// Função principal para corrigir perfis de usuários
async function fixUserProfiles() {
  console.log('🚀 Iniciando correção de perfis de usuários...');
  console.log('=' .repeat(60));
  
  try {
    // 1. Obter empresa padrão
    const defaultCompanyId = await getOrCreateDefaultCompany();
    if (!defaultCompanyId) {
      console.error('❌ Não foi possível obter empresa padrão. Abortando.');
      return;
    }
    
    // 2. Listar usuários existentes na tabela users
    console.log('\n📋 Verificando perfis existentes na tabela users...');
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('users')
      .select('id, email');
    
    if (profilesError) {
      throw new Error(`Erro ao buscar perfis existentes: ${profilesError.message}`);
    }
    
    console.log(`📊 Encontrados ${existingProfiles?.length || 0} perfis existentes`);
    
    // 3. Lista de usuários conhecidos que precisam de perfil
    const knownUsers = [
      {
        email: 'operador@multastrae.com',
        nome: 'João Silva',
        role: 'user'
      },
      {
        email: 'admin@multastrae.com',
        nome: 'Administrador Sistema',
        role: 'admin'
      },
      {
        email: 'visualizador@multastrae.com',
        nome: 'Maria Santos',
        role: 'viewer'
      },
      {
        email: 'admin@icetran.com.br',
        nome: 'Administrador ICETRAN',
        role: 'admin'
      },
      {
        email: 'operador@icetran.com.br',
        nome: 'Operador ICETRAN',
        role: 'user'
      },
      {
        email: 'visualizador@icetran.com.br',
        nome: 'Visualizador ICETRAN',
        role: 'viewer'
      }
    ];
    
    const existingEmails = new Set(existingProfiles?.map(p => p.email) || []);
    
    // 4. Criar perfis para usuários conhecidos que não existem
    console.log('\n🔧 Criando perfis para usuários conhecidos...');
    let successCount = 0;
    
    for (const user of knownUsers) {
      if (existingEmails.has(user.email)) {
        console.log(`✅ Perfil já existe para: ${user.email}`);
        continue;
      }
      
      try {
        console.log(`\n👤 Criando perfil para: ${user.email}`);
        console.log(`   Nome: ${user.nome}`);
        console.log(`   Role: ${user.role}`);
        
        // Gerar um UUID para o usuário
        const userId = crypto.randomUUID();
        
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: user.email,
            nome: user.nome,
            role: user.role,
            company_id: defaultCompanyId,
            ativo: true,
            ultimo_login: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Erro ao criar perfil para ${user.email}:`, insertError.message);
        } else {
          console.log(`✅ Perfil criado com sucesso para ${user.email}`);
          console.log(`   ID gerado: ${userId}`);
          successCount++;
        }
        
      } catch (error) {
        console.error(`❌ Erro inesperado ao processar ${user.email}:`, error.message);
      }
    }
    
    // 5. Verificação especial para operador@multastrae.com
    console.log('\n🎯 Verificação final para operador@multastrae.com...');
    const { data: operadorProfile } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'operador@multastrae.com')
      .single();
    
    if (operadorProfile) {
      console.log('✅ Perfil do operador@multastrae.com encontrado:');
      console.log(`   ID: ${operadorProfile.id}`);
      console.log(`   Nome: ${operadorProfile.nome}`);
      console.log(`   Role: ${operadorProfile.role}`);
      console.log(`   Company ID: ${operadorProfile.company_id}`);
      console.log(`   Ativo: ${operadorProfile.ativo}`);
    } else {
      console.log('⚠️  Perfil do operador@multastrae.com ainda não encontrado');
    }
    
    // 6. Resumo final
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESUMO DA OPERAÇÃO:');
    console.log(`   Usuários conhecidos: ${knownUsers.length}`);
    console.log(`   Perfis existentes antes: ${existingProfiles?.length || 0}`);
    console.log(`   Perfis criados com sucesso: ${successCount}`);
    console.log(`   Empresa padrão ID: ${defaultCompanyId}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Correção concluída! Agora você pode tentar fazer login com:');
      knownUsers.forEach(user => {
        if (!existingEmails.has(user.email)) {
          console.log(`   • ${user.email} (${user.role}) - Senha: User@123`);
        }
      });
      console.log('\n💡 Nota: Você precisará criar os usuários na autenticação do Supabase também.');
    }
    
  } catch (error) {
    console.error('💥 Erro fatal:', error);
  }
}

// Executar o script
fixUserProfiles()
  .catch(error => {
    console.error('💥 Erro na execução do script:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('\n🏁 Script finalizado.');
    process.exit(0);
  });