import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Usar as mesmas configurações do proxy-server
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  },
  global: {
    fetch: (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
  }
});

async function debugProxyServerDb() {
  console.log('🔍 Debugando conexão do proxy-server com Supabase...');
  
  try {
    const paymentId = 'pay_hs8lhhu2kj18m80d';
    
    console.log('\n1. 🔍 Testando busca por asaas_payment_id...');
    const { data: serviceOrderByAsaas, error: asaasError } = await supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(id, nome, cpf_cnpj, email, telefone),
        service:services(id, name, description, tipo_multa),
        company:companies(id, nome, cnpj)
      `)
      .eq('asaas_payment_id', paymentId)
      .single();
    
    if (asaasError) {
      console.error('❌ Erro na busca por asaas_payment_id:', asaasError);
    } else {
      console.log('✅ Encontrado por asaas_payment_id!');
      console.log('- ID:', serviceOrderByAsaas.id);
      console.log('- Asaas Payment ID:', serviceOrderByAsaas.asaas_payment_id);
      console.log('- QR Code Image:', !!serviceOrderByAsaas.qr_code_image);
      console.log('- PIX Payload:', !!serviceOrderByAsaas.pix_payload);
    }
    
    console.log('\n2. 🔍 Testando busca simples sem joins...');
    const { data: simpleSearch, error: simpleError } = await supabase
      .from('service_orders')
      .select('*')
      .eq('asaas_payment_id', paymentId)
      .single();
    
    if (simpleError) {
      console.error('❌ Erro na busca simples:', simpleError);
    } else {
      console.log('✅ Busca simples bem-sucedida!');
      console.log('- ID:', simpleSearch.id);
      console.log('- Asaas Payment ID:', simpleSearch.asaas_payment_id);
      console.log('- QR Code Image:', !!simpleSearch.qr_code_image);
      console.log('- PIX Payload:', !!simpleSearch.pix_payload);
      console.log('- Client ID:', simpleSearch.client_id);
      console.log('- Service ID:', simpleSearch.service_id);
      console.log('- Company ID:', simpleSearch.company_id);
    }
    
    console.log('\n3. 🔍 Listando todos os registros com asaas_payment_id...');
    const { data: allWithAsaas, error: allError } = await supabase
      .from('service_orders')
      .select('id, asaas_payment_id, qr_code_image, pix_payload, created_at')
      .not('asaas_payment_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (allError) {
      console.error('❌ Erro ao listar registros:', allError);
    } else {
      console.log('✅ Registros com asaas_payment_id:');
      allWithAsaas.forEach((record, index) => {
        console.log(`${index + 1}. ID: ${record.id} | Asaas: ${record.asaas_payment_id} | QR: ${!!record.qr_code_image} | PIX: ${!!record.pix_payload}`);
      });
    }
    
    console.log('\n4. 🧪 Simulando exatamente o que o proxy-server faz...');
    
    // Primeira tentativa: buscar por asaas_payment_id
    let serviceOrder = null;
    let serviceOrderError = null;
    
    const { data: serviceOrderByAsaasExact, error: asaasErrorExact } = await supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(id, nome, cpf_cnpj, email, telefone),
        service:services(id, name, description, tipo_multa),
        company:companies(id, nome, cnpj)
      `)
      .eq('asaas_payment_id', paymentId)
      .single();
    
    if (serviceOrderByAsaasExact) {
      serviceOrder = serviceOrderByAsaasExact;
      console.log('✅ Proxy-server simulation: Encontrado por asaas_payment_id');
    } else {
      console.log('❌ Proxy-server simulation: Não encontrado por asaas_payment_id');
      console.log('Erro:', asaasErrorExact);
      
      // Segunda tentativa: buscar por UUID
      const { data: serviceOrderByUuid, error: uuidError } = await supabase
        .from('service_orders')
        .select(`
          *,
          client:clients(id, nome, cpf_cnpj, email, telefone),
          service:services(id, name, description, tipo_multa),
          company:companies(id, nome, cnpj)
        `)
        .eq('id', paymentId)
        .single();
      
      if (serviceOrderByUuid) {
        serviceOrder = serviceOrderByUuid;
        console.log('✅ Proxy-server simulation: Encontrado por UUID');
      } else {
        serviceOrderError = uuidError || asaasErrorExact;
        console.log('❌ Proxy-server simulation: Não encontrado nem por asaas_payment_id nem por UUID');
        console.log('Erro final:', serviceOrderError);
      }
    }
    
    if (serviceOrder) {
      console.log('\n🎯 DADOS ENCONTRADOS:');
      console.log('- ID:', serviceOrder.id);
      console.log('- Asaas Payment ID:', serviceOrder.asaas_payment_id);
      console.log('- QR Code Image:', !!serviceOrder.qr_code_image, serviceOrder.qr_code_image ? `(${serviceOrder.qr_code_image.length} chars)` : '');
      console.log('- PIX Payload:', !!serviceOrder.pix_payload, serviceOrder.pix_payload ? `(${serviceOrder.pix_payload.length} chars)` : '');
      console.log('- Invoice URL:', serviceOrder.invoice_url);
      console.log('- Amount:', serviceOrder.amount);
      console.log('- Status:', serviceOrder.status);
      
      console.log('\n🔧 O proxy-server DEVERIA retornar estes dados!');
    } else {
      console.log('\n❌ PROBLEMA: Proxy-server não consegue encontrar os dados!');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugProxyServerDb();