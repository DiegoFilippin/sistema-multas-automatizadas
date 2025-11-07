import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSuperadminRole() {
  console.log('🔍 Buscando usuário superadmin@sistema.com...\n');

  // Buscar usuário
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'superadmin@sistema.com')
    .single();

  if (userError || !user) {
    console.error('❌ Usuário não encontrado:', userError?.message);
    return;
  }

  console.log('📋 Dados atuais do usuário:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Nome:', user.nome);
  console.log('   Role atual:', user.role);
  console.log('   Ativo:', user.ativo);
  console.log('');

  // Verificar se o role já está correto
  if (user.role === 'admin_master' || user.role === 'Superadmin') {
    console.log('✅ O usuário já possui o role correto!');
    console.log('');
    
    // Verificar também na tabela user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'superadmin@sistema.com')
      .maybeSingle();

    if (profile) {
      console.log('📋 Dados do perfil (user_profiles):');
      console.log('   Role no perfil:', profile.role);
      
      if (profile.role !== 'admin_master' && profile.role !== 'Superadmin') {
        console.log('⚠️  Role no perfil está incorreto. Corrigindo...');
        
        const { error: updateProfileError } = await supabase
          .from('user_profiles')
          .update({ role: 'admin_master' })
          .eq('email', 'superadmin@sistema.com');

        if (updateProfileError) {
          console.error('❌ Erro ao atualizar perfil:', updateProfileError.message);
        } else {
          console.log('✅ Perfil atualizado com sucesso!');
        }
      }
    }
    
    return;
  }

  // Atualizar role para admin_master
  console.log('🔧 Atualizando role para admin_master...\n');

  const { error: updateError } = await supabase
    .from('users')
    .update({ 
      role: 'admin_master',
      updated_at: new Date().toISOString()
    })
    .eq('email', 'superadmin@sistema.com');

  if (updateError) {
    console.error('❌ Erro ao atualizar role:', updateError.message);
    return;
  }

  console.log('✅ Role atualizado com sucesso na tabela users!');
  console.log('');

  // Atualizar também na tabela user_profiles se existir
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', 'superadmin@sistema.com')
    .maybeSingle();

  if (profile) {
    const { error: updateProfileError } = await supabase
      .from('user_profiles')
      .update({ role: 'admin_master' })
      .eq('email', 'superadmin@sistema.com');

    if (updateProfileError) {
      console.error('❌ Erro ao atualizar perfil:', updateProfileError.message);
    } else {
      console.log('✅ Role atualizado com sucesso na tabela user_profiles!');
    }
  }

  console.log('');
  console.log('🎉 Correção concluída! Faça logout e login novamente.');
}

fixSuperadminRole().catch(console.error);
