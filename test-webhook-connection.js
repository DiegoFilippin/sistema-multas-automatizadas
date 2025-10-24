#!/usr/bin/env node

// Teste de conexão com webhook n8n
// - Verifica acessibilidade do endpoint
// - Testa CORS via OPTIONS (preflight)
// - Faz POST com payload simples
// - Faz POST com payload similar ao real
// - Mede tempo de resposta e captura detalhes

const DEFAULT_URL = 'https://webhookn8n.synsoft.com.br/webhook/d37fac6e-9379-4bca-b015-9c56b104cae1';
const url = process.argv[2] || process.env.WEBHOOK_URL || DEFAULT_URL;

if (!global.fetch) {
  console.error('❌ O ambiente Node não possui fetch disponível. Use Node >= 18.');
  process.exit(1);
}

const timeoutMs = 10000; // 10s

function ms(start) {
  return `${Date.now() - start}ms`;
}

function section(title) {
  console.log(`\n===== ${title} =====`);
}

function summarizeHeaders(headers) {
  const keys = [
    'access-control-allow-origin',
    'access-control-allow-methods',
    'access-control-allow-headers',
    'access-control-allow-credentials',
    'content-type',
    'content-length',
    'date',
    'server'
  ];
  const out = {};
  for (const k of keys) {
    out[k] = headers.get(k) || null;
  }
  return out;
}

async function safeReadBody(res) {
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  if (ct.includes('application/json')) {
    try {
      const json = JSON.parse(text);
      return { type: 'json', data: json };
    } catch {
      return { type: 'text', data: text, note: 'Content-Type indica JSON, mas o corpo não é JSON válido' };
    }
  }
  return { type: 'text', data: text };
}

async function fetchWithTimeout(resource, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(resource, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function testAccessibility() {
  section('1) Acessibilidade do endpoint (GET)');
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url, { method: 'GET' });
    const headers = summarizeHeaders(res.headers);
    const body = await safeReadBody(res);
    console.log({ status: res.status, ok: res.ok, time: ms(start), headers, body });
  } catch (err) {
    console.log({ error: String(err), time: ms(start) });
  }
}

async function testCORSPreflight() {
  section('2) Preflight CORS (OPTIONS)');
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5174',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type, authorization'
      }
    });
    const headers = summarizeHeaders(res.headers);
    const body = await safeReadBody(res);
    console.log({ status: res.status, ok: res.ok, time: ms(start), headers, body });
  } catch (err) {
    console.log({ error: String(err), time: ms(start) });
  }
}

async function testSimplePOST() {
  section('3) POST com payload simples');
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5174'
      },
      body: JSON.stringify({
        test: true,
        source: 'test-webhook-connection.js',
        timestamp: new Date().toISOString()
      })
    });
    const headers = summarizeHeaders(res.headers);
    const body = await safeReadBody(res);
    console.log({ status: res.status, ok: res.ok, time: ms(start), headers, body });
  } catch (err) {
    console.log({ error: String(err), time: ms(start) });
  }
}

async function testRealisticPOST() {
  section('4) POST com payload similar ao real');
  const start = Date.now();
  const realisticPayload = {
    wallet_icetran: 'WALLET_ICETRAN_TEST',
    wallet_despachante: 'WALLET_DESPACHANTE_TEST',
    Customer_cliente: {
      id: 'CLIENT_TEST_ID',
      nome: 'Cliente Teste',
      cpf_cnpj: '00000000000',
      email: 'cliente@teste.com',
      asaas_customer_id: 'cus_test_123'
    },
    Valor_cobrança: 10.0,
    Idserviço: 'SERVICE_TEST_ID',
    descricaoserviço: 'Serviço de Teste',
    multa_type: 'leve',
    valoracsm: 0,
    valoricetran: 0,
    taxa: 3.5,
    despachante: {
      company_id: 'COMPANY_TEST_ID',
      nome: 'Empresa Teste',
      wallet_id: 'WALLET_DESPACHANTE_TEST',
      margem: 0
    }
  };
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5174'
      },
      body: JSON.stringify(realisticPayload)
    });
    const headers = summarizeHeaders(res.headers);
    const body = await safeReadBody(res);
    console.log({ status: res.status, ok: res.ok, time: ms(start), headers, body });
  } catch (err) {
    console.log({ error: String(err), time: ms(start) });
  }
}

(async function main() {
  console.log('🚀 Iniciando testes do webhook n8n');
  console.log('URL:', url);
  console.log('Timeout:', `${timeoutMs}ms`);

  await testAccessibility();
  await testCORSPreflight();
  await testSimplePOST();
  await testRealisticPOST();

  console.log('\n✅ Testes concluídos');
})();