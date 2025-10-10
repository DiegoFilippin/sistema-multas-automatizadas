import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';
const supabase = createClient(supabaseUrl, supabaseKey);

const COMPANY_ID = 'c1f4c95f-1f16-4680-b568-aefc43390564';
const TARGET_PAYMENT_ID = 'pay_680tm2gi0epfnrgj';

// Função para listar todas as cobranças do Asaas
const listAllAsaasPayments = async () => {
  try {
    console.log('\n🔍 === LISTANDO TODAS AS COBRANÇAS DO ASAAS ===');
    
    // Buscar configuração do Asaas da empresa Diego
    const { data: asaasConfig, error: configError } = await supabase
      .from('asaas_subaccounts')
      .select('api_key, wallet_id, asaas_account_id')
      .eq('company_id', COMPANY_ID)
      .single();
    
    if (configError || !asaasConfig?.api_key) {
      console.error('❌ Configuração do Asaas não encontrada:', configError);
      return [];
    }
    
    console.log('✅ Configuração encontrada:');
    console.log('  - API Key:', asaasConfig.api_key.substring(0, 20) + '...');
    console.log('  - Wallet ID:', asaasConfig.wallet_id);
    console.log('  - Account ID:', asaasConfig.asaas_account_id);
    
    // Listar cobranças do Asaas (últimas 100)
    const response = await fetch('https://sandbox.asaas.com/api/v3/payments?limit=100&offset=0', {
      headers: {
        'access_token': asaasConfig.api_key,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Total de cobranças encontradas:', result.totalCount);
      console.log('📋 Cobranças na página atual:', result.data?.length || 0);
      
      if (result.data && result.data.length > 0) {
        console.log('\n📊 === DETALHES DAS COBRANÇAS ===');
        
        result.data.forEach((payment, index) => {
          console.log(`\n${index + 1}. Cobrança:`);
          console.log('  - ID:', payment.id);
          console.log('  - Valor:', payment.value);
          console.log('  - Status:', payment.status);
          console.log('  - Cliente:', payment.customer?.name || 'N/A');
          console.log('  - Criada em:', payment.dateCreated);
          console.log('  - Descrição:', payment.description || 'N/A');
          
          // Verificar se é a cobrança que estamos procurando
          if (payment.id === TARGET_PAYMENT_ID) {
            console.log('  🎯 *** ESTA É A COBRANÇA QUE ESTAMOS PROCURANDO! ***');
          }
          
          // Verificar cobranças similares (mesmo valor ou descrição)
          if (payment.description && payment.description.toLowerCase().includes('diego')) {
            console.log('  🔍 *** COBRANÇA RELACIONADA A DIEGO ***');
          }
        });
        
        // Procurar especificamente pela cobrança target
        const targetPayment = result.data.find(p => p.id === TARGET_PAYMENT_ID);
        if (targetPayment) {
          console.log('\n🎯 === COBRANÇA ENCONTRADA ===');
          console.log('A cobrança', TARGET_PAYMENT_ID, 'foi encontrada no Asaas!');
          return targetPayment;
        } else {
          console.log('\n❌ === COBRANÇA NÃO ENCONTRADA ===');
          console.log('A cobrança', TARGET_PAYMENT_ID, 'NÃO foi encontrada na lista atual.');
          console.log('Isso pode significar:');
          console.log('1. A cobrança foi criada em uma conta Asaas diferente');
          console.log('2. A cobrança foi criada há mais tempo (fora das últimas 100)');
          console.log('3. O ID da cobrança está incorreto');
          console.log('4. A cobrança foi deletada do Asaas');
        }
      } else {
        console.log('\n📭 Nenhuma cobrança encontrada no Asaas para esta conta.');
      }
      
      return result.data || [];
    } else {
      const errorText = await response.text();
      console.error('❌ Erro ao listar cobranças:', response.status, errorText);
      return [];
    }
  } catch (error) {
    console.error('💥 Erro ao listar cobranças do Asaas:', error.message);
    return [];
  }
};

// Função para buscar cobranças por filtros específicos
const searchPaymentsByFilters = async () => {
  try {
    console.log('\n🔍 === BUSCANDO COBRANÇAS POR FILTROS ===');
    
    // Buscar configuração do Asaas
    const { data: asaasConfig } = await supabase
      .from('asaas_subaccounts')
      .select('api_key')
      .eq('company_id', COMPANY_ID)
      .single();
    
    if (!asaasConfig?.api_key) {
      console.error('❌ API Key não encontrada');
      return;
    }
    
    // Buscar cobranças dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFilter = thirtyDaysAgo.toISOString().split('T')[0];
    
    console.log('📅 Buscando cobranças desde:', dateFilter);
    
    const response = await fetch(`https://sandbox.asaas.com/api/v3/payments?limit=100&dateCreated[ge]=${dateFilter}`, {
      headers: {
        'access_token': asaasConfig.api_key,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Cobranças dos últimos 30 dias:', result.totalCount);
      
      // Procurar por cobranças relacionadas a Diego
      const diegoPayments = result.data?.filter(p => 
        p.customer?.name?.toLowerCase().includes('diego') ||
        p.description?.toLowerCase().includes('diego')
      ) || [];
      
      console.log('🔍 Cobranças relacionadas a Diego:', diegoPayments.length);
      
      diegoPayments.forEach((payment, index) => {
        console.log(`\n${index + 1}. Cobrança Diego:`);
        console.log('  - ID:', payment.id);
        console.log('  - Valor:', payment.value);
        console.log('  - Status:', payment.status);
        console.log('  - Cliente:', payment.customer?.name);
        console.log('  - Descrição:', payment.description);
        console.log('  - Criada em:', payment.dateCreated);
      });
    }
  } catch (error) {
    console.error('💥 Erro na busca por filtros:', error.message);
  }
};

// Função principal
const investigateAsaasPayments = async () => {
  console.log('🚀 === INVESTIGAÇÃO COMPLETA DO ASAAS ===');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('🎯 Procurando por:', TARGET_PAYMENT_ID);
  
  // 1. Listar todas as cobranças
  const allPayments = await listAllAsaasPayments();
  
  // 2. Buscar por filtros específicos
  await searchPaymentsByFilters();
  
  console.log('\n✅ === INVESTIGAÇÃO CONCLUÍDA ===');
  console.log('Total de cobranças analisadas:', allPayments.length);
};

// Executar investigação
investigateAsaasPayments().catch(console.error);