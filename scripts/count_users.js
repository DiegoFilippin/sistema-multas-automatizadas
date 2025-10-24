// scripts/count_users.js
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;

async function main() {
  console.log('🔌 Lendo credenciais do Supabase...');
  if (!url || !anon) {
    console.error('❌ Variáveis de ambiente não encontradas: VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, anon);
  console.log('✅ Cliente Supabase inicializado.');

  try {
    console.log('🔎 Contando usuários na tabela pública users...');
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;
    console.log(`📊 Total de usuários (tabela users): ${count}`);

    console.log('\n🏢 Calculando distribuição por empresa (company_id)...');
    const { data: companyRows, error: distError } = await supabase
      .from('users')
      .select('company_id');

    if (distError) throw distError;

    const dist = companyRows.reduce((acc, row) => {
      const key = row.company_id || 'sem_company_id';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Tentar obter nomes das empresas para exibição amigável
    const companyIds = Object.keys(dist).filter(id => id !== 'sem_company_id');
    let companyNames = {};
    if (companyIds.length > 0) {
      const { data: companies, error: compErr } = await supabase
        .from('companies')
        .select('id,nome')
        .in('id', companyIds);
      if (!compErr && Array.isArray(companies)) {
        companyNames = companies.reduce((acc, c) => {
          acc[c.id] = c.nome;
          return acc;
        }, {});
      }
    }

    console.log('company_id -> quantidade (nome entre parênteses se disponível):');
    Object.entries(dist).forEach(([companyId, qty]) => {
      const name = companyNames[companyId] ? ` (${companyNames[companyId]})` : '';
      console.log(`- ${companyId}: ${qty}${name}`);
    });

    console.log('\n🔐 Distribuição por perfil (role)...');
    const { data: roleRows, error: roleError } = await supabase
      .from('users')
      .select('role');

    if (roleError) {
      console.warn('⚠️  Não foi possível obter roles:', roleError.message);
    } else if (Array.isArray(roleRows)) {
      const roles = roleRows.reduce((acc, row) => {
        const key = row.role || 'sem_role';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      Object.entries(roles).forEach(([role, qty]) => {
        console.log(`- ${role}: ${qty}`);
      });
    }

    console.log('\nℹ️ Observação: contar usuários em auth.users requer a service role key e não é acessível com a anon key.');
  } catch (err) {
    console.error('❌ Erro ao consultar Supabase:', err.message || err);
    process.exit(1);
  }
}

main();