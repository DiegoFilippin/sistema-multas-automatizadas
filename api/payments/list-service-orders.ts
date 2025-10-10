import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função para debug detalhado
function debugLog(message: string, data?: any) {
  console.log(`🔍 [LIST-SERVICE-ORDERS] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Configuração do Supabase com fallbacks e validação robusta
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

debugLog('Verificando variáveis de ambiente:', {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
  VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
  finalUrl: supabaseUrl?.substring(0, 30) + '...',
  finalKey: supabaseServiceKey?.substring(0, 20) + '...'
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRO CRÍTICO: Variáveis do Supabase não configuradas!');
  console.error('URL disponível:', !!supabaseUrl);
  console.error('KEY disponível:', !!supabaseServiceKey);
}

let supabase: any;
try {
  supabase = createClient(supabaseUrl!, supabaseServiceKey!);
  debugLog('✅ Cliente Supabase criado com sucesso');
} catch (error: any) {
  console.error('❌ ERRO ao criar cliente Supabase:', error.message);
}

export async function GET(request: NextRequest) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    debugLog('🚀 Iniciando function GET');
    
    // Validar se o cliente Supabase foi criado
    if (!supabase) {
      debugLog('❌ Cliente Supabase não disponível');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Configuração do Supabase inválida',
          details: 'Cliente Supabase não foi inicializado corretamente'
        },
        { status: 500, headers: corsHeaders }
      );
    }

    debugLog('✅ Cliente Supabase disponível');
    
    // Extrair parâmetros da URL
    let searchParams;
    try {
      const url = new URL(request.url);
      searchParams = url.searchParams;
      debugLog('✅ URL parseada com sucesso', { url: request.url });
    } catch (urlError: any) {
      debugLog('❌ Erro ao parsear URL', { error: urlError.message, url: request.url });
      return NextResponse.json(
        { success: false, error: 'URL inválida', details: urlError.message },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const companyId = searchParams.get('company_id');
    const all = searchParams.get('all');
    
    debugLog('📊 Parâmetros extraídos:', { companyId, all });

    // Teste simples: buscar apenas service_orders sem joins complexos
    debugLog('🔍 Iniciando busca na tabela service_orders');
    
    let serviceOrders = [];
    let serviceOrdersError = null;
    
    try {
      // Query simplificada sem joins para evitar erros
      let query = supabase
        .from('service_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10); // Limite baixo para teste
      
      // Filtrar por empresa se especificado
      if (companyId && companyId !== 'all') {
        query = query.eq('company_id', companyId);
        debugLog('🎯 Filtrando por company_id:', companyId);
      }
      
      debugLog('📤 Executando query no Supabase...');
      const result = await query;
      
      serviceOrders = result.data || [];
      serviceOrdersError = result.error;
      
      debugLog('📥 Resultado da query:', {
        success: !serviceOrdersError,
        count: serviceOrders.length,
        error: serviceOrdersError?.message
      });
      
    } catch (queryError: any) {
      debugLog('❌ Erro na execução da query:', queryError.message);
      serviceOrdersError = queryError;
    }
    
    if (serviceOrdersError) {
      debugLog('❌ Erro detalhado do Supabase:', serviceOrdersError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao buscar dados do Supabase',
          details: serviceOrdersError.message || 'Erro desconhecido'
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // Simplificado: apenas service_orders para debug
    debugLog('✅ Query executada com sucesso, processando dados...');
    
    // Formatação simplificada dos dados
    const formattedPayments = serviceOrders.map(order => ({
      id: order.id,
      payment_id: order.id,
      client_name: order.client_name || order.customer_name || 'Cliente',
      customer_name: order.client_name || order.customer_name || 'Cliente',
      company_id: order.company_id,
      amount: order.amount,
      status: order.status,
      created_at: order.created_at,
      description: order.description || 'Recurso de Multa',
      payment_method: order.billing_type || 'PIX',
      pix_qr_code: order.qr_code_image || order.qr_code,
      source: 'service_order'
    }));

    const totalFound = formattedPayments.length;
    
    debugLog('✅ Dados processados com sucesso:', {
      total: totalFound,
      sample: formattedPayments[0] || 'Nenhum registro'
    });

    return NextResponse.json({
      success: true,
      payments: formattedPayments,
      total: totalFound,
      pagination: {
        page: 1,
        limit: 10,
        total: totalFound,
        hasMore: false
      }
    }, {
      status: 200,
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error('❌ Erro ao listar cobranças:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor',
        details: error.message 
      },
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}