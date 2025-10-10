#!/usr/bin/env node

// Script para testar a API do DataWash localmente
// Uso: node test-datawash-api.js [CPF]

const https = require('https');
const http = require('http');

// Configurações do DataWash
const DATAWASH_CONFIG = {
  username: process.env.DATAWASH_USERNAME || 'felipe@nexmedia.com.br',
  password: process.env.DATAWASH_PASSWORD || 'neoshare2015',
  cliente: process.env.DATAWASH_CLIENTE || 'Neoshare',
  baseUrl: process.env.DATAWASH_BASE_URL || 'http://webservice.datawash.com.br/localizacao.asmx/ConsultaCPFCompleta'
};

// CPF de teste (pode ser passado como argumento)
const cpfTeste = process.argv[2] || '11144477735';

console.log('🧪 TESTE DA API DATAWASH');
console.log('========================');
console.log(`📋 CPF de teste: ${cpfTeste}`);
console.log(`🔑 Configurações:`);
console.log(`   - Username: ${DATAWASH_CONFIG.username}`);
console.log(`   - Password: ${DATAWASH_CONFIG.password.substring(0, 4)}***`);
console.log(`   - Cliente: ${DATAWASH_CONFIG.cliente}`);
console.log(`   - Base URL: ${DATAWASH_CONFIG.baseUrl}`);
console.log('');

// Construir URL da requisição
const targetUrl = `${DATAWASH_CONFIG.baseUrl}?cliente=${DATAWASH_CONFIG.cliente}&usuario=${DATAWASH_CONFIG.username}&senha=${DATAWASH_CONFIG.password}&cpf=${cpfTeste}`;

console.log(`🌐 URL completa: ${targetUrl}`);
console.log('');

// Fazer requisição
console.log('🚀 Fazendo requisição para DataWash...');

const startTime = Date.now();

fetch(targetUrl, {
  method: 'GET',
  headers: {
    'User-Agent': 'Sistema-Multas-Automatizadas-Test/1.0',
  },
  // Timeout de 15 segundos
  signal: AbortSignal.timeout(15000)
})
.then(response => {
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`⏱️  Tempo de resposta: ${duration}ms`);
  console.log(`📊 Status HTTP: ${response.status}`);
  console.log(`📋 Headers:`);
  for (const [key, value] of response.headers.entries()) {
    console.log(`   ${key}: ${value}`);
  }
  console.log('');
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.text();
})
.then(xmlText => {
  console.log('✅ Resposta recebida com sucesso!');
  console.log(`📄 Tamanho da resposta: ${xmlText.length} caracteres`);
  console.log('');
  console.log('📋 Conteúdo XML (primeiros 1000 caracteres):');
  console.log('=' .repeat(50));
  console.log(xmlText.substring(0, 1000));
  if (xmlText.length > 1000) {
    console.log('\n... (conteúdo truncado)');
  }
  console.log('=' .repeat(50));
  console.log('');
  
  // Verificar se há dados válidos no XML
  const temNome = xmlText.includes('<nome>') || xmlText.includes('<Nome>') || xmlText.includes('<NOME>');
  const temEndereco = xmlText.includes('<logradouro>') || xmlText.includes('<Logradouro>') || xmlText.includes('<LOGRADOURO>');
  const temErro = xmlText.includes('<Codigo>') && !xmlText.includes('<Codigo>0</Codigo>');
  
  console.log('🔍 Análise do conteúdo:');
  console.log(`   - Contém nome: ${temNome ? '✅' : '❌'}`);
  console.log(`   - Contém endereço: ${temEndereco ? '✅' : '❌'}`);
  console.log(`   - Contém erro: ${temErro ? '❌' : '✅'}`);
  
  if (temErro) {
    const codigoMatch = xmlText.match(/<Codigo>(\d+)<\/Codigo>/i);
    const mensagemMatch = xmlText.match(/<Mensagem>([^<]+)<\/Mensagem>/i);
    if (codigoMatch && mensagemMatch) {
      console.log(`❌ Erro DataWash: Código ${codigoMatch[1]} - ${mensagemMatch[1]}`);
    }
  }
  
  if (temNome || temEndereco) {
    console.log('🎉 API DataWash funcionando corretamente!');
  } else {
    console.log('⚠️  API respondeu mas sem dados válidos');
  }
})
.catch(error => {
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`❌ Erro na requisição (após ${duration}ms):`);
  console.log(`   Tipo: ${error.name}`);
  console.log(`   Mensagem: ${error.message}`);
  
  if (error.name === 'AbortError') {
    console.log('⏰ Timeout - A API demorou mais de 15 segundos para responder');
  } else if (error.message.includes('fetch')) {
    console.log('🌐 Erro de rede - Verifique a conectividade');
  } else if (error.message.includes('401') || error.message.includes('403')) {
    console.log('🔐 Erro de autenticação - Verifique as credenciais');
  }
  
  console.log('');
  console.log('💡 Possíveis soluções:');
  console.log('   1. Verificar se as credenciais estão corretas');
  console.log('   2. Verificar conectividade com a internet');
  console.log('   3. Verificar se o serviço DataWash está funcionando');
  console.log('   4. Tentar novamente em alguns minutos');
});