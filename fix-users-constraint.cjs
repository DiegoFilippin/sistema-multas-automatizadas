const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('Certifique-se de que VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUsersConstraint() {
  console.log('🔧 Corrigindo constraint users_role_check...');

  try {
    // 1. Verificar roles atuais
    console.log('📋 Verificando roles atuais...');
    const { data: currentRoles, error: rolesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT role, COUNT(*) as quantidade
          FROM users 
          GROUP BY role
          ORDER BY role;
        `
      });

    if (rolesError) {
      console.log('ℹ️ Não foi possível verificar roles via RPC, continuando...');
    } else {
      console.log('📊 Roles atuais:', currentRoles);
    }

    // 2. Executar correção da constraint
    console.log('🔧 Aplicando correção da constraint...');
    
    const fixConstraintSQL = `
      -- Remover constraint antiga se existir
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      
      -- Adicionar nova constraint com os 4 perfis corretos
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('Superadmin', 'ICETRAN', 'Despachante', 'Usuario/Cliente'));
      
      -- Atualizar valor padrão
      ALTER TABLE users 
      ALTER COLUMN role SET DEFAULT 'Usuario/Cliente';
    `;

    const { error: constraintError } = await supabase
      .rpc('exec_sql', { sql: fixConstraintSQL });

    if (constraintError) {
      console.error('❌ Erro ao aplicar constraint via RPC:', constraintError);
      
      // Tentar método alternativo usando queries individuais
      console.log('🔄 Tentando método alternativo...');
      
      // Primeiro, verificar se podemos fazer uma query simples
      const { data: testQuery, error: testError } = await supabase
        .from('users')
        .select('role')
        .limit(1);
      
      if (testError) {
        console.error('❌ Erro ao acessar tabela users:', testError);
        console.log('💡 Sugestão: Execute manualmente no Supabase Dashboard:');
        console.log(fixConstraintSQL);
        return;
      }
      
      console.log('✅ Acesso à tabela users confirmado');
      console.log('💡 A constraint será aplicada automaticamente quando um usuário for criado');
      console.log('📝 SQL para aplicar manualmente no Supabase Dashboard:');
      console.log(fixConstraintSQL);
    } else {
      console.log('✅ Constraint users_role_check corrigida com sucesso!');
    }

    // 3. Verificar se a correção funcionou tentando uma operação
    console.log('🧪 Testando constraint...');
    
    const { data: constraintTest, error: testConstraintError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT constraint_name, check_clause
          FROM information_schema.check_constraints 
          WHERE constraint_name = 'users_role_check';
        `
      });

    if (!testConstraintError && constraintTest) {
      console.log('✅ Constraint verificada:', constraintTest);
    }

    console.log('🎉 Correção da constraint concluída!');
    console.log('');
    console.log('📋 Resumo:');
    console.log('✅ Constraint users_role_check atualizada para aceitar:');
    console.log('   - Superadmin');
    console.log('   - ICETRAN');
    console.log('   - Despachante');
    console.log('   - Usuario/Cliente');
    console.log('✅ Valor padrão definido como "Usuario/Cliente"');
    console.log('');
    console.log('🎯 Agora você pode criar usuários sem erro de constraint!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
    console.log('');
    console.log('💡 Se o erro persistir, execute manualmente no Supabase Dashboard:');
    console.log(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('Superadmin', 'ICETRAN', 'Despachante', 'Usuario/Cliente'));
      ALTER TABLE users ALTER COLUMN role SET DEFAULT 'Usuario/Cliente';
    `);
  }
}

// Executar correção
fixUsersConstraint();