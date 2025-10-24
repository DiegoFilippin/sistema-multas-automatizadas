#!/usr/bin/env node

/**
 * Script de teste para validar a funcionalidade de gerenciamento manual de Wallet ID e API key para subcontas
 */

import https from 'https';
import http from 'http';

// Configurações
const API_BASE_URL = 'http://localhost:3001/api';
const FRONTEND_URL = 'http://localhost:5173';
const TEST_TOKEN = 'test-token';

// Função para fazer requisições HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Função para testar os endpoints da API
async function testApiEndpoints() {
  console.log('🧪 Iniciando testes da API de subcontas...\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Teste 1: Health check do servidor
  console.log('1️⃣ Testando health check do servidor...');
  try {
    const response = await makeRequest(`${API_BASE_URL.replace('/api', '')}/health`, {
      method: 'GET'
    });
    
    if (response.statusCode === 200 && response.data.status === 'OK') {
      console.log('✅ Health check: PASS');
      results.passed++;
      results.tests.push({ name: 'Health Check', status: 'PASS' });
    } else {
      console.log('❌ Health check: FAIL');
      results.failed++;
      results.tests.push({ name: 'Health Check', status: 'FAIL', error: 'Status não OK' });
    }
  } catch (error) {
    console.log('❌ Health check: FAIL', error.message);
    results.failed++;
    results.tests.push({ name: 'Health Check', status: 'FAIL', error: error.message });
  }

  // Teste 2: Listar subcontas
  console.log('\n2️⃣ Testando listagem de subcontas...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/subaccounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Listar subcontas: PASS');
      results.passed++;
      results.tests.push({ name: 'Listar Subcontas', status: 'PASS' });
    } else {
      console.log('❌ Listar subcontas: FAIL');
      results.failed++;
      results.tests.push({ name: 'Listar Subcontas', status: 'FAIL', error: `Status ${response.statusCode}` });
    }
  } catch (error) {
    console.log('❌ Listar subcontas: FAIL', error.message);
    results.failed++;
    results.tests.push({ name: 'Listar Subcontas', status: 'FAIL', error: error.message });
  }

  // Teste 3: Histórico de credenciais
  console.log('\n3️⃣ Testando histórico de credenciais...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/subaccounts/test-id/credentials-history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Histórico de credenciais: PASS');
      results.passed++;
      results.tests.push({ name: 'Histórico de Credenciais', status: 'PASS' });
    } else {
      console.log('❌ Histórico de credenciais: FAIL');
      results.failed++;
      results.tests.push({ name: 'Histórico de Credenciais', status: 'FAIL', error: `Status ${response.statusCode}` });
    }
  } catch (error) {
    console.log('❌ Histórico de credenciais: FAIL', error.message);
    results.failed++;
    results.tests.push({ name: 'Histórico de Credenciais', status: 'FAIL', error: error.message });
  }

  // Teste 4: Teste de conexão
  console.log('\n4️⃣ Testando teste de conexão...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/subaccounts/test-id/test-connection`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Teste de conexão: PASS');
      results.passed++;
      results.tests.push({ name: 'Teste de Conexão', status: 'PASS' });
    } else {
      console.log('❌ Teste de conexão: FAIL');
      results.failed++;
      results.tests.push({ name: 'Teste de Conexão', status: 'FAIL', error: `Status ${response.statusCode}` });
    }
  } catch (error) {
    console.log('❌ Teste de conexão: FAIL', error.message);
    results.failed++;
    results.tests.push({ name: 'Teste de Conexão', status: 'FAIL', error: error.message });
  }

  // Teste 5: Frontend está acessível
  console.log('\n5️⃣ Testando acessibilidade do frontend...');
  try {
    const response = await makeRequest(`${FRONTEND_URL}/admin/subcontas`, {
      method: 'HEAD'
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Frontend acessível: PASS');
      results.passed++;
      results.tests.push({ name: 'Frontend Acessível', status: 'PASS' });
    } else {
      console.log('❌ Frontend acessível: FAIL');
      results.failed++;
      results.tests.push({ name: 'Frontend Acessível', status: 'FAIL', error: `Status ${response.statusCode}` });
    }
  } catch (error) {
    console.log('❌ Frontend acessível: FAIL', error.message);
    results.failed++;
    results.tests.push({ name: 'Frontend Acessível', status: 'FAIL', error: error.message });
  }

  return results;
}

// Função principal
async function runTests() {
  console.log('🚀 Iniciando testes da funcionalidade de gerenciamento manual de Wallet ID e API key para subcontas\n');
  
  try {
    const results = await testApiEndpoints();
    
    console.log('\n📊 RESULTADOS DOS TESTES:');
    console.log('========================');
    console.log(`✅ Passou: ${results.passed}`);
    console.log(`❌ Falhou: ${results.failed}`);
    console.log(`📈 Taxa de sucesso: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    console.log('\n📋 DETALHES DOS TESTES:');
    results.tests.forEach(test => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${test.name}: ${test.status}`);
      if (test.error) {
        console.log(`   Erro: ${test.error}`);
      }
    });
    
    if (results.failed === 0) {
      console.log('\n🎉 TODOS OS TESTES PASSARAM! A funcionalidade está funcionando corretamente.');
      process.exit(0);
    } else {
      console.log('\n⚠️  ALGUNS TESTES FALHARAM. Verifique os logs acima para mais detalhes.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Erro durante os testes:', error);
    process.exit(1);
  }
}

// Executar os testes
runTests();