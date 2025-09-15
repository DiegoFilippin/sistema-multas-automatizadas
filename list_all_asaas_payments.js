import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COMPANY_ID = 'c1f4c95f-1f16-4680-b568-aefc43390564'; // Diego's company

const listAllAsaasPayments = async () => {
  try {
    console.log('=== LISTANDO TODAS AS COBRANÇAS DO ASAAS ===\n');
    
    // Buscar configuração do Asaas
    const { data: asaasAccount, error: asaasError } = await supabase
      .from('asaas_subaccounts')
      .select('api_key, wallet_id, status')
      .eq('company_id', COMPANY_ID)
      .eq('status', 'active')
      .single();
    
    if (asaasError || !asaasAccount?.api_key) {
      console.error('❌ API Key do Asaas não encontrada:', asaasError);
      return;
    }
    
    console.log('✅ API Key encontrada:', asaasAccount.api_key.substring(0, 20) + '...');
    console.log('✅ Wallet ID:', asaasAccount.wallet_id);
    console.log('');
    
    // Buscar todas as cobranças no Asaas
    const response = await fetch('https://sandbox.asaas.com/api/v3/payments?limit=50&offset=0', {
      headers: {
        'access_token': asaasAccount.api_key,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao buscar cobranças:', response.status, errorText);
      return;
    }
    
    const paymentsData = await response.json();
    console.log('📊 Total de cobranças encontradas:', paymentsData.totalCount);
    console.log('📋 Cobranças na página atual:', paymentsData.data?.length || 0);
    console.log('');
    
    if (paymentsData.data && paymentsData.data.length > 0) {
      console.log('🔍 LISTA DE COBRANÇAS:');
      console.log('=' .repeat(80));
      
      paymentsData.data.forEach((payment, index) => {
        console.log(`${index + 1}. ID: ${payment.id}`);
        console.log(`   Cliente: ${payment.customer?.name || 'N/A'}`);
        console.log(`   Valor: R$ ${payment.value}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Descrição: ${payment.description || 'N/A'}`);
        console.log(`   Data: ${payment.dateCreated}`);
        console.log(`   PIX: ${payment.pixTransaction ? 'Sim' : 'Não'}`);
        console.log('');
      });
      
      // Procurar pela cobrança específica
      const targetPayment = paymentsData.data.find(p => p.id === 'pay_680tm2gi0epfnrgj');
      
      if (targetPayment) {
        console.log('✅ COBRANÇA pay_680tm2gi0epfnrgj ENCONTRADA!');
        console.log('Dados completos:', JSON.stringify(targetPayment, null, 2));
      } else {
        console.log('❌ Cobrança pay_680tm2gi0epfnrgj NÃO encontrada na lista');
        console.log('');
        console.log('🔍 IDs disponíveis:');
        paymentsData.data.forEach(p => console.log(`   - ${p.id}`));
      }
    } else {
      console.log('❌ Nenhuma cobrança encontrada no Asaas');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

listAllAsaasPayments().catch(console.error);