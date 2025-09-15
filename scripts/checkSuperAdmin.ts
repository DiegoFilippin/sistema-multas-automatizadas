import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Supabase com service_role_key para permissões administrativas
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Script para verificar e criar usuário superadmin (admin_master)
 * Credenciais: master@sistema.com / master123
 */

async function checkAndCreateSuperAdmin() {
  console.log('🔍 Verificando usuário superadmin...');
  
  try {
    // 1. Primeiro, tentar fazer login para verificar se o usuário existe e funciona
    console.log('🧪 Testando login direto...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'master@sistema.com',
      password: 'master123'
    });

    if (loginData.user && !loginError) {
      console.log('✅ Login realizado com sucesso! Usuário já existe e funciona.');
      console.log('👤 Usuário ID:', loginData.user.id);
      console.log('📧 Email:', loginData.user.email);
      
      // Verificar se o perfil existe
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', loginData.user.id)
        .single();

      if (profile) {
        console.log('✅ Perfil encontrado!');
        console.log('👤 Nome:', profile.name);
        console.log('🔑 Role:', profile.role);
      } else {
        console.log('⚠️ Perfil não encontrado, criando...');
        // Criar perfil se não existir
        const { data: newProfile, error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: loginData.user.id,
            email: 'master@sistema.com',
            name: 'Admin Master do Sistema',
            role: 'admin_master'
          })
          .select()
          .single();

        if (profileError) {
          console.error('❌ Erro ao criar perfil:', profileError);
        } else {
          console.log('✅ Perfil criado com sucesso!');
        }
      }
      
      // Fazer logout
      await supabase.auth.signOut();
      return profile || { email: 'master@sistema.com', name: 'Admin Master do Sistema', role: 'admin_master' };
    }

    console.log('❌ Login falhou:', loginError?.message);
    console.log('⚠️ O usuário pode não existir ou a senha está incorreta.');
    console.log('📋 Verifique se o usuário foi criado corretamente pelas migrações SQL.');
    
    // Se chegou aqui, o usuário não existe ou há problema de configuração
    throw new Error(`Login falhou: ${loginError?.message}`);

  } catch (error) {
    console.error('❌ Erro geral:', error);
    throw error;
  }
}

/**
 * Testar login do superadmin
 */
async function testSuperAdminLogin() {
  console.log('\n🧪 Testando login do superadmin...');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'master@sistema.com',
      password: 'master123'
    });

    if (error) {
      console.error('❌ Erro no login:', error.message);
      return false;
    }

    console.log('✅ Login realizado com sucesso!');
    console.log('👤 Usuário:', data.user?.email);
    console.log('🔑 ID:', data.user?.id);
    
    // Buscar dados do perfil
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', data.user?.email)
      .single();

    if (profile) {
      console.log('📋 Perfil:', profile.name);
      console.log('🎭 Role:', profile.role);
    }

    // Fazer logout
    await supabase.auth.signOut();
    console.log('🚪 Logout realizado');
    
    return true;
  } catch (error) {
    console.error('❌ Erro no teste de login:', error);
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando verificação do usuário superadmin...');
  console.log('=' .repeat(50));
  
  try {
    // Verificar/criar usuário
    await checkAndCreateSuperAdmin();
    
    // Testar login
    const loginSuccess = await testSuperAdminLogin();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO:');
    console.log('📧 Email: master@sistema.com');
    console.log('🔐 Senha: master123');
    console.log('🎭 Role: admin_master');
    console.log('✅ Status:', loginSuccess ? 'Funcionando' : 'Com problemas');
    console.log('🌐 Acesso: http://localhost:5173/login');
    
  } catch (error) {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  }
}

// Executar automaticamente
main();

export { checkAndCreateSuperAdmin, testSuperAdminLogin };