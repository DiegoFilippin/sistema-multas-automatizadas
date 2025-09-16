/**
 * Script de teste para webhook n8n
 * Testa a integração com o chat de IA para geração de recursos de multa
 */

import fetch from 'node-fetch';

// URL do webhook n8n
const WEBHOOK_URL = 'https://webhookn8n.synsoft.com.br/webhook/853f7024-bfd2-4c18-96d2-b98b697c87c4';

// Dados de teste realistas
const testData = {
  nome_requerente: "João Silva Santos",
  cpf_cnpj: "123.456.789-00",
  endereco_requerente: "Rua das Flores, 123, Centro, São Paulo - SP, CEP: 01234-567",
  placa_veiculo: "ABC-1234",
  renavam_veiculo: "12345678901",
  numero_auto: "SP123456789",
  data_hora_infracao: "2024-01-15 14:30:00",
  local_infracao: "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP",
  codigo_infracao: "74550",
  orgao_autuador: "CET - Companhia de Engenharia de Tráfego",
  idmultabancodedados: "550e8400-e29b-41d4-a716-446655440001",
  mensagem_usuario: "Olá! Preciso de ajuda para criar um recurso para esta multa de trânsito. Acredito que a autuação foi indevida pois estava respeitando o limite de velocidade."
};

async function testarWebhookN8n() {
  console.log('🚀 Iniciando teste do webhook n8n...');
  console.log('📡 URL:', WEBHOOK_URL);
  console.log('📋 Dados de teste:', JSON.stringify(testData, null, 2));
  
  try {
    console.log('\n⏳ Enviando POST para o webhook...');
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sistema-Multas-Test/1.0'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('\n📊 Status da resposta:', response.status);
    console.log('📊 Status text:', response.statusText);
    
    // Tentar ler o corpo da resposta
    let responseBody;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseBody = await response.json();
      console.log('📄 Resposta JSON:', JSON.stringify(responseBody, null, 2));
    } else {
      responseBody = await response.text();
      console.log('📄 Resposta texto:', responseBody);
    }
    
    if (response.ok) {
      console.log('\n✅ Webhook funcionando! Dados enviados com sucesso.');
      console.log('🎯 O chat com IA deve ter recebido os dados da multa.');
    } else {
      console.log('\n❌ Erro no webhook:');
      console.log('   Status:', response.status);
      console.log('   Resposta:', responseBody);
    }
    
  } catch (error) {
    console.error('\n💥 Erro ao conectar com o webhook:');
    console.error('   Tipo:', error.name);
    console.error('   Mensagem:', error.message);
    
    if (error.code) {
      console.error('   Código:', error.code);
    }
    
    // Verificar se é erro de rede
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('\n🌐 Possíveis causas:');
      console.error('   - Problema de conectividade com a internet');
      console.error('   - URL do webhook incorreta');
      console.error('   - Servidor n8n fora do ar');
    }
  }
}

// Executar o teste
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 TESTE DO WEBHOOK N8N - CHAT IA');
  console.log('=' .repeat(50));
  
  testarWebhookN8n()
    .then(() => {
      console.log('\n🏁 Teste concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal no teste:', error);
      process.exit(1);
    });
}

export { testarWebhookN8n, testData };