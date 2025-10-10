// Script para listar pagamentos disponíveis no sistema
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ixjlkqvkqvkqvkqvkqvk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4amxrcXZrcXZrcXZrcXZrcXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5OTk5OTksImV4cCI6MjAxNTU3NTk5OX0.test';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listPayments() {
  try {
    console.log('🔍 === LISTANDO PAGAMENTOS DISPONÍVEIS ===');
    
    // Listar service_orders
    console.log('\n📋 Service Orders:');
    const { data: serviceOrders, error: serviceError } = await supabase
      .from('service_orders')
      .select('id, payment_id, amount, status, billing_type, qr_code_image, pix_payload')
      .limit(5);
    
    if (serviceError) {
      console.error('❌ Erro ao buscar service_orders:', serviceError);
    } else {
      serviceOrders?.forEach((order, index) => {
        console.log(`  ${index + 1}. ID: ${order.id}`);
        console.log(`     Payment ID: ${order.payment_id}`);
        console.log(`     Amount: R$ ${order.amount}`);
        console.log(`     Status: ${order.status}`);
        console.log(`     Billing Type: ${order.billing_type}`);
        console.log(`     Tem QR Code: ${!!order.qr_code_image}`);
        console.log(`     Tem PIX Payload: ${!!order.pix_payload}`);
        console.log('');
      });
    }
    
    // Listar payments
    console.log('\n💳 Payments:');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, asaas_payment_id, amount, status, payment_method')
      .limit(5);
    
    if (paymentsError) {
      console.error('❌ Erro ao buscar payments:', paymentsError);
    } else {
      payments?.forEach((payment, index) => {
        console.log(`  ${index + 1}. ID: ${payment.id}`);
        console.log(`     Asaas Payment ID: ${payment.asaas_payment_id}`);
        console.log(`     Amount: R$ ${payment.amount}`);
        console.log(`     Status: ${payment.status}`);
        console.log(`     Method: ${payment.payment_method}`);
        console.log('');
      });
    }
    
    // Listar asaas_payments
    console.log('\n🏦 Asaas Payments:');
    const { data: asaasPayments, error: asaasError } = await supabase
      .from('asaas_payments')
      .select('id, amount, status, payment_method')
      .limit(5);
    
    if (asaasError) {
      console.error('❌ Erro ao buscar asaas_payments:', asaasError);
    } else {
      asaasPayments?.forEach((payment, index) => {
        console.log(`  ${index + 1}. ID: ${payment.id}`);
        console.log(`     Amount: R$ ${payment.amount}`);
        console.log(`     Status: ${payment.status}`);
        console.log(`     Method: ${payment.payment_method}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

listPayments();