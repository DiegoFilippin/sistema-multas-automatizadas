#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// Configuração
const EXPECTED_ICETRAN_WALLET_ID = '975c798b-1bb4-4a22-97b8-88957f05a4a8';
const FZ_COMPANY_ID = '7d573ce0-125d-46bf-9e37-33d0c6074cf9';
const VALOR_ICETRAN = 100.0; // valor > 0 para habilitar wallet_icetran

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY/ANON_KEY são necessários via env.');
    process.exit(1);
  }
  return createClient(url, key);
}

async function findIcetranCompany(supabase) {
  // Prioriza company_type = 'icetran' e status 'ativo'
  let { data: icetran, error } = await supabase
    .from('companies')
    .select('id, nome, manual_wallet_id, company_type, status')
    .eq('company_type', 'icetran')
    .eq('status', 'ativo')
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!icetran) {
    // fallback por nome contendo ICETRAN
    const { data: list, error: err2 } = await supabase
      .from('companies')
      .select('id, nome, manual_wallet_id, company_type, status')
      .ilike('nome', '%ICETRAN%')
      .eq('status', 'ativo')
      .limit(1);
    if (err2) throw err2;
    icetran = (list && list.length > 0) ? list[0] : null;
  }
  return icetran;
}

async function getCompanyById(supabase, id) {
  const { data, error } = await supabase
    .from('companies')
    .select('id, nome, manual_wallet_id, company_type, status')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findFZCompany(supabase) {
  // Tenta por ID, depois fallback por nome
  let fz = await getCompanyById(supabase, FZ_COMPANY_ID);
  if (!fz) {
    const { data: list, error } = await supabase
      .from('companies')
      .select('id, nome, manual_wallet_id, company_type, status')
      .ilike('nome', '%F%Z%')
      .eq('status', 'ativo')
      .limit(1);
    if (error) throw error;
    fz = (list && list.length > 0) ? list[0] : null;
  }
  return fz;
}

async function main() {
  const supabase = getSupabaseClient();

  // 1) Buscar F&Z (despachante)
  const fz = await findFZCompany(supabase);
  if (!fz) {
    console.error('❌ F&Z não encontrada (por ID ou nome).');
    process.exit(1);
  }
  if (!fz.manual_wallet_id) {
    console.error('❌ F&Z sem manual_wallet_id configurado. Configure antes de testar.');
    process.exit(1);
  }

  // 2) Buscar ICETRAN
  const icetran = await findIcetranCompany(supabase);
  if (!icetran) {
    console.error('❌ Empresa ICETRAN ativa não encontrada.');
    process.exit(1);
  }
  if (!icetran.manual_wallet_id) {
    console.error('❌ ICETRAN sem manual_wallet_id configurado.');
    process.exit(1);
  }

  // 3) Compor payload
  const webhookPayload = {
    company_id: FZ_COMPANY_ID,
    valoricetran: VALOR_ICETRAN,
    wallet_icetran: icetran.manual_wallet_id,
    wallet_despachante: fz.manual_wallet_id,
    // campos auxiliares para debug
    meta: {
      icetran_company: { id: icetran.id, nome: icetran.nome, type: icetran.company_type, status: icetran.status },
      fz_company: { id: fz.id, nome: fz.nome, type: fz.company_type, status: fz.status },
    },
  };

  console.log('📦 Payload simulado a ser enviado ao webhook n8n:\n', JSON.stringify(webhookPayload, null, 2));

  // 4) Validações
  let ok = true;
  if (webhookPayload.wallet_icetran !== EXPECTED_ICETRAN_WALLET_ID) {
    ok = false;
    console.error(`❌ wallet_icetran divergente. Esperado: ${EXPECTED_ICETRAN_WALLET_ID} | Obtido: ${webhookPayload.wallet_icetran}`);
  } else {
    console.log(`✅ wallet_icetran OK: ${webhookPayload.wallet_icetran}`);
  }

  if (!webhookPayload.wallet_despachante) {
    ok = false;
    console.error('❌ wallet_despachante ausente.');
  } else {
    console.log(`✅ wallet_despachante OK: ${webhookPayload.wallet_despachante}`);
  }

  // 5) Resultado final
  if (ok) {
    console.log('🎉 Teste concluído com sucesso: ambos os wallets estão presentes e corretos.');
    process.exit(0);
  } else {
    console.error('⚠️ Teste falhou: verifique as mensagens acima para corrigir a configuração.');
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('💥 Erro durante o teste:', err);
  process.exit(1);
});