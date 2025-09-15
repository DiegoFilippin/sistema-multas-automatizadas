import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestPayment() {
  console.log('🧪 Criando nova cobrança para testar QR Code real...');
  
  try {
    // Buscar IDs reais do banco
    console.log('🔍 Buscando dados reais do banco...');
    
    // Buscar cliente
    const { data: clients } = await supabase
      .from('clients')
      .select('id, nome')
      .limit(1);
    
    if (!clients || clients.length === 0) {
      console.error('❌ Nenhum cliente encontrado');
      return;
    }
    
    // Buscar serviço
    const { data: services } = await supabase
      .from('services')
      .select('id, name, acsm_value, icetran_value, taxa_cobranca')
      .limit(1);
    
    if (!services || services.length === 0) {
      console.error('❌ Nenhum serviço encontrado');
      return;
    }
    
    // Buscar empresa com wallet configurado
    const { data: companies } = await supabase
      .from('companies')
      .select('id, nome, asaas_wallet_id')
      .not('asaas_wallet_id', 'is', null)
      .limit(1);
    
    // Se não encontrar empresa com wallet, buscar ICETRAN
    if (!companies || companies.length === 0) {
      const { data: icetranCompanies } = await supabase
        .from('companies')
        .select('id, nome, asaas_wallet_id')
        .eq('company_type', 'icetran')
        .limit(1);
      
      if (icetranCompanies && icetranCompanies.length > 0) {
        companies = icetranCompanies;
      }
    }
    
    if (!companies || companies.length === 0) {
      console.error('❌ Nenhuma empresa encontrada');
      return;
    }
    
    const client = clients[0];
    const service = services[0];
    const company = companies[0];
    
    console.log('✅ Dados encontrados:');
    console.log('👤 Cliente:', client.nome, '(' + client.id + ')');
    console.log('🛠️ Serviço:', service.name, '(' + service.id + ')');
    console.log('🏢 Empresa:', company.nome, '(' + company.id + ')');
    
    // Calcular valor da cobrança
    const valorMinimo = (service.acsm_value || 0) + (service.icetran_value || 0) + (service.taxa_cobranca || 3.50);
    const valorCobranca = valorMinimo + 10; // Adicionar margem
    
    console.log('💰 Valor da cobrança:', valorCobranca);
    
    // Criar cobrança
    const response = await fetch('http://localhost:3001/api/payments/create-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_id: client.id,
        service_id: service.id,
        company_id: company.id,
        valor_cobranca: valorCobranca
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na requisição:', response.status, errorText);
      return;
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('\n🎉 Cobrança criada com sucesso!');
      console.log('📄 Service Order ID:', result.payment.id);
      console.log('🏷️ Payment ID:', result.payment.webhook_id);
      console.log('💰 Valor:', result.payment.amount);
      
      // Verificar dados completos
      if (result.payment.complete_data) {
        const completeData = result.payment.complete_data;
        console.log('\n🔍 Dados Completos:');
        
        if (completeData.qr_code_image) {
          const qrLength = completeData.qr_code_image.length;
          console.log('🖼️ QR Code Image:', qrLength > 1000 ? '✅ REAL (tamanho: ' + qrLength + ')' : '❌ FAKE (tamanho: ' + qrLength + ')');
          
          // Verificar se é o QR code fake antigo
          const fakeQRCode = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          if (completeData.qr_code_image === fakeQRCode) {
            console.log('  ⚠️ Este é o QR code fake antigo!');
          } else if (qrLength > 1000) {
            console.log('  🎉 QR code real detectado!');
            console.log('  📏 Primeiros 50 chars:', completeData.qr_code_image.substring(0, 50) + '...');
          }
        } else {
          console.log('🖼️ QR Code Image: ❌ VAZIO');
        }
        
        if (completeData.pix_payload) {
          console.log('💳 PIX Payload: ✅', completeData.pix_payload.substring(0, 50) + '...');
        } else {
          console.log('💳 PIX Payload: ❌ VAZIO');
        }
        
        if (completeData.invoice_url) {
          console.log('🧾 Invoice URL: ✅', completeData.invoice_url);
        } else {
          console.log('🧾 Invoice URL: ❌ VAZIO');
        }
      }
      
      console.log('\n🎯 TESTE DA CORREÇÃO:');
      if (result.payment.complete_data?.qr_code_image && 
          result.payment.complete_data.qr_code_image.length > 1000 &&
          result.payment.complete_data.qr_code_image !== 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==') {
        console.log('✅ SUCESSO! A correção do QR Code está funcionando!');
        console.log('🎉 O modal agora deve exibir o QR code real!');
      } else {
        console.log('❌ FALHA! O QR code ainda está sendo salvo incorretamente.');
      }
      
      console.log('\n💡 Agora você pode abrir o modal desta cobrança para ver o QR code real.');
      console.log('🔗 Service Order ID para testar:', result.payment.id);
      
    } else {
      console.error('❌ Erro ao criar cobrança:', result.error || result.message);
    }
    
  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
  }
}

// Executar o teste
createTestPayment();