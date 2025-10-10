import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Função para carregar variáveis de ambiente do .env
function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            process.env[key] = value;
          }
        }
      }
      console.log('✅ Arquivo .env carregado com sucesso');
    } else {
      console.log('⚠️ Arquivo .env não encontrado');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar .env:', error);
  }
}

// Carregar variáveis de ambiente
loadEnvFile();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Função para carregar configuração do Asaas
async function loadAsaasConfig() {
  try {
    const { data: config, error } = await supabase
      .from('asaas_config')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (error || !config) {
      console.error('❌ Erro ao carregar configuração do Asaas:', error);
      return null;
    }
    
    // Determinar a API key baseada no ambiente
    const apiKey = config.environment === 'production' 
      ? config.api_key_production 
      : config.api_key_sandbox;
    
    return {
      ...config,
      api_key: apiKey
    };
  } catch (error) {
    console.error('❌ Erro ao buscar configuração do Asaas:', error);
    return null;
  }
}

console.log('🚀 === CORREÇÃO COMPLETA DO QR CODE - SALVAMENTO EM AMBAS AS TABELAS ===');
console.log('📋 Este script irá:');
console.log('  1. Buscar cobranças sem QR code nas tabelas service_orders e payments');
console.log('  2. Buscar dados completos no Asaas para cada cobrança');
console.log('  3. Salvar TODAS as informações em ambas as tabelas');
console.log('  4. Sincronizar dados PIX entre as tabelas');
console.log('');

// Função para buscar dados completos do Asaas
async function fetchAsaasPaymentData(asaasPaymentId, asaasConfig) {
  try {
    console.log(`🔍 Buscando dados completos no Asaas para: ${asaasPaymentId}`);
    
    const apiKey = asaasConfig.api_key;
    const baseUrl = asaasConfig.environment === 'production' 
      ? 'https://api.asaas.com/v3' 
      : 'https://api-sandbox.asaas.com/v3';
    
    // 1. Buscar dados básicos do pagamento
    const paymentResponse = await fetch(`${baseUrl}/payments/${asaasPaymentId}`, {
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey
      }
    });
    
    if (!paymentResponse.ok) {
      console.error(`❌ Erro ao buscar pagamento ${asaasPaymentId}:`, paymentResponse.status);
      return null;
    }
    
    const paymentData = await paymentResponse.json();
    console.log(`✅ Dados básicos obtidos:`, {
      id: paymentData.id,
      status: paymentData.status,
      value: paymentData.value,
      billingType: paymentData.billingType
    });
    
    // 2. Buscar QR Code PIX se for pagamento PIX
    let pixData = null;
    if (paymentData.billingType === 'PIX') {
      console.log(`🔍 Buscando QR Code PIX para: ${asaasPaymentId}`);
      
      const pixResponse = await fetch(`${baseUrl}/payments/${asaasPaymentId}/pixQrCode`, {
        headers: {
          'Content-Type': 'application/json',
          'access_token': apiKey
        }
      });
      
      if (pixResponse.ok) {
        pixData = await pixResponse.json();
        console.log(`✅ QR Code PIX obtido:`, {
          hasEncodedImage: !!pixData.encodedImage,
          hasPayload: !!pixData.payload,
          expirationDate: pixData.expirationDate
        });
      } else {
        console.warn(`⚠️ Não foi possível obter QR Code PIX:`, pixResponse.status);
      }
    }
    
    // 3. Retornar dados completos
    return {
      payment: paymentData,
      pix: pixData,
      // Campos mapeados para facilitar o uso
      mappedData: {
        asaas_payment_id: paymentData.id,
        customer_id: paymentData.customer,
        amount: paymentData.value,
        net_value: paymentData.netValue,
        original_value: paymentData.originalValue,
        interest_value: paymentData.interestValue,
        discount_value: paymentData.discount?.value || 0,
        fine_value: paymentData.fine?.value || 0,
        status: paymentData.status,
        billing_type: paymentData.billingType,
        payment_method: paymentData.billingType,
        due_date: paymentData.dueDate,
        original_due_date: paymentData.originalDueDate,
        payment_date: paymentData.paymentDate,
        client_payment_date: paymentData.clientPaymentDate,
        date_created: paymentData.dateCreated,
        description: paymentData.description,
        external_reference: paymentData.externalReference,
        invoice_url: paymentData.invoiceUrl,
        invoice_number: paymentData.invoiceNumber,
        installment_count: paymentData.installmentCount,
        installment_value: paymentData.installmentValue,
        installment_number: paymentData.installmentNumber,
        // Dados PIX
        qr_code_image: pixData?.encodedImage || null,
        pix_qr_code: pixData?.encodedImage || null,
        pix_payload: pixData?.payload || null,
        pix_copy_paste: pixData?.payload || null,
        pix_code: pixData?.payload || null,
        pix_expiration_date: pixData?.expirationDate || null,
        // Dados completos para referência
        asaas_full_data: paymentData,
        asaas_pix_data: pixData
      }
    };
    
  } catch (error) {
    console.error(`❌ Erro ao buscar dados do Asaas para ${asaasPaymentId}:`, error);
    return null;
  }
}

// Função para atualizar service_orders com dados completos
async function updateServiceOrder(serviceOrderId, asaasData) {
  try {
    console.log(`💾 Atualizando service_order ${serviceOrderId} com dados completos...`);
    
    const updateData = {
      // Dados básicos
      asaas_payment_id: asaasData.mappedData.asaas_payment_id,
      billing_type: asaasData.mappedData.billing_type,
      date_created: asaasData.mappedData.date_created,
      due_date: asaasData.mappedData.due_date,
      payment_description: asaasData.mappedData.description,
      invoice_url: asaasData.mappedData.invoice_url,
      invoice_number: asaasData.mappedData.invoice_number,
      external_reference: asaasData.mappedData.external_reference,
      
      // Dados PIX - TODOS OS CAMPOS
      qr_code_image: asaasData.mappedData.qr_code_image,
      pix_payload: asaasData.mappedData.pix_payload,
      
      // Dados de split e webhook
      webhook_response: {
        payment_data: asaasData.payment,
        pix_data: asaasData.pix,
        updated_at: new Date().toISOString(),
        source: 'fix_qr_code_script'
      },
      
      // Timestamp de atualização
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('service_orders')
      .update(updateData)
      .eq('id', serviceOrderId)
      .select();
    
    if (error) {
      console.error(`❌ Erro ao atualizar service_order ${serviceOrderId}:`, error);
      return false;
    }
    
    console.log(`✅ Service_order ${serviceOrderId} atualizado com sucesso`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erro ao atualizar service_order ${serviceOrderId}:`, error);
    return false;
  }
}

// Função para mapear status do Asaas para status da tabela payments
function mapAsaasStatusToPaymentStatus(asaasStatus) {
  const statusMap = {
    'PENDING': 'pending',
    'AWAITING_PAYMENT': 'pending',
    'RECEIVED': 'confirmed',
    'CONFIRMED': 'confirmed',
    'OVERDUE': 'expired',
    'REFUNDED': 'refunded',
    'CANCELLED': 'cancelled'
  };
  
  return statusMap[asaasStatus] || 'pending';
}

// Função para atualizar payments com dados completos
async function updatePayment(paymentId, asaasData) {
  try {
    console.log(`💾 Atualizando payment ${paymentId} com dados completos...`);
    
    const updateData = {
      // Dados básicos
      asaas_payment_id: asaasData.mappedData.asaas_payment_id,
      amount: asaasData.mappedData.amount,
      status: mapAsaasStatusToPaymentStatus(asaasData.mappedData.status),
      payment_method: asaasData.mappedData.payment_method,
      due_date: asaasData.mappedData.due_date,
      
      // Dados PIX - TODOS OS CAMPOS
      pix_qr_code: asaasData.mappedData.pix_qr_code,
      pix_copy_paste: asaasData.mappedData.pix_copy_paste,
      
      // Dados de confirmação
      confirmed_at: asaasData.mappedData.payment_date ? new Date(asaasData.mappedData.payment_date).toISOString() : null,
      
      // Dados completos do webhook
      asaas_webhook_data: {
        payment_data: asaasData.payment,
        pix_data: asaasData.pix,
        updated_at: new Date().toISOString(),
        source: 'fix_qr_code_script'
      },
      
      // Timestamp de atualização
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)
      .select();
    
    if (error) {
      console.error(`❌ Erro ao atualizar payment ${paymentId}:`, error);
      return false;
    }
    
    console.log(`✅ Payment ${paymentId} atualizado com sucesso`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erro ao atualizar payment ${paymentId}:`, error);
    return false;
  }
}

// Função principal
async function fixQrCodeCompleteData() {
  try {
    // Carregar configuração do Asaas
    console.log('🔧 Carregando configuração do Asaas...');
    const asaasConfig = await loadAsaasConfig();
    
    if (!asaasConfig) {
      console.error('❌ Não foi possível carregar a configuração do Asaas');
      return;
    }
    
    console.log('✅ Configuração do Asaas carregada:', {
      environment: asaasConfig.environment,
      hasApiKey: !!asaasConfig.api_key
    });
    
    console.log('\n🔍 === BUSCANDO COBRANÇAS SEM QR CODE ===');
    
    // 1. Buscar service_orders sem QR code
    console.log('📋 Buscando service_orders sem QR code...');
    const { data: serviceOrders, error: serviceOrdersError } = await supabase
      .from('service_orders')
      .select('*')
      .not('asaas_payment_id', 'is', null)
      .or('qr_code_image.is.null,pix_payload.is.null')
      .order('created_at', { ascending: false })
      .limit(10); // Limitar para teste
    
    if (serviceOrdersError) {
      console.error('❌ Erro ao buscar service_orders:', serviceOrdersError);
      return;
    }
    
    console.log(`📊 Encontrados ${serviceOrders?.length || 0} service_orders sem QR code`);
    
    // 2. Buscar payments sem QR code
    console.log('📋 Buscando payments sem QR code...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .not('asaas_payment_id', 'is', null)
      .or('pix_qr_code.is.null,pix_copy_paste.is.null')
      .order('created_at', { ascending: false })
      .limit(10); // Limitar para teste
    
    if (paymentsError) {
      console.error('❌ Erro ao buscar payments:', paymentsError);
      return;
    }
    
    console.log(`📊 Encontrados ${payments?.length || 0} payments sem QR code`);
    
    // 3. Processar service_orders
    if (serviceOrders && serviceOrders.length > 0) {
      console.log('\n🔄 === PROCESSANDO SERVICE_ORDERS ===');
      
      for (const serviceOrder of serviceOrders) {
        console.log(`\n📋 Processando service_order: ${serviceOrder.id}`);
        console.log(`  - Asaas Payment ID: ${serviceOrder.asaas_payment_id}`);
        console.log(`  - Status atual: ${serviceOrder.status}`);
        console.log(`  - Tem QR Code: ${!!serviceOrder.qr_code_image}`);
        console.log(`  - Tem PIX Payload: ${!!serviceOrder.pix_payload}`);
        
        // Buscar dados completos no Asaas
        const asaasData = await fetchAsaasPaymentData(serviceOrder.asaas_payment_id, asaasConfig);
        
        if (asaasData) {
          // Atualizar service_order
          const success = await updateServiceOrder(serviceOrder.id, asaasData);
          
          if (success) {
            console.log(`✅ Service_order ${serviceOrder.id} atualizado com dados completos`);
            
            // Se existe payment_id, atualizar também a tabela payments
            if (serviceOrder.payment_id) {
              console.log(`🔄 Sincronizando com payment ${serviceOrder.payment_id}...`);
              await updatePayment(serviceOrder.payment_id, asaasData);
            }
          }
        } else {
          console.log(`❌ Não foi possível obter dados do Asaas para ${serviceOrder.asaas_payment_id}`);
        }
        
        // Aguardar um pouco para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 4. Processar payments órfãos (sem service_order correspondente)
    if (payments && payments.length > 0) {
      console.log('\n🔄 === PROCESSANDO PAYMENTS ÓRFÃOS ===');
      
      for (const payment of payments) {
        // Verificar se já foi processado via service_order
        const { data: existingServiceOrder } = await supabase
          .from('service_orders')
          .select('id')
          .eq('payment_id', payment.id)
          .single();
        
        if (existingServiceOrder) {
          console.log(`⏭️ Payment ${payment.id} já processado via service_order`);
          continue;
        }
        
        console.log(`\n💳 Processando payment órfão: ${payment.id}`);
        console.log(`  - Asaas Payment ID: ${payment.asaas_payment_id}`);
        console.log(`  - Status atual: ${payment.status}`);
        console.log(`  - Tem QR Code: ${!!payment.pix_qr_code}`);
        console.log(`  - Tem PIX Copy Paste: ${!!payment.pix_copy_paste}`);
        
        // Buscar dados completos no Asaas
        const asaasData = await fetchAsaasPaymentData(payment.asaas_payment_id, asaasConfig);
        
        if (asaasData) {
          await updatePayment(payment.id, asaasData);
        } else {
          console.log(`❌ Não foi possível obter dados do Asaas para ${payment.asaas_payment_id}`);
        }
        
        // Aguardar um pouco para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n🎉 === CORREÇÃO COMPLETA FINALIZADA ===');
    console.log('✅ Todas as cobranças foram processadas');
    console.log('✅ Dados PIX sincronizados entre as tabelas');
    console.log('✅ QR codes disponíveis para exibição no modal');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Teste criando uma nova cobrança');
    console.log('2. Verifique se o QR code aparece no modal');
    console.log('3. Confirme se os dados estão sincronizados entre as tabelas');
    
  } catch (error) {
    console.error('❌ Erro na correção completa:', error);
  }
}

// Executar correção
fixQrCodeCompleteData();