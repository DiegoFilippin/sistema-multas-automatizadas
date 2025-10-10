import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const debugSpecificPayment = async () => {
  console.log('=== INVESTIGAÇÃO DETALHADA: pay_7gefqqr64er5wbjc ===');
  console.log('Timestamp:', new Date().toISOString());
  
  const targetPaymentId = 'pay_7gefqqr64er5wbjc';
  const diegoCompanyId = 'c1f4c95f-1f16-4680-b568-aefc43390564';
  
  console.log('🎯 Procurando por:', targetPaymentId);
  console.log('👤 Company ID do Diego:', diegoCompanyId);
  
  // 1. Buscar em todas as tabelas com diferentes estratégias
  console.log('\n--- BUSCA ABRANGENTE EM TODAS AS TABELAS ---');
  
  const tables = [
    { name: 'payments', idFields: ['id', 'payment_id', 'asaas_payment_id'] },
    { name: 'service_orders', idFields: ['id', 'payment_id', 'asaas_payment_id', 'external_id'] },
    { name: 'asaas_payments', idFields: ['id', 'payment_id', 'asaas_id'] },
    { name: 'transactions', idFields: ['id', 'payment_id', 'external_id'] }
  ];
  
  let foundPayment = null;
  let foundTable = null;
  let foundField = null;
  
  for (const table of tables) {
    console.log(`\n🔍 Buscando em ${table.name}...`);
    
    // Primeiro, verificar se a tabela existe
    try {
      const { data: testData, error: testError } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);
      
      if (testError) {
        console.log(`⚠️  Tabela ${table.name} não acessível:`, testError.message);
        continue;
      }
      
      console.log(`✅ Tabela ${table.name} acessível`);
      
      // Buscar por diferentes campos de ID
      for (const field of table.idFields) {
        try {
          const { data, error } = await supabase
            .from(table.name)
            .select('*')
            .eq(field, targetPaymentId);
          
          if (!error && data && data.length > 0) {
            console.log(`🎉 ENCONTRADO em ${table.name}.${field}!`);
            foundPayment = data[0];
            foundTable = table.name;
            foundField = field;
            console.log('📄 Dados completos:');
            console.log(JSON.stringify(data[0], null, 2));
            break;
          }
        } catch (err) {
          // Campo não existe, continuar
        }
      }
      
      if (foundPayment) break;
      
      // Se não encontrou, mostrar alguns registros recentes para comparação
      const { data: recentData } = await supabase
        .from(table.name)
        .select('*')
        .eq('company_id', diegoCompanyId)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (recentData && recentData.length > 0) {
        console.log(`📋 Últimos 3 registros em ${table.name}:`);
        recentData.forEach((item, index) => {
          const possibleIds = table.idFields.map(f => item[f]).filter(Boolean);
          const mainId = possibleIds[0] || 'N/A';
          const amount = item.amount || item.value || 'N/A';
          const client = item.client_name || item.customer_name || 'N/A';
          console.log(`  ${index + 1}. ${mainId} | R$${amount} | ${client}`);
        });
      }
      
    } catch (err) {
      console.log(`💥 Erro ao acessar ${table.name}:`, err.message);
    }
  }
  
  // 2. Buscar por padrões similares
  if (!foundPayment) {
    console.log('\n--- BUSCA POR PADRÕES SIMILARES ---');
    console.log('🔍 Procurando IDs que começam com "pay_"...');
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select('*')
          .eq('company_id', diegoCompanyId)
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          const payIds = data.filter(item => {
            return table.idFields.some(field => {
              const value = item[field];
              return value && typeof value === 'string' && value.startsWith('pay_');
            });
          });
          
          if (payIds.length > 0) {
            console.log(`\n📋 IDs com padrão "pay_" em ${table.name}:`);
            payIds.forEach((item, index) => {
              const payId = table.idFields.find(f => item[f] && item[f].startsWith('pay_'));
              const id = item[payId];
              const amount = item.amount || item.value || 'N/A';
              const date = new Date(item.created_at).toLocaleString('pt-BR');
              console.log(`  ${index + 1}. ${id} | R$${amount} | ${date}`);
            });
          }
        }
      } catch (err) {
        // Ignorar erros
      }
    }
  }
  
  // 3. Testar API do frontend
  console.log('\n--- TESTANDO API DO FRONTEND ---');
  
  try {
    const apiUrl = `http://localhost:5173/api/payments/company/${diegoCompanyId}`;
    console.log('🔗 URL:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error('❌ Erro na API:', response.status, response.statusText);
    } else {
      const apiData = await response.json();
      console.log('✅ API respondeu com sucesso');
      console.log('📊 Total de cobranças na API:', apiData?.length || 0);
      
      // Procurar nossa cobrança específica
      const targetInAPI = apiData?.find(p => 
        p.payment_id === targetPaymentId ||
        p.id === targetPaymentId ||
        p.internal_id === targetPaymentId
      );
      
      if (targetInAPI) {
        console.log('🎉 COBRANÇA ENCONTRADA NA API!');
        console.log(JSON.stringify(targetInAPI, null, 2));
      } else {
        console.log('❌ Cobrança não encontrada na API');
        
        // Mostrar IDs que começam com "pay_"
        const payIds = apiData?.filter(p => 
          (p.payment_id && p.payment_id.startsWith('pay_')) ||
          (p.id && p.id.startsWith('pay_'))
        ) || [];
        
        if (payIds.length > 0) {
          console.log('\n📋 IDs "pay_" encontrados na API:');
          payIds.forEach((item, index) => {
            const id = item.payment_id || item.id;
            const amount = item.amount;
            const client = item.client_name || item.customer_name;
            const date = new Date(item.created_at).toLocaleString('pt-BR');
            console.log(`  ${index + 1}. ${id} | R$${amount} | ${client} | ${date}`);
          });
        } else {
          console.log('📭 Nenhum ID com padrão "pay_" encontrado na API');
        }
      }
    }
  } catch (apiError) {
    console.error('💥 Erro ao testar API:', apiError.message);
  }
  
  // 4. Verificar logs recentes de criação
  console.log('\n--- ANÁLISE DE CRIAÇÃO RECENTE ---');
  
  try {
    // Buscar cobranças criadas nas últimas 24 horas
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table.name)
          .select('*')
          .eq('company_id', diegoCompanyId)
          .gte('created_at', oneDayAgo)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          console.log(`\n📅 Cobranças criadas nas últimas 24h em ${table.name}:`);
          data.forEach((item, index) => {
            const ids = table.idFields.map(f => item[f]).filter(Boolean);
            const mainId = ids[0] || 'N/A';
            const amount = item.amount || item.value || 'N/A';
            const date = new Date(item.created_at).toLocaleString('pt-BR');
            const client = item.client_name || item.customer_name || 'N/A';
            console.log(`  ${index + 1}. ${mainId} | R$${amount} | ${client} | ${date}`);
          });
        }
      } catch (err) {
        // Ignorar erros
      }
    }
  } catch (err) {
    console.log('⚠️  Erro na análise de criação recente:', err.message);
  }
  
  // 5. Resumo final
  console.log('\n=== RESUMO FINAL ===');
  
  if (foundPayment) {
    console.log('✅ COBRANÇA ENCONTRADA!');
    console.log('📍 Localização:', `${foundTable}.${foundField}`);
    console.log('💰 Valor:', foundPayment.amount || foundPayment.value);
    console.log('👤 Cliente:', foundPayment.client_name || foundPayment.customer_name || 'N/A');
    console.log('🏢 Company ID:', foundPayment.company_id);
    console.log('📅 Criada em:', new Date(foundPayment.created_at).toLocaleString('pt-BR'));
    
    if (foundPayment.company_id === diegoCompanyId) {
      console.log('✅ Cobrança pertence ao Diego');
      console.log('🤔 Por que não aparece na lista? Possíveis causas:');
      console.log('   - Problema de cache no frontend');
      console.log('   - Filtros na API');
      console.log('   - Status da cobrança');
    } else {
      console.log('❌ Cobrança NÃO pertence ao Diego');
      console.log('🔍 Company ID da cobrança:', foundPayment.company_id);
      console.log('🔍 Company ID do Diego:', diegoCompanyId);
    }
  } else {
    console.log('❌ COBRANÇA NÃO ENCONTRADA NO BANCO DE DADOS');
    console.log('🔍 Possíveis explicações:');
    console.log('   1. A cobrança nunca foi criada (erro no processo)');
    console.log('   2. O payment_id está incorreto');
    console.log('   3. A cobrança foi deletada');
    console.log('   4. Está em uma tabela não verificada');
    console.log('   5. Problema de sincronização com Asaas');
    
    console.log('\n💡 Recomendações:');
    console.log('   - Verificar logs do servidor durante a criação');
    console.log('   - Confirmar o payment_id correto');
    console.log('   - Testar criação de nova cobrança com logs');
    console.log('   - Verificar se o processo de criação está funcionando');
  }
};

// Executar investigação
debugSpecificPayment()
  .then(() => {
    console.log('\n🏁 Investigação detalhada concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });