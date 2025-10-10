#!/usr/bin/env node

// Script rápido para verificar CPF autofill (webhook n8n e API direta)
// Uso:
//   node scripts/test-cpf-autofill.js --base https://seu-domínio-vercel.app --cpf 11144477735
//   node scripts/test-cpf-autofill.js            (usa localhost:3000 e CPF padrão)
//   node scripts/test-cpf-autofill.js --webhook-only (pula testes da API direta)

const DEFAULT_BASE = 'http://localhost:3000';
const DEFAULT_CPF = '11144477735';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { base: DEFAULT_BASE, cpf: DEFAULT_CPF, webhookOnly: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--base') out.base = args[++i];
    else if (a === '--cpf') out.cpf = args[++i];
    else if (a === '--webhook-only') out.webhookOnly = true;
  }
  return out;
}

async function fetchJSON(url, options = {}) {
  const start = Date.now();
  try {
    const res = await fetch(url, options);
    const ms = Date.now() - start;
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return { ok: res.ok, status: res.status, ms, json };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - start, json: { error: err.message } };
  }
}

async function main() {
  const { base, cpf, webhookOnly } = parseArgs();
  console.log('🧪 Teste CPF Autofill');
  console.log('======================');
  console.log(`🔗 Base: ${base}`);
  console.log(`🧾 CPF:  ${cpf}`);
  console.log(`⚙️  Modo: ${webhookOnly ? 'Webhook-only' : 'Completo'}`);
  console.log('');

  // 1) Verificar variáveis de ambiente expostas pelo endpoint de debug
  console.log('1) /api/debug-env');
  const env = await fetchJSON(`${base}/api/debug-env`);
  console.log(`   status ${env.status} • ${env.ms}ms`);
  console.log(`   body:`, JSON.stringify(env.json, null, 2));
  console.log('');

  // 2) Status de CPF (endpoint de diagnóstico)
  console.log('2) /api/debug-cpf-status');
  const status = await fetchJSON(`${base}/api/debug-cpf-status`);
  console.log(`   status ${status.status} • ${status.ms}ms`);
  console.log(`   body:`, JSON.stringify(status.json, null, 2));
  console.log('');

  // 3) Testar webhook n8n via proxy
  console.log('3) POST /api/datawash/webhook-cpf');
  const webhook = await fetchJSON(`${base}/api/datawash/webhook-cpf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf })
  });
  console.log(`   status ${webhook.status} • ${webhook.ms}ms`);
  console.log(`   body:`, JSON.stringify(webhook.json, null, 2));
  console.log('');

  let direct = { ok: false, status: 0, ms: 0, json: { skipped: true } };

  // 4) Testar API direta de CPF (GET) — só se não estiver em modo webhook-only
  if (!webhookOnly) {
    console.log('4) GET /api/datawash/[cpf]');
    direct = await fetchJSON(`${base}/api/datawash/${cpf}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    console.log(`   status ${direct.status} • ${direct.ms}ms`);
    console.log(`   body:`, JSON.stringify(direct.json, null, 2));
    console.log('');
  } else {
    console.log('4) GET /api/datawash/[cpf]');
    console.log('   pulado (modo webhook-only)');
    console.log('');
  }

  // 5) Sumário
  console.log('📊 Sumário');
  console.log(`   Webhook: ${webhook.ok ? 'OK' : 'ERRO'} (status ${webhook.status})`);
  if (!webhookOnly) {
    console.log(`   Direto:  ${direct.ok ? 'OK' : 'ERRO'} (status ${direct.status})`);
  } else {
    console.log('   Direto:  pulado (modo webhook-only)');
  }
  if (!(env.ok)) console.log('   Debug-env falhou: verifique configuração do endpoint.');
  if (!(status.ok)) console.log('   Debug-cpf-status falhou: verifique configuração do endpoint.');

  // Recomendações rápidas
  const missingWebhook = status.json?.variables?.n8n && status.json.variables.n8n.webhookUrl === false;
  const missingDatawash = status.json?.variables?.datawash && (
    status.json.variables.datawash.username === false ||
    status.json.variables.datawash.password === false ||
    status.json.variables.datawash.cliente === false ||
    status.json.variables.datawash.baseUrl === false
  );

  if (missingWebhook) {
    console.log('\n⚠️ Falta configurar o webhook do n8n: N8N_DATAWASH_WEBHOOK_URL ou N8N_WEBHOOK_CPF_URL.');
  }
  // Só sinalizar DataWash direto se não estiver em modo webhook-only
  if (!webhookOnly && missingDatawash) {
    console.log('\n⚠️ Falta configurar variáveis do DataWash: DATAWASH_USERNAME, DATAWASH_PASSWORD, DATAWASH_CLIENTE, DATAWASH_BASE_URL.');
  }

  console.log('\n✅ Fim do teste.');
}

main();