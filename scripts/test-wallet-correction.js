// scripts/test-wallet-correction.js
// Simula a criação de uma cobrança para F&Z e valida os wallets enviados
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTA2MDgsImV4cCI6MjA2ODc4NjYwOH0.IUsqVb6BKZCy_ujZyeiFAEE0GWr_74w30BBPY4CJQDc';
const supabase = createClient(supabaseUrl, supabaseKey);

const COMPANY_ID_FZ = '7d573ce0-125d-46bf-9e37-33d0c6074cf9';

async function getCompanyManualWalletId(companyId) {
  // Tenta buscar por ID
  const byId = await supabase
    .from('companies')
    .select('id, nome, manual_wallet_id')
    .eq('id', companyId)
    .limit(1);

  if (byId.error) {
    throw new Error(`Falha ao buscar company por id: ${byId.error.message}`);
  }
  if (byId.data && byId.data.length > 0) {
    return byId.data[0];
  }

  // Fallback: buscar por nome contendo 'F&Z'
  const byName = await supabase
    .from('companies')
    .select('id, nome, manual_wallet_id')
    .ilike('nome', '%F&Z%')
    .limit(5);

  if (byName.error) {
    throw new Error(`Falha ao buscar company por nome: ${byName.error.message}`);
  }
  if (!byName.data || byName.data.length === 0) {
    throw new Error('Empresa não encontrada por id nem por nome F&Z.');
  }

  // Preferir a que já tem manual_wallet_id
  const withWallet = byName.data.find(c => !!c.manual_wallet_id);
  return withWallet || byName.data[0];
}

function simulateCharge(company, amountCents) {
  // Conforme regra: sempre usar company.manual_wallet_id
  const dispatcherWalletId = company.manual_wallet_id || null;
  const icetranWalletId = company.manual_wallet_id || null;

  const charge = {
    id: 'chg_test_001',
    company_id: company.id,
    company_name: company.nome,
    amount_cents: amountCents,
    description: 'Simulação de cobrança F&Z',
  };

  const webhookPayload = {
    type: 'payment_created',
    charge_id: charge.id,
    company_id: charge.company_id,
    wallet_despachante: dispatcherWalletId,
    wallet_icetran: icetranWalletId,
    amount_cents: amountCents,
    metadata: {
      company_name: company.nome,
      test: true,
    },
  };

  return { dispatcherWalletId, icetranWalletId, webhookPayload };
}

function verifyWallets(company, dispatcherWalletId, icetranWalletId) {
  const expected = company.manual_wallet_id;
  const okDispatcher = dispatcherWalletId === expected;
  const okIcetran = icetranWalletId === expected;

  const results = {
    expected_manual_wallet_id: expected,
    dispatcher_correct: okDispatcher,
    icetran_correct: okIcetran,
  };

  if (!expected) {
    results.error = 'manual_wallet_id não configurado na empresa.';
    return results;
  }

  if (!okDispatcher || !okIcetran) {
    results.error = 'Wallet incorreto detectado: deve sempre ser manual_wallet_id.';
  }

  return results;
}

async function main() {
  console.log('🔍 Buscando empresa F&Z...');
  const company = await getCompanyManualWalletId(COMPANY_ID_FZ);
  console.log('✅ Empresa encontrada:', company.nome);
  console.log('ℹ️ manual_wallet_id atual:', company.manual_wallet_id || 'NÃO CONFIGURADO');

  const amountCents = 12345; // R$123,45
  console.log('\n🧪 Simulando cobrança de', amountCents, 'centavos...');
  const { dispatcherWalletId, icetranWalletId, webhookPayload } = simulateCharge(company, amountCents);

  console.log('\n➡️ Wallets que seriam enviados:');
  console.log('   wallet_despachante:', dispatcherWalletId || 'NÃO CONFIGURADO');
  console.log('   wallet_icetran:', icetranWalletId || 'NÃO CONFIGURADO');

  console.log('\n📦 Payload do webhook:');
  console.log(JSON.stringify(webhookPayload, null, 2));

  const results = verifyWallets(company, dispatcherWalletId, icetranWalletId);
  console.log('\n✔️ Verificação:');
  console.log(JSON.stringify(results, null, 2));

  if (results.error) {
    console.error('\n❌ Teste falhou:', results.error);
    process.exitCode = 1;
  } else {
    console.log('\n✅ Teste passou: wallets corretos.');
  }
}

main().catch(err => {
  console.error('💥 Erro no teste:', err);
  process.exitCode = 1;
});