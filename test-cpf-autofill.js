#!/usr/bin/env node

/**
 * Script de teste para CPF autofill
 * Testa os endpoints de consulta de CPF localmente
 * 
 * Uso: node test-cpf-autofill.js [CPF]
 */

import fetch from 'node-fetch'

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000'
const TEST_CPF = process.argv[2] || '11144477735'

console.log('🧪 TESTE DE CPF AUTOFILL')
console.log('========================')
console.log(`📋 API Base: ${API_BASE}`)
console.log(`🔢 CPF de teste: ${TEST_CPF}`)
console.log('')

async function testEndpoint(name, url, options = {}) {
  console.log(`🧪 Testando ${name}...`)
  console.log(`   URL: ${url}`)
  
  try {
    const start = Date.now()
    const response = await fetch(url, options)
    const duration = Date.now() - start
    
    console.log(`   ⏱️  Tempo de resposta: ${duration}ms`)
    console.log(`   📊 Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ Sucesso!`)
      
      if (data.nome) {
        console.log(`   👤 Nome: ${data.nome}`)
      }
      if (data.endereco) {
        console.log(`   🏠 Endereço: ${data.endereco.logradouro || 'Não disponível'}`)
      }
      
      return { success: true, data }
    } else {
      const errorText = await response.text()
      console.log(`   ❌ Erro: ${errorText}`)
      return { success: false, error: errorText }
    }
  } catch (error) {
    console.log(`   💥 Erro de rede: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

async function runTests() {
  console.log('1️⃣ VERIFICANDO STATUS DO SISTEMA')
  console.log('-----------------------------------')
  
  const statusResult = await testEndpoint('Status do Sistema', `${API_BASE}/api/debug-cpf-status`)
  
  if (statusResult.success && statusResult.data) {
    const status = statusResult.data
    console.log('\n📋 RESUMO DO STATUS:')
    console.log(`   Ambiente: ${status.environment}`)
    console.log(`   Variáveis DataWash: ${status.variables.datawash.username ? '✅' : '❌'} username, ${status.variables.datawash.password ? '✅' : '❌'} password, ${status.variables.datawash.cliente ? '✅' : '❌'} cliente, ${status.variables.datawash.baseUrl ? '✅' : '❌'} baseUrl`)
    console.log(`   Webhook n8n: ${status.variables.n8n.webhookUrl ? '✅' : '❌'}`)
    console.log(`   API DataWash direta: ${status.endpoints.datawashDirect.status === 'working' ? '✅' : '❌'}`)
    console.log(`   Webhook n8n: ${status.endpoints.webhook.status === 'working' ? '✅' : '❌'}`)
    
    if (status.recommendations && status.recommendations.length > 0) {
      console.log('\n⚠️  RECOMENDAÇÕES:')
      status.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`)
      })
    }
  }
  
  console.log('\n2️⃣ TESTANDO API DATAWASH DIRETA')
  console.log('----------------------------------')
  
  await testEndpoint('API DataWash Direta', `${API_BASE}/api/datawash/${TEST_CPF}`)
  
  console.log('\n3️⃣ TESTANDO WEBHOOK N8N')
  console.log('-------------------------')
  
  await testEndpoint('Webhook n8n', `${API_BASE}/api/datawash/webhook-cpf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cpf: TEST_CPF })
  })
  
  console.log('\n✅ TESTES CONCLUÍDOS!')
  console.log('\n💡 PARA CONFIGURAR NO VERCEL:')
  console.log('   1. Acesse: https://vercel.com/dashboard')
  console.log('   2. Selecione seu projeto')
  console.log('   3. Vá em Settings → Environment Variables')
  console.log('   4. Adicione as variáveis faltantes')
  console.log('   5. Faça um redeploy')
}

// Executar testes
runTests().catch(console.error)