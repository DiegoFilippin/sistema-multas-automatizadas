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

async function checkRoleConstraint() {
  console.log('🔍 Verificando constraint de roles na tabela users...\n');

  // Query SQL para verificar a constraint
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass
      AND conname LIKE '%role%';
    `
  });

  if (error) {
    console.log('⚠️  Não foi possível executar via RPC. Tentando outra abordagem...\n');
    
    // Tentar buscar todos os roles únicos existentes
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('role')
      .limit(100);

    if (usersError) {
      console.error('❌ Erro:', usersError.message);
      return;
    }

    const uniqueRoles = [...new Set(users.map(u => u.role))];
    console.log('📋 Roles encontrados na tabela users:');
    uniqueRoles.forEach(role => {
      console.log(`   - ${role}`);
    });
    console.log('');
    
    // Tentar atualizar com diferentes valores
    console.log('🧪 Testando valores possíveis para o role...\n');
    
    const rolesToTest = ['Superadmin', 'admin_master', 'ICETRAN', 'admin', 'Despachante'];
    
    for (const roleTest of rolesToTest) {
      const { error: testError } = await supabase
        .from('users')
        .update({ role: roleTest })
        .eq('email', 'superadmin@sistema.com');
      
      if (!testError) {
        console.log(`✅ Role "${roleTest}" aceito! Aplicando...`);
        console.log('');
        console.log('🎉 Role atualizado com sucesso!');
        console.log('   Novo role:', roleTest);
        console.log('');
        console.log('⚠️  Faça logout e login novamente para aplicar as mudanças.');
        return;
      } else {
        console.log(`❌ Role "${roleTest}" rejeitado:`, testError.message);
      }
    }
    
    console.log('');
    console.log('⚠️  Nenhum dos roles testados foi aceito.');
    console.log('   Pode ser necessário ajustar a constraint no banco de dados.');
    
  } else {
    console.log('📋 Constraint encontrada:');
    console.log(data);
  }
}

checkRoleConstraint().catch(console.error);
