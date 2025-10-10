import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_PAYMENT_ID = 'pay_680tm2gi0epfnrgj';
const COMPANY_ID = 'c1f4c95f-1f16-4680-b568-aefc43390564';

// Função para buscar cobrança específica no Asaas
const fetchFromAsaas = async (paymentId) => {
  try {
    console.log(`\n🔍 === BUSCANDO ${paymentId} NO ASAAS ===`);
    
    // Buscar configuração do Asaas da empresa Diego
    const { data: asaasConfig, error: configError } = await supabase
      .from('asaas_subaccounts')
      .select('api_key, wallet_id, asaas_account_id')
      .eq('company_id', COMPANY_ID)
      .single();
    
    if (configError || !asaasConfig?.api_key) {
      console.error('❌ Configuração do Asaas não encontrada:', configError);
      return null;
    }
    
    console.log('✅ Configuração encontrada:');
    console.log('  - API Key:', asaasConfig.api_key.substring(0, 20) + '...');
    console.log('  - Wallet ID:', asaasConfig.wallet_id);
    console.log('  - Account ID:', asaasConfig.asaas_account_id);
    
    // Buscar cobrança específica no Asaas
    const response = await fetch(`https://sandbox.asaas.com/api/v3/payments/${paymentId}`, {
      headers: {
        'access_token': asaasConfig.api_key,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    if (response.ok) {
      const payment = await response.json();
      console.log('✅ Cobrança encontrada no Asaas:');
      console.log('  - ID:', payment.id);
      console.log('  - Valor:', payment.value);
      console.log('  - Status:', payment.status);
      console.log('  - Cliente:', payment.customer?.name || 'N/A');
      console.log('  - Criada em:', payment.dateCreated);
      console.log('  - Descrição:', payment.description);
      return payment;
    } else {
      const errorText = await response.text();
      console.error('❌ Cobrança não encontrada no Asaas:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('💥 Erro ao buscar no Asaas:', error.message);
    return null;
  }
};

// Função para mapear status do Asaas
const mapAsaasStatus = (asaasStatus) => {
  const statusMap = {
    'PENDING': 'pending',
    'RECEIVED': 'paid',
    'CONFIRMED': 'paid',
    'OVERDUE': 'overdue',
    'REFUNDED': 'refunded',
    'RECEIVED_IN_CASH': 'paid',
    'REFUND_REQUESTED': 'refund_requested',
    'REFUND_IN_PROGRESS': 'refund_in_progress',
    'CHARGEBACK_REQUESTED': 'chargeback_requested',
    'CHARGEBACK_DISPUTE': 'chargeback_dispute',
    'AWAITING_CHARGEBACK_REVERSAL': 'awaiting_chargeback_reversal',
    'DUNNING_REQUESTED': 'dunning_requested',
    'DUNNING_RECEIVED': 'dunning_received',
    'AWAITING_RISK_ANALYSIS': 'awaiting_risk_analysis'
  };
  
  return statusMap[asaasStatus] || 'pending';
};

// Função para extrair tipo de multa da descrição
const extractMultaType = (description) => {
  if (!description) return 'Multa Leve';
  
  const desc = description.toLowerCase();
  if (desc.includes('grave')) return 'Multa Grave';
  if (desc.includes('gravíssima')) return 'Multa Gravíssima';
  if (desc.includes('média')) return 'Multa Média';
  return 'Multa Leve';
};

// Função para sincronizar cobrança específica
const syncSpecificPayment = async (asaasPayment) => {
  try {
    console.log('\n💾 === SINCRONIZANDO COBRANÇA ===');
    
    const paymentData = {
      payment_id: asaasPayment.id,
      company_id: COMPANY_ID,
      client_name: asaasPayment.customer?.name || 'DIEGO DA SILVA FILIPPIN',
      customer_name: asaasPayment.customer?.name || 'DIEGO DA SILVA FILIPPIN',
      amount: asaasPayment.value,
      status: mapAsaasStatus(asaasPayment.status),
      multa_type: extractMultaType(asaasPayment.description),
      qr_code: asaasPayment.pixTransaction?.qrCode?.payload,
      pix_copy_paste: asaasPayment.pixTransaction?.qrCode?.payload,
      payment_url: asaasPayment.invoiceUrl,
      created_at: asaasPayment.dateCreated,
      paid_at: asaasPayment.paymentDate,
      synced_from_asaas: true,
      description: asaasPayment.description
    };
    
    console.log('📋 Dados para salvar:');
    console.log('  - Payment ID:', paymentData.payment_id);
    console.log('  - Company ID:', paymentData.company_id);
    console.log('  - Cliente:', paymentData.client_name);
    console.log('  - Valor:', paymentData.amount);
    console.log('  - Status:', paymentData.status);
    console.log('  - Tipo:', paymentData.multa_type);
    
    // Salvar na tabela service_orders
    const { data: saved, error } = await supabase
      .from('service_orders')
      .upsert(paymentData, { 
        onConflict: 'payment_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao salvar:', error);
      return null;
    } else {
      console.log('✅ Cobrança sincronizada com sucesso!');
      console.log('  - ID salvo:', saved.id);
      console.log('  - Payment ID:', saved.payment_id);
      return saved;
    }
  } catch (error) {
    console.error('💥 Erro na sincronização:', error.message);
    return null;
  }
};

// Função para investigar cobrança no banco
const investigateInDatabase = async () => {
  console.log('\n🔍 === INVESTIGANDO NO BANCO DE DADOS ===');
  
  const tables = ['service_orders', 'payments', 'asaas_payments'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('payment_id', TARGET_PAYMENT_ID);
      
      console.log(`📊 ${table}: ${data?.length || 0} registros`);
      if (data && data.length > 0) {
        console.log('✅ Encontrado:', {
          id: data[0].id,
          payment_id: data[0].payment_id,
          client_name: data[0].client_name || data[0].customer_name,
          amount: data[0].amount,
          status: data[0].status,
          created_at: data[0].created_at
        });
      }
    } catch (error) {
      console.error(`❌ Erro em ${table}:`, error.message);
    }
  }
};

// Função principal
const investigatePayment = async () => {
  console.log('🚀 === INVESTIGAÇÃO DA COBRANÇA pay_680tm2gi0epfnrgj ===');
  console.log('⏰ Timestamp:', new Date().toISOString());
  
  // 1. Verificar no banco de dados
  await investigateInDatabase();
  
  // 2. Buscar no Asaas diretamente
  const asaasPayment = await fetchFromAsaas(TARGET_PAYMENT_ID);
  
  if (!asaasPayment) {
    console.log('\n❌ RESULTADO: Cobrança não encontrada no Asaas');
    return;
  }
  
  // 3. Forçar sincronização desta cobrança
  const syncedPayment = await syncSpecificPayment(asaasPayment);
  
  if (syncedPayment) {
    console.log('\n✅ RESULTADO: Cobrança sincronizada com sucesso!');
    console.log('🎯 A cobrança agora deve aparecer na lista "Minhas Cobranças"');
  } else {
    console.log('\n❌ RESULTADO: Falha na sincronização');
  }
  
  // 4. Verificar novamente no banco após sincronização
  console.log('\n🔄 === VERIFICAÇÃO FINAL ===');
  await investigateInDatabase();
};

// Executar investigação
investigatePayment().catch(console.error);