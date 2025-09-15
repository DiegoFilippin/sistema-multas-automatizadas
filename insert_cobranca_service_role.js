import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Usar service_role key para contornar RLS
const supabase = createClient(
  'https://ktgynzdzvfcpvbdbtplu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA',
  {
    auth: {
      persistSession: false
    }
  }
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

async function insertCobrancaWithServiceRole() {
  console.log('💾 Inserindo cobrança com service_role key...');
  
  try {
    // Buscar dados necessários
    console.log('🔍 Buscando dados necessários...');
    
    // Buscar cliente ANA PAULA
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .ilike('nome', '%ANA PAULA%')
      .limit(1)
      .single();
    
    console.log('Cliente encontrado:', client?.nome || 'Não encontrado');
    
    // Buscar qualquer serviço ativo
    const { data: service } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .limit(1)
      .single();
    
    console.log('Serviço encontrado:', service?.name || 'Não encontrado');
    
    // Buscar empresa ICETRAN
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .limit(1)
      .single();
    
    console.log('Empresa encontrada:', company?.nome || 'Não encontrado');
    
    // Preparar dados mínimos necessários
    const serviceOrderData = {
      // IDs (usar encontrados ou criar UUIDs únicos)
      client_id: client?.id || crypto.randomUUID(),
      service_id: service?.id || crypto.randomUUID(),
      company_id: company?.id || crypto.randomUUID(),
      
      // Dados básicos
      service_type: 'recurso_multa',
      multa_type: 'grave',
      amount: cobrancaData.value,
      status: 'pending_payment',
      description: cobrancaData.description,
      
      // DADOS CRÍTICOS DO WEBHOOK (O QUE IMPORTA PARA O QR CODE)
      asaas_payment_id: cobrancaData.id,
      qr_code_image: cobrancaData.encodedImage,
      pix_payload: cobrancaData.pixCopyPaste,
      pix_copy_paste: cobrancaData.pixCopyPaste,
      
      // Outros dados importantes
      invoice_url: cobrancaData.invoiceUrl,
      invoice_number: cobrancaData.invoiceNumber,
      external_reference: cobrancaData.externalReference,
      billing_type: cobrancaData.billingType,
      payment_method: 'PIX',
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('💾 Inserindo com dados críticos...');
    console.log('🎯 Asaas Payment ID:', serviceOrderData.asaas_payment_id);
    console.log('🎯 QR Code presente:', !!serviceOrderData.qr_code_image);
    console.log('🎯 PIX Payload presente:', !!serviceOrderData.pix_payload);
    
    const { data: insertedOrder, error: insertError } = await supabase
      .from('service_orders')
      .insert(serviceOrderData)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro ao inserir:', insertError);
      
      // Tentar inserção mais simples
      console.log('🔄 Tentando inserção simplificada...');
      const simpleData = {
        asaas_payment_id: cobrancaData.id,
        qr_code_image: cobrancaData.encodedImage,
        pix_payload: cobrancaData.pixCopyPaste,
        amount: cobrancaData.value,
        status: 'pending_payment',
        service_type: 'recurso_multa',
        description: 'Recurso de Multa - ANA PAULA CARVALHO ZORZZI'
      };
      
      const { data: simpleInsert, error: simpleError } = await supabase
        .from('service_orders')
        .insert(simpleData)
        .select()
        .single();
      
      if (simpleError) {
        console.error('❌ Erro na inserção simples:', simpleError);
      } else {
        console.log('✅ Inserção simples bem-sucedida:', simpleInsert.id);
      }
    } else {
      console.log('✅ Inserção completa bem-sucedida:', insertedOrder.id);
    }
    
    // Verificar se a cobrança foi salva
    console.log('\n🔍 Verificando cobrança salva...');
    const { data: verification, error: verifyError } = await supabase
      .from('service_orders')
      .select('id, asaas_payment_id, qr_code_image, pix_payload, amount, status')
      .eq('asaas_payment_id', 'pay_hs8lhhu2kj18m80d')
      .single();
    
    if (verifyError) {
      console.error('❌ Erro na verificação:', verifyError);
    } else {
      console.log('✅ Cobrança encontrada no banco:');
      console.log('- ID:', verification.id);
      console.log('- Asaas Payment ID:', verification.asaas_payment_id);
      console.log('- QR Code presente:', !!verification.qr_code_image);
      console.log('- PIX Payload presente:', !!verification.pix_payload);
      console.log('- Valor:', verification.amount);
      console.log('- Status:', verification.status);
      
      if (verification.qr_code_image) {
        console.log('\n🎯 QR Code salvo com sucesso!');
        console.log('Tamanho:', verification.qr_code_image.length, 'caracteres');
        console.log('Início:', verification.qr_code_image.substring(0, 50) + '...');
      }
      
      if (verification.pix_payload) {
        console.log('\n🎯 PIX Payload salvo com sucesso!');
        console.log('Tamanho:', verification.pix_payload.length, 'caracteres');
        console.log('Início:', verification.pix_payload.substring(0, 50) + '...');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

insertCobrancaWithServiceRole();