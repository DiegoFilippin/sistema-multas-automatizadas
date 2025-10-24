#!/usr/bin/env node

/*
  Script: verify-configure-icetran-wallet.mjs
  Objetivo:
  - Verificar se existe uma empresa ICETRAN ativa
  - Verificar/ajustar o campo manual_wallet_id
  - Opcionalmente criar a empresa se não existir

  Como usar:
  - Dry-run (não altera nada):
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/verify-configure-icetran-wallet.mjs --dry-run

  - Aplicar atualizações (requer wallet real):
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ICETRAN_WALLET_ID=wal_... node scripts/verify-configure-icetran-wallet.mjs --apply

  - Criar empresa se não existir (com dados mínimos):
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ICETRAN_WALLET_ID=wal_... ICETRAN_CNPJ=02968119000188 ICETRAN_EMAIL=financeiro@icetran.com.br node scripts/verify-configure-icetran-wallet.mjs --apply
*/

import { createClient } from '@supabase/supabase-js';

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const WALLET_ID = process.env.ICETRAN_WALLET_ID || null;
  const ICETRAN_CNPJ = process.env.ICETRAN_CNPJ || null;
  const ICETRAN_EMAIL = process.env.ICETRAN_EMAIL || null;
  const ICETRAN_NOME = process.env.ICETRAN_NOME || 'ICETRAN';
  const APPLY = process.argv.includes('--apply');
  const DRY_RUN = process.argv.includes('--dry-run') || !APPLY;

  section('Configuração');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios via env.');
    console.log('Exemplo: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/verify-configure-icetran-wallet.mjs --dry-run');
    process.exit(1);
  }
  console.log('🔗 SUPABASE_URL:', SUPABASE_URL);
  console.log('🔐 chave service role presente:', !!SUPABASE_SERVICE_ROLE_KEY);
  console.log('⚙️ Modo:', DRY_RUN ? 'dry-run (somente leitura)' : 'APLICAR alterações');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  section('Buscando empresa ICETRAN');
  const { data: icetranCompanies, error: searchError } = await supabase
    .from('companies')
    .select('id, nome, cnpj, email, status, company_type, manual_wallet_id')
    .or('company_type.eq.icetran,nome.ilike.%ICETRAN%')
    .limit(3);

  if (searchError) {
    console.error('❌ Erro ao buscar empresas ICETRAN:', searchError);
    process.exit(1);
  }

  let icetran = Array.isArray(icetranCompanies) ? icetranCompanies.find(c => c.status === 'ativo') || icetranCompanies[0] : null;

  if (icetran) {
    console.log('✅ Empresa encontrada:');
    console.table([{
      id: icetran.id,
      nome: icetran.nome,
      cnpj: icetran.cnpj,
      email: icetran.email,
      status: icetran.status,
      company_type: icetran.company_type,
      manual_wallet_id: icetran.manual_wallet_id || 'NÃO CONFIGURADO'
    }]);

    // Garantir company_type='icetran'
    if (icetran.company_type !== 'icetran') {
      if (DRY_RUN) {
        console.log('🔎 DRY-RUN: Atualizaria company_type para "icetran".');
      } else {
        const { error } = await supabase
          .from('companies')
          .update({ company_type: 'icetran' })
          .eq('id', icetran.id);
        if (error) {
          console.error('❌ Erro ao atualizar company_type:', error);
          process.exit(1);
        }
        console.log('✅ company_type atualizado para "icetran".');
        icetran.company_type = 'icetran';
      }
    }

    // Ajustar status para ativo, se necessário
    if (icetran.status !== 'ativo') {
      if (DRY_RUN) {
        console.log('🔎 DRY-RUN: Atualizaria status para "ativo".');
      } else {
        const { error } = await supabase
          .from('companies')
          .update({ status: 'ativo' })
          .eq('id', icetran.id);
        if (error) {
          console.error('❌ Erro ao atualizar status:', error);
          process.exit(1);
        }
        console.log('✅ Status atualizado para "ativo".');
        icetran.status = 'ativo';
      }
    }

    // Configurar manual_wallet_id se ausente
    if (!icetran.manual_wallet_id) {
      if (!WALLET_ID) {
        console.warn('⚠️ manual_wallet_id ausente e ICETRAN_WALLET_ID não informado.');
        console.log('   Forneça env ICETRAN_WALLET_ID=wal_real e use --apply para configurar.');
      } else if (DRY_RUN) {
        console.log(`🔎 DRY-RUN: Atualizaria manual_wallet_id para ${WALLET_ID}.`);
      } else {
        const { error } = await supabase
          .from('companies')
          .update({ manual_wallet_id: WALLET_ID })
          .eq('id', icetran.id);
        if (error) {
          console.error('❌ Erro ao atualizar manual_wallet_id:', error);
          process.exit(1);
        }
        console.log('✅ manual_wallet_id configurado com sucesso.');
        icetran.manual_wallet_id = WALLET_ID;
      }
    } else {
      console.log('ℹ️ manual_wallet_id já configurado:', icetran.manual_wallet_id);
    }
  } else {
    console.log('❌ Nenhuma empresa ICETRAN encontrada por tipo/nome.');
    if (!APPLY) {
      console.log('   Use --apply com ICETRAN_CNPJ e ICETRAN_EMAIL para criar.');
    }

    if (APPLY) {
      if (!ICETRAN_CNPJ || !ICETRAN_EMAIL) {
        console.error('❌ Para criar, informe ICETRAN_CNPJ e ICETRAN_EMAIL via env.');
        process.exit(1);
      }
      const newCompany = {
        nome: ICETRAN_NOME,
        cnpj: ICETRAN_CNPJ,
        email: ICETRAN_EMAIL,
        status: 'ativo',
        company_type: 'icetran',
        manual_wallet_id: WALLET_ID || null,
      };
      const { data, error } = await supabase
        .from('companies')
        .insert([newCompany])
        .select();
      if (error) {
        console.error('❌ Erro ao criar empresa ICETRAN:', error);
        process.exit(1);
      }
      icetran = data && data[0];
      console.log('✅ Empresa ICETRAN criada:');
      console.table([{
        id: icetran.id,
        nome: icetran.nome,
        cnpj: icetran.cnpj,
        email: icetran.email,
        status: icetran.status,
        company_type: icetran.company_type,
        manual_wallet_id: icetran.manual_wallet_id || 'NÃO CONFIGURADO'
      }]);
    }
  }

  section('Validação final');
  if (icetran) {
    const { data: verify, error: verifyError } = await supabase
      .from('companies')
      .select('id, nome, company_type, status, manual_wallet_id')
      .eq('id', icetran.id)
      .single();
    if (verifyError) {
      console.error('❌ Erro ao verificar empresa:', verifyError);
    } else {
      console.table([verify]);
      if (!verify.manual_wallet_id) {
        console.warn('⚠️ Ainda sem manual_wallet_id. Configure ICETRAN_WALLET_ID e rode com --apply.');
      } else {
        console.log('✅ Pronto: wallet_icetran será resolvido e enviado ao webhook.');
      }
    }
  }

  console.log('\n🧭 Próximos passos:');
  console.log('- No cadastro de empresas, marque o tipo correto (ex.: icetran).');
  console.log('- Gere uma cobrança novamente; o payload deve incluir wallet_icetran.');
  console.log('- Se continuar vindo null, compartilhe os logs de resolução do wallet no backend/frontend.');
}

main().catch(err => {
  console.error('💥 Erro geral:', err);
  process.exit(1);
});