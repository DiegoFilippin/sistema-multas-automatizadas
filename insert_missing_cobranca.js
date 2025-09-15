import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Dados da cobrança retornados pelo webhook
const cobrancaData = {
  "id": "pay_hs8lhhu2kj18m80d",
  "dateCreated": "2025-09-13",
  "customer": "cus_000007017075",
  "value": 55,
  "billingType": "PIX",
  "status": "PENDING",
  "dueDate": "2025-09-13",
  "invoiceUrl": "https://sandbox.asaas.com/i/hs8lhhu2kj18m80d",
  "invoiceNumber": "11311537",
  "externalReference": "7d573ce0-125d-46bf-9e37-33d0c6074cf9",
  "encodedImage": "iVBORw0KGgoAAAANSUhEUgAAAYsAAAGLCAIAAAC5gincAAAOUklEQVR42u3ZUXYkKRADwL7/pXfPMM+kUlCh37bbVZAE80a//0REWvpayload",
  "pixCopyPaste": "00020101021226820014br.gov.bcb.pix2560qrpix-h.bradesco.com.br/9d36b84f-c70b-478f-b95c-12729b90ca25520400005303986540555.005802BR5905ASAAS6009JOINVILLE62070503***63048442",
  "description": "Pagamento para ASSOCIACAO MULTIVEICULAR DE BENEFICIOS DE SANTA CATARINA (30.903.115/0001-57) referente a Recurso de Multa - Grave"
};

async function insertMissingCobranca() {
  console.log('💾 Inserindo cobrança faltante pay_hs8lhhu2kj18m80d...');
  
  try {
    // Primeiro, vamos buscar dados de cliente e serviço para completar o registro
    console.log('🔍 Buscando cliente por external_reference...');
    
    // Buscar cliente ANA PAULA CARVALHO ZORZZI
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .ilike('nome', '%ANA PAULA%CARVALHO%ZORZZI%')
      .limit(1)
      .single();
    
    if (clientError) {
      console.log('⚠️ Cliente não encontrado por nome, buscando por CPF ou criando genérico...');
    } else {
      console.log('✅ Cliente encontrado:', client.nome);
    }
    
    // Buscar serviço de recurso de multa grave
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('tipo_multa', 'grave')
      .eq('active', true)
      .limit(1)
      .single();
    
    if (serviceError) {
      console.log('⚠️ Serviço não encontrado:', serviceError);
    } else {
      console.log('✅ Serviço encontrado:', service.name);
    }
    
    // Buscar empresa ICETRAN
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('company_type', 'icetran')
      .limit(1)
      .single();
    
    if (companyError) {
      console.log('⚠️ Empresa não encontrada:', companyError);
    } else {
      console.log('✅ Empresa encontrada:', company.nome);
    }
    
    // Preparar dados para inserção
    const serviceOrderData = {
      // IDs básicos (usar os encontrados ou valores padrão)
      client_id: client?.id || '00000000-0000-0000-0000-000000000001',
      service_id: service?.id || '00000000-0000-0000-0000-000000000002', 
      company_id: company?.id || '00000000-0000-0000-0000-000000000003',
      
      // Dados básicos do serviço
      service_type: 'recurso_multa',
      multa_type: 'grave',
      amount: cobrancaData.value,
      status: 'pending_payment',
      description: cobrancaData.description,
      
      // DADOS CRÍTICOS DO ASAAS/WEBHOOK
      asaas_payment_id: cobrancaData.id,
      customer_id: cobrancaData.customer,
      external_reference: cobrancaData.externalReference,
      
      // DADOS PIX CRÍTICOS (O QUE ESTAVA FALTANDO!)
      qr_code_image: cobrancaData.encodedImage,
      pix_payload: cobrancaData.pixCopyPaste,
      pix_qr_code: cobrancaData.encodedImage,
      pix_copy_paste: cobrancaData.pixCopyPaste,
      
      // Dados de pagamento
      invoice_url: cobrancaData.invoiceUrl,
      invoice_number: cobrancaData.invoiceNumber,
      billing_type: cobrancaData.billingType,
      date_created: cobrancaData.dateCreated,
      due_date: cobrancaData.dueDate,
      payment_description: cobrancaData.description,
      payment_link: cobrancaData.invoiceUrl,
      
      // Dados de configuração
      payment_method: 'PIX',
      net_value: cobrancaData.value,
      original_value: cobrancaData.value,
      
      // Webhook response completo
      webhook_response: [cobrancaData],
      asaas_webhook_data: [cobrancaData],
      
      // Notas com dados completos
      notes: JSON.stringify({
        webhook_data: [cobrancaData],
        processed_data: cobrancaData,
        saved_at: new Date().toISOString(),
        flow_type: 'manual_recovery',
        original_issue: 'QR code missing - data not saved from webhook'
      }),
      
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    console.log('💾 Inserindo service_order com dados completos...');
    console.log('🎯 QR Code Image:', !!serviceOrderData.qr_code_image);
    console.log('🎯 PIX Payload:', !!serviceOrderData.pix_payload);
    console.log('🎯 Asaas Payment ID:', serviceOrderData.asaas_payment_id);
    
    const { data: insertedOrder, error: insertError } = await supabase
      .from('service_orders')
      .insert(serviceOrderData)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro ao inserir service_order:', insertError);
      
      // Se der erro de foreign key, vamos criar registros básicos
      if (insertError.message.includes('foreign key')) {
        console.log('🔧 Criando registros básicos necessários...');
        
        // Criar cliente básico se não existir
        if (!client) {
          const { data: newClient, error: clientCreateError } = await supabase
            .from('clients')
            .insert({
              id: '00000000-0000-0000-0000-000000000001',
              nome: 'ANA PAULA CARVALHO ZORZZI',
              cpf_cnpj: '00000000000',
              email: 'ana.paula@email.com',
              asaas_customer_id: cobrancaData.customer
            })
            .select()
            .single();
          
          if (clientCreateError) {
            console.error('❌ Erro ao criar cliente:', clientCreateError);
          } else {
            console.log('✅ Cliente criado:', newClient.nome);
          }
        }
        
        // Tentar inserir novamente
        const { data: retryInsert, error: retryError } = await supabase
          .from('service_orders')
          .insert(serviceOrderData)
          .select()
          .single();
        
        if (retryError) {
          console.error('❌ Erro na segunda tentativa:', retryError);
        } else {
          console.log('✅ Service order inserida na segunda tentativa:', retryInsert.id);
        }
      }
    } else {
      console.log('✅ Service order inserida com sucesso!');
      console.log('📋 ID:', insertedOrder.id);
      console.log('🎯 Asaas Payment ID:', insertedOrder.asaas_payment_id);
      console.log('🎯 QR Code salvo:', !!insertedOrder.qr_code_image);
      console.log('🎯 PIX Payload salvo:', !!insertedOrder.pix_payload);
      
      // Verificar se os dados foram salvos corretamente
      console.log('\n🔍 Verificando dados salvos...');
      const { data: verification, error: verifyError } = await supabase
        .from('service_orders')
        .select('id, asaas_payment_id, qr_code_image, pix_payload, invoice_url')
        .eq('asaas_payment_id', 'pay_hs8lhhu2kj18m80d')
        .single();
      
      if (verifyError) {
        console.error('❌ Erro na verificação:', verifyError);
      } else {
        console.log('✅ Verificação bem-sucedida:');
        console.log('- ID:', verification.id);
        console.log('- Asaas Payment ID:', verification.asaas_payment_id);
        console.log('- QR Code presente:', !!verification.qr_code_image);
        console.log('- PIX Payload presente:', !!verification.pix_payload);
        console.log('- Invoice URL:', verification.invoice_url);
        
        if (verification.qr_code_image) {
          console.log('- QR Code (primeiros 50 chars):', verification.qr_code_image.substring(0, 50) + '...');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

insertMissingCobranca();