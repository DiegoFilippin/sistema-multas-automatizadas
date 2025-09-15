import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAYMENT_ID = 'pay_680tm2gi0epfnrgj';
const COMPANY_ID = 'c1f4c95f-1f16-4680-b568-aefc43390564'; // Diego's company

// Função para buscar cobrança específica no Asaas
const fetchFromAsaas = async (paymentId) => {
  try {
    console.log('🔍 Buscando no Asaas:', paymentId);
    
    // Buscar configuração do Asaas para a empresa Diego
    const { data: asaasAccount, error: asaasError } = await supabase
      .from('asaas_subaccounts')
      .select('api_key, wallet_id, status')
      .eq('company_id', COMPANY_ID)
      .eq('status', 'active')
      .single();
    
    if (asaasError || !asaasAccount?.api_key) {
      console.error('❌ API Key do Asaas não encontrada:', asaasError);
      return null;
    }
    
    console.log('✅ API Key encontrada:', asaasAccount.api_key.substring(0, 20) + '...');
    console.log('✅ Wallet ID:', asaasAccount.wallet_id);
    
    // Buscar cobrança específica no Asaas
    const response = await fetch(`https://sandbox.asaas.com/api/v3/payments/${paymentId}`, {
      headers: {
        'access_token': asaasAccount.api_key,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const payment = await response.json();
      console.log('✅ Cobrança encontrada no Asaas:');
      console.log('  - ID:', payment.id);
      console.log('  - Cliente:', payment.customer?.name);
      console.log('  - Valor:', payment.value);
      console.log('  - Status:', payment.status);
      console.log('  - Descrição:', payment.description);
      console.log('  - Data:', payment.dateCreated);
      return payment;
    } else {
      const errorText = await response.text();
      console.error('❌ Cobrança não encontrada no Asaas:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao buscar no Asaas:', error);
    return null;
  }
};

// Mapear status do Asaas para formato local
const mapAsaasStatus = (asaasStatus) => {
  const statusMap = {
    'PENDING': 'pending',
    'AWAITING_PAYMENT': 'pending',
    'RECEIVED': 'confirmed',
    'CONFIRMED': 'confirmed',
    'OVERDUE': 'overdue',
    'REFUNDED': 'refunded',
    'RECEIVED_IN_CASH': 'confirmed'
  };
  
  return statusMap[asaasStatus] || 'pending';
};

// Extrair tipo de multa da descrição
const extractMultaType = (description) => {
  if (!description) return 'Multa Leve';
  
  if (description.includes('GRAVÍSSIMA')) return 'Multa Gravíssima';
  if (description.includes('GRAVE')) return 'Multa Grave';
  if (description.includes('MÉDIA')) return 'Multa Média';
  if (description.includes('LEVE')) return 'Multa Leve';
  
  return 'Multa Leve';
};

// Função para sincronizar cobrança específica
const syncSpecificPayment = async (asaasPayment) => {
  try {
    console.log('\n🔄 Sincronizando cobrança...');
    
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
      updated_at: new Date().toISOString()
    };
    
    console.log('📝 Dados para salvar:');
    console.log('  - Payment ID:', paymentData.payment_id);
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
      console.log('  - ID no banco:', saved.id);
      return saved;
    }
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    return null;
  }
};

// Função principal de investigação
const investigatePayment = async () => {
  console.log('=== INVESTIGANDO COBRANÇA pay_680tm2gi0epfnrgj ===\n');
  
  // 1. Verificar no banco de dados
  console.log('1️⃣ Verificando no banco de dados...');
  const tables = ['payments', 'service_orders', 'asaas_payments'];
  
  let foundInDB = false;
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('payment_id', PAYMENT_ID);
    
    console.log(`  - ${table}: ${data?.length || 0} registros`);
    if (data && data.length > 0) {
      console.log('    ✅ Encontrado:', data[0]);
      foundInDB = true;
    }
  }
  
  if (!foundInDB) {
    console.log('  ❌ Cobrança NÃO encontrada no banco de dados\n');
  }
  
  // 2. Buscar no Asaas diretamente
  console.log('2️⃣ Buscando no Asaas...');
  const asaasPayment = await fetchFromAsaas(PAYMENT_ID);
  
  if (!asaasPayment) {
    console.log('❌ Cobrança não encontrada no Asaas. Verifique o ID.');
    return;
  }
  
  // 3. Forçar sincronização desta cobrança
  console.log('\n3️⃣ Forçando sincronização...');
  const syncedPayment = await syncSpecificPayment(asaasPayment);
  
  if (syncedPayment) {
    console.log('\n✅ SUCESSO! Cobrança sincronizada e deve aparecer na lista.');
    
    // 4. Verificar se aparece na API
    console.log('\n4️⃣ Testando API de listagem...');
    try {
      const response = await fetch(`http://localhost:3000/api/payments/company/${COMPANY_ID}`);
      if (response.ok) {
        const apiData = await response.json();
        const foundInAPI = apiData.data?.find(p => p.payment_id === PAYMENT_ID);
        
        if (foundInAPI) {
          console.log('✅ Cobrança encontrada na API!');
          console.log('  - Cliente:', foundInAPI.client_name);
          console.log('  - Valor:', foundInAPI.amount);
        } else {
          console.log('❌ Cobrança ainda não aparece na API');
          console.log('Total na API:', apiData.data?.length || 0);
        }
      } else {
        console.log('❌ Erro na API:', response.status);
      }
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
    }
  } else {
    console.log('❌ Falha na sincronização');
  }
  
  console.log('\n=== INVESTIGAÇÃO CONCLUÍDA ===');
};

// Executar investigação
investigatePayment().catch(console.error);