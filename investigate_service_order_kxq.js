import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateServiceOrder() {
  console.log('🔍 === INVESTIGANDO SERVICE ORDERS DA ANA PAULA ===\n');
  
  try {
    // 1. Primeiro, buscar a Ana Paula
    console.log('1️⃣ BUSCANDO CLIENTE ANA PAULA:');
    const { data: anaPaula, error: anaPaulaError } = await supabase
      .from('clients')
      .select('*')
      .ilike('nome', '%ANA PAULA%CARVALHO%ZORZZI%')
      .single();
    
    if (anaPaulaError) {
      console.error('❌ Erro ao buscar Ana Paula:', anaPaulaError);
      return;
    }
    
    console.log('✅ Ana Paula encontrada:');
    console.log('📋 ID:', anaPaula.id);
    console.log('👤 Nome:', anaPaula.nome);
    console.log('🏢 Company ID:', anaPaula.company_id);
    
    // 2. Buscar todos os service_orders da Ana Paula
    console.log('\n2️⃣ BUSCANDO TODOS OS SERVICE ORDERS DA ANA PAULA:');
    const { data: serviceOrders, error: serviceOrdersError } = await supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(nome),
        company:companies(nome),
        service:services(name),
        multa:multas(numero_auto, placa_veiculo, descricao_infracao)
      `)
      .eq('client_id', anaPaula.id)
      .order('created_at', { ascending: false });
    
    if (serviceOrdersError) {
      console.error('❌ Erro ao buscar service_orders:', serviceOrdersError);
      return;
    }
    
    console.log(`✅ Encontrados ${serviceOrders?.length || 0} service orders:`);
    
    let targetServiceOrder = null;
    serviceOrders?.forEach((order, index) => {
      console.log(`\n  ${index + 1}. SERVICE ORDER:`);
      console.log(`     ID: ${order.id}`);
      console.log(`     External Ref: ${order.external_reference}`);
      console.log(`     Status: ${order.status}`);
      console.log(`     Valor: R$ ${order.amount}`);
      console.log(`     Tipo Multa: ${order.multa_type}`);
      console.log(`     Multa ID: ${order.multa_id}`);
      console.log(`     Criado: ${order.created_at}`);
      
      // Verificar se este é o service order que procuramos
      if (order.external_reference === 'pay_kxq6p35gavzescuz' || order.id.includes('kxq')) {
        targetServiceOrder = order;
        console.log('     🎯 ESTE É O SERVICE ORDER PROCURADO!');
      }
      
      if (order.multa) {
        console.log(`     Multa: ${order.multa.numero_auto} - ${order.multa.placa_veiculo}`);
      }
    });
    
    if (!targetServiceOrder && serviceOrders?.length > 0) {
      // Se não encontrou o específico, usar o primeiro como exemplo
      targetServiceOrder = serviceOrders[0];
      console.log('\n⚠️ Service order específico não encontrado, usando o primeiro como exemplo');
    }
    
    if (!targetServiceOrder) {
      console.log('\n❌ Nenhum service order encontrado para Ana Paula');
      return;
    }
    
    // 3. Analisar o service order encontrado
    console.log('\n3️⃣ ANÁLISE DO SERVICE ORDER:');
    console.log('📋 ID:', targetServiceOrder.id);
    console.log('👤 Cliente:', targetServiceOrder.client?.nome);
    console.log('🏢 Empresa:', targetServiceOrder.company?.nome);
    console.log('🔧 Serviço:', targetServiceOrder.service?.name);
    console.log('💰 Valor:', targetServiceOrder.amount);
    console.log('📊 Status:', targetServiceOrder.status);
    console.log('🆔 Multa ID:', targetServiceOrder.multa_id);
    console.log('📝 Tipo de Multa:', targetServiceOrder.multa_type);
    console.log('📅 Criado em:', targetServiceOrder.created_at);
    console.log('🔗 External Ref:', targetServiceOrder.external_reference);
    
    // 4. Verificar se existe multa associada
    console.log('\n4️⃣ VERIFICANDO MULTA ASSOCIADA:');
    if (targetServiceOrder.multa_id) {
      const { data: multa, error: multaError } = await supabase
        .from('multas')
        .select('*')
        .eq('id', targetServiceOrder.multa_id)
        .single();
      
      if (multaError) {
        console.error('❌ Erro ao buscar multa:', multaError);
      } else if (multa) {
        console.log('✅ Multa encontrada:');
        console.log('📋 Número Auto:', multa.numero_auto);
        console.log('🚗 Placa:', multa.placa_veiculo);
        console.log('📍 Local:', multa.local_infracao);
        console.log('⚖️ Infração:', multa.descricao_infracao);
        console.log('💰 Valor:', multa.valor_final);
      } else {
        console.log('⚠️ Multa não encontrada');
      }
    } else {
      console.log('⚠️ Service order não tem multa_id associada');
    }
    
    // 5. Buscar todas as multas da Ana Paula
    console.log('\n5️⃣ BUSCANDO TODAS AS MULTAS DA ANA PAULA:');
    const { data: todasMultas, error: todasMultasError } = await supabase
      .from('multas')
      .select('*')
      .eq('client_id', anaPaula.id);
    
    if (todasMultasError) {
      console.error('❌ Erro ao buscar multas:', todasMultasError);
    } else {
      console.log(`✅ Encontradas ${todasMultas?.length || 0} multas para Ana Paula:`);
      todasMultas?.forEach((multa, index) => {
        console.log(`  ${index + 1}. ${multa.numero_auto} - ${multa.placa_veiculo} - ${multa.descricao_infracao}`);
      });
    }
    
    // 6. Verificar estrutura necessária para integração
    console.log('\n6️⃣ ANÁLISE PARA INTEGRAÇÃO:');
    console.log('📊 Service Order Status:', targetServiceOrder.status);
    console.log('🔗 Tem multa_id?', targetServiceOrder.multa_id ? 'Sim' : 'Não');
    console.log('📝 Notas/Dados extras:', targetServiceOrder.notes ? 'Sim' : 'Não');
    
    if (targetServiceOrder.notes) {
      try {
        const notesData = JSON.parse(targetServiceOrder.notes);
        console.log('📋 Dados das notas:', Object.keys(notesData));
      } catch (e) {
        console.log('⚠️ Erro ao parsear notas');
      }
    }
    
    console.log('\n🎯 === CONCLUSÕES ===');
    console.log('Para integrar na página ClienteDetalhes.tsx:');
    console.log('1. Buscar service_orders do cliente com status != "cancelled"');
    console.log('2. Para cada service_order, verificar se tem multa_id');
    console.log('3. Se não tiver multa_id, usar dados do service_order diretamente');
    console.log('4. Link para detalhes: /teste-recurso-ia?serviceOrderId={id}&nome={cliente}');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar investigação
investigateServiceOrder();