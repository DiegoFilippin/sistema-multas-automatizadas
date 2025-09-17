import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken, authorizeRoles } from '../../src/middleware/auth.js';
import { asaasService, AsaasPaymentResponse } from '../services/asaasService.js';

const router = Router();

// Função para buscar cobranças diretamente do Asaas
async function getAsaasPayments(companyId: string): Promise<any[]> {
  try {
    console.log('🔍 Buscando cobranças no Asaas para company:', companyId);
    
    // Buscar configuração da empresa
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('asaas_api_key, asaas_wallet_id, nome')
      .eq('id', companyId)
      .single();
    
    if (companyError || !company?.asaas_api_key) {
      console.log('❌ Empresa sem configuração Asaas válida');
      return [];
    }
    
    console.log('✅ Empresa encontrada:', company.nome);
    
    // Buscar cobranças no Asaas (últimos 100 registros)
    const asaasPayments = await asaasService.getPayments({
      limit: 100,
      offset: 0
    });
    
    if (!asaasPayments?.data) {
      console.log('❌ Nenhuma cobrança encontrada no Asaas');
      return [];
    }
    
    console.log(`✅ Encontradas ${asaasPayments.data.length} cobranças no Asaas`);
    
    // Mapear dados do Asaas para formato local
    const mappedPayments = asaasPayments.data.map(payment => ({
      payment_id: payment.id,
      client_name: extractClientName(payment.description) || 'Cliente não identificado',
      customer_name: extractClientName(payment.description) || 'Cliente não identificado',
      amount: payment.value,
      status: mapAsaasToSystemStatus(payment.status),
      multa_type: extractMultaType(payment.description),
      created_at: payment.dateCreated,
      paid_at: payment.paymentDate,
      qr_code: payment.pixQrCodeId,
      pix_copy_paste: payment.pixCopyAndPaste,
      payment_url: payment.invoiceUrl,
      company_id: companyId,
      source: 'asaas_api',
      description: payment.description,
      due_date: payment.dueDate,
      asaas_customer_id: payment.customer
    }));
    
    console.log('✅ Cobranças mapeadas do Asaas:', mappedPayments.length);
    return mappedPayments;
    
  } catch (error) {
    console.error('❌ Erro ao buscar no Asaas:', error);
    return [];
  }
}

// Função para sincronizar cobranças do Asaas para o banco local
async function syncPayments(asaasPayments: any[], companyId: string): Promise<any[]> {
  const syncedPayments = [];
  
  console.log(`🔄 Iniciando sincronização de ${asaasPayments.length} cobranças`);
  
  for (const payment of asaasPayments) {
    try {
      // Verificar se já existe no banco (em qualquer tabela)
      const existsInServiceOrders = await supabase
        .from('service_orders')
        .select('id')
        .eq('payment_id', payment.payment_id)
        .single();
      
      const existsInPayments = await supabase
        .from('payments')
        .select('id')
        .eq('asaas_payment_id', payment.payment_id)
        .single();
      
      const existsInAsaasPayments = await supabase
        .from('asaas_payments')
        .select('id')
        .eq('id', payment.payment_id)
        .single();
      
      if (!existsInServiceOrders.data && !existsInPayments.data && !existsInAsaasPayments.data) {
        // Salvar nova cobrança na tabela service_orders (para cobranças de multa)
        const { data: saved, error } = await supabase
          .from('service_orders')
          .insert({
            payment_id: payment.payment_id,
            company_id: companyId,
            client_name: payment.client_name,
            customer_name: payment.customer_name,
            amount: payment.amount,
            status: payment.status === 'confirmed' ? 'paid' : 'pending_payment',
            multa_type: payment.multa_type,
            description: payment.description,
            qr_code: payment.qr_code,
            pix_copy_paste: payment.pix_copy_paste,
            payment_url: payment.payment_url,
            created_at: payment.created_at,
            paid_at: payment.paid_at,
            expires_at: payment.due_date,
            synced_from_asaas: true,
            asaas_customer_id: payment.asaas_customer_id
          })
          .select()
          .single();
        
        if (!error && saved) {
          console.log('✅ Cobrança sincronizada:', payment.payment_id);
          syncedPayments.push({
            ...saved,
            source: 'service_order',
            client_name: saved.client_name || saved.customer_name
          });
        } else {
          console.error('❌ Erro ao sincronizar:', payment.payment_id, error);
        }
      } else {
        console.log('⏭️ Cobrança já existe:', payment.payment_id);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar/sincronizar:', payment.payment_id, error);
    }
  }
  
  console.log(`✅ Sincronização concluída: ${syncedPayments.length} novas cobranças`);
  return syncedPayments;
}

// Função para extrair nome do cliente da descrição
function extractClientName(description: string): string | null {
  if (!description) return null;
  
  // Procurar padrões como "DIEGO DA SILVA FILIPPIN" ou "Cliente: Nome"
  const patterns = [
    /Cliente:\s*([^-]+)/i,
    /Nome:\s*([^-]+)/i,
    /^([A-Z\s]+)\s*-/,
    /Recurso de Multa\s*-\s*([^-]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

// Função para extrair tipo de multa da descrição
function extractMultaType(description: string): string {
  if (!description) return 'Multa Leve';
  
  const desc = description.toUpperCase();
  if (desc.includes('GRAVÍSSIMA')) return 'Multa Gravíssima';
  if (desc.includes('GRAVE')) return 'Multa Grave';
  if (desc.includes('MÉDIA')) return 'Multa Média';
  if (desc.includes('LEVE')) return 'Multa Leve';
  
  return 'Multa Leve';
}

// Função para remover cobranças duplicadas
function removeDuplicates(payments: any[]): any[] {
  const seen = new Set();
  return payments.filter(payment => {
    const id = payment.payment_id || payment.id;
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

// GET /api/payments - Listar cobranças do usuário logado
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate, 
      clientName, 
      paymentId 
    } = req.query;
    
    console.log('\n🔍 === BUSCA DE COBRANÇAS DO USUÁRIO ===');
    console.log(`📊 Parâmetros recebidos:`);
    console.log(`  - User ID: ${req.user.id}`);
    console.log(`  - User Role: ${req.user.role}`);
    console.log(`  - Company ID: ${req.user.companyId}`);
    console.log(`  - Page: ${page}`);
    console.log(`  - Limit: ${limit}`);
    console.log(`  - Status filter: ${status || 'none'}`);
    console.log(`  - Client filter: ${clientName || 'none'}`);
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // Determinar company_id baseado no role do usuário
    let companyId = req.user.companyId;
    
    if (req.user.role === 'superadmin') {
      // Superadmin pode ver todas as cobranças ou filtrar por empresa
      companyId = req.query.companyId as string || null;
    }
    
    // 1. Buscar cobranças de créditos na tabela payments
    let paymentsQuery = supabase
      .from('payments')
      .select(`
        *,
        customer:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj)
      `)
      .order('created_at', { ascending: false });
    
    if (companyId) {
      paymentsQuery = paymentsQuery.eq('company_id', companyId);
    }
    
    const { data: payments, error: paymentsError } = await paymentsQuery;
    
    if (paymentsError) {
      console.error('Erro ao buscar payments:', paymentsError);
    }
    
    // 2. Buscar cobranças de multa na tabela service_orders
    let serviceOrdersQuery = supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj),
        service:services(id, name)
      `)
      .order('created_at', { ascending: false });
    
    if (companyId) {
      serviceOrdersQuery = serviceOrdersQuery.eq('company_id', companyId);
    }
    
    const { data: serviceOrders, error: serviceOrdersError } = await serviceOrdersQuery;
    
    if (serviceOrdersError) {
      console.error('Erro ao buscar service_orders:', serviceOrdersError);
    }
    
    // 3. Buscar cobranças do Asaas
    let asaasQuery = supabase
      .from('asaas_payments')
      .select(`
        *,
        client:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj)
      `)
      .order('created_at', { ascending: false });
    
    if (companyId) {
      asaasQuery = asaasQuery.eq('company_id', companyId);
    }
    
    const { data: asaasPayments, error: asaasError } = await asaasQuery;
    
    if (asaasError) {
      console.error('Erro ao buscar asaas_payments:', asaasError);
    }
    
    // 4. Combinar e formatar os dados
    let allPayments = [
      // Pagamentos de créditos
      ...(payments || []).map(payment => ({
        ...payment,
        source: 'credits',
        payment_id: payment.id,
        client_name: payment.customer?.nome || 'Cliente',
        customer_name: payment.customer?.nome || 'Cliente',
        company_name: payment.company?.nome || 'Empresa',
        amount: payment.amount,
        status: payment.status,
        created_at: payment.created_at,
        paid_at: payment.confirmed_at,
        due_date: payment.due_date,
        description: `Compra de ${payment.credit_amount || 0} créditos`,
        payment_method: payment.payment_method || 'PIX',
        asaas_payment_id: payment.asaas_payment_id,
        invoice_url: payment.invoice_url,
        pix_qr_code: payment.pix_qr_code,
        pix_copy_paste: payment.pix_copy_paste
      })),
      
      // Service Orders (recursos de multa)
      ...(serviceOrders || []).map(order => ({
        ...order,
        source: 'service_order',
        payment_id: order.asaas_payment_id || order.id,
        client_name: order.client?.nome || order.client_name || order.customer_name || 'Cliente',
        customer_name: order.client?.nome || order.client_name || order.customer_name || 'Cliente',
        company_name: order.company?.nome || 'Empresa',
        amount: order.amount,
        status: order.status,
        created_at: order.created_at,
        paid_at: order.paid_at,
        due_date: order.expires_at,
        description: order.description || `${order.service?.name || 'Recurso de Multa'} - ${order.client?.nome || 'Cliente'}`,
        payment_method: order.billing_type || 'PIX',
        asaas_payment_id: order.asaas_payment_id,
        invoice_url: order.invoice_url,
        pix_qr_code: order.qr_code_image || order.qr_code,
        pix_copy_paste: order.pix_payload || order.pix_copy_paste,
        multa_type: order.multa_type || 'Recurso de Multa'
      })),
      
      // Asaas Payments
      ...(asaasPayments || []).map(payment => ({
        ...payment,
        source: 'asaas',
        payment_id: payment.id,
        client_name: payment.client?.nome || 'Cliente',
        customer_name: payment.client?.nome || 'Cliente',
        company_name: payment.company?.nome || 'Empresa',
        amount: payment.amount,
        status: payment.status,
        created_at: payment.created_at,
        paid_at: payment.payment_date,
        due_date: payment.due_date,
        description: payment.description,
        payment_method: payment.payment_method || 'PIX',
        asaas_payment_id: payment.id,
        invoice_url: payment.invoice_url,
        pix_qr_code: payment.pix_qr_code,
        pix_copy_paste: payment.pix_copy_paste
      }))
    ];
    
    // 5. Aplicar filtros
    if (status) {
      allPayments = allPayments.filter(payment => payment.status === status);
    }
    
    if (clientName) {
      allPayments = allPayments.filter(payment => 
        payment.client_name?.toLowerCase().includes((clientName as string).toLowerCase())
      );
    }
    
    if (paymentId) {
      allPayments = allPayments.filter(payment => 
        payment.payment_id?.includes(paymentId as string) ||
        payment.asaas_payment_id?.includes(paymentId as string)
      );
    }
    
    if (startDate) {
      allPayments = allPayments.filter(payment => 
        new Date(payment.created_at) >= new Date(startDate as string)
      );
    }
    
    if (endDate) {
      allPayments = allPayments.filter(payment => 
        new Date(payment.created_at) <= new Date(endDate as string)
      );
    }
    
    // 6. Remover duplicatas
    allPayments = removeDuplicates(allPayments);
    
    // 7. Ordenar por data de criação
    allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // 8. Aplicar paginação
    const paginatedPayments = allPayments.slice(offset, offset + Number(limit));
    
    console.log(`✅ Total encontrado: ${allPayments.length} cobranças`);
    console.log(`📄 Retornando: ${paginatedPayments.length} cobranças (página ${page})`);
    
    return res.json({
      success: true,
      payments: paginatedPayments,
      total: allPayments.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: allPayments.length,
        totalPages: Math.ceil(allPayments.length / Number(limit))
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar cobranças:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/payments/client/:clientId - Cobranças de um cliente específico
router.get('/client/:clientId', authenticateToken, authorizeRoles(['dispatcher', 'master_company']), async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = supabase
      .from('payments')
      .select(`
        *,
        customer:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj)
      `)
      .eq('customer_id', clientId)
      .order('created_at', { ascending: false });
    
    // Filtros opcionais
    if (status) {
      query = query.eq('status', status);
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    // Paginação
    query = query.range(offset, offset + Number(limit) - 1);
    
    const { data: payments, error, count } = await query;
    
    if (error) {
      console.error('Erro ao buscar cobranças do cliente:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    // Buscar também cobranças do Asaas para este cliente
    const { data: asaasPayments, error: asaasError } = await supabase
      .from('asaas_payments')
      .select(`
        *,
        client:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    if (asaasError) {
      console.error('Erro ao buscar cobranças Asaas do cliente:', asaasError);
    }
    
    // Combinar e formatar os dados
    const allPayments = [
      ...(payments || []).map(payment => ({
        ...payment,
        source: 'credits',
        payment_id: payment.id,
        payment_date: payment.confirmed_at,
        due_date: payment.due_date,
        value: payment.amount,
        description: `Compra de ${payment.credit_amount} créditos`,
        method: payment.payment_method
      })),
      ...(asaasPayments || []).map(payment => ({
        ...payment,
        source: 'asaas',
        payment_id: payment.id,
        payment_date: payment.payment_date,
        due_date: payment.due_date,
        value: payment.amount,
        description: payment.description,
        method: payment.payment_method
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return res.json({
      payments: allPayments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar cobranças do cliente:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/payments/all - Todas cobranças da plataforma (apenas superadmin)
router.get('/all', authenticateToken, authorizeRoles(['superadmin']), async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate, 
      clientName, 
      paymentId,
      companyId 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = supabase
      .from('payments')
      .select(`
        *,
        customer:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj)
      `)
      .order('created_at', { ascending: false });
    
    // Filtros opcionais
    if (status) {
      query = query.eq('status', status);
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    if (paymentId) {
      query = query.or(`id.eq.${paymentId},asaas_payment_id.ilike.%${paymentId}%`);
    }
    
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    
    // Paginação
    query = query.range(offset, offset + Number(limit) - 1);
    
    const { data: payments, error, count } = await query;
    
    if (error) {
      console.error('Erro ao buscar todas as cobranças:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    // Buscar também cobranças do Asaas de todas as empresas
    let asaasQuery = supabase
      .from('asaas_payments')
      .select(`
        *,
        client:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj)
      `)
      .order('created_at', { ascending: false });
    
    if (status) {
      const asaasStatus = mapStatusToAsaas(status as string);
      if (asaasStatus) {
        asaasQuery = asaasQuery.eq('status', asaasStatus);
      }
    }
    
    if (companyId) {
      asaasQuery = asaasQuery.eq('company_id', companyId);
    }
    
    const { data: asaasPayments, error: asaasError } = await asaasQuery;
    
    if (asaasError) {
      console.error('Erro ao buscar cobranças Asaas:', asaasError);
    }
    
    // Combinar e formatar os dados
    let allPayments = [
      ...(payments || []).map(payment => ({
        ...payment,
        source: 'credits',
        payment_id: payment.id,
        payment_date: payment.confirmed_at,
        due_date: payment.due_date,
        value: payment.amount,
        description: `Compra de ${payment.credit_amount} créditos`,
        method: payment.payment_method,
        customer_name: payment.customer?.nome || 'Empresa',
        company_name: payment.company?.nome || 'Empresa'
      })),
      ...(asaasPayments || []).map(payment => ({
        ...payment,
        source: 'asaas',
        payment_id: payment.id,
        payment_date: payment.payment_date,
        due_date: payment.due_date,
        value: payment.amount,
        description: payment.description,
        method: payment.payment_method,
        customer_name: payment.client?.nome || 'Cliente',
        company_name: payment.company?.nome || 'Empresa'
      }))
    ];
    
    // Filtro por nome do cliente
    if (clientName) {
      allPayments = allPayments.filter(payment => 
        payment.customer_name?.toLowerCase().includes((clientName as string).toLowerCase())
      );
    }
    
    // Ordenar por data de criação
    allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Aplicar paginação manual para dados combinados
    const paginatedPayments = allPayments.slice(offset, offset + Number(limit));
    
    return res.json({
      payments: paginatedPayments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: allPayments.length,
        totalPages: Math.ceil(allPayments.length / Number(limit))
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar todas as cobranças:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/payments/company/:companyId - Todas cobranças da empresa (BUSCA HÍBRIDA)
router.get('/company/:companyId', authenticateToken, authorizeRoles(['dispatcher', 'master_company']), async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate, 
      clientName, 
      paymentId 
    } = req.query;
    
    console.log('\n🔍 === BUSCA HÍBRIDA DE COBRANÇAS ===');
    console.log(`📊 Parâmetros recebidos:`);
    console.log(`  - Company ID: ${companyId}`);
    console.log(`  - Page: ${page}`);
    console.log(`  - Limit: ${limit}`);
    console.log(`  - Status filter: ${status || 'none'}`);
    console.log(`  - Client filter: ${clientName || 'none'}`);
    console.log(`  - Timestamp: ${new Date().toISOString()}`);
    
    const offset = (Number(page) - 1) * Number(limit);
    
    // 1. Buscar cobranças de créditos na tabela payments
    let paymentsQuery = supabase
      .from('payments')
      .select(`
        *,
        customer:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    const { data: payments, error: paymentsError } = await paymentsQuery;
    
    if (paymentsError) {
      console.error('Erro ao buscar payments:', paymentsError);
    }
    
    // 2. Buscar cobranças de multa na tabela service_orders
    let serviceOrdersQuery = supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj),
        service:services(id, name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    const { data: serviceOrders, error: serviceOrdersError } = await serviceOrdersQuery;
    
    if (serviceOrdersError) {
      console.error('Erro ao buscar service_orders:', serviceOrdersError);
    }
    
    // 3. Buscar também cobranças do Asaas para esta empresa (legado)
    let asaasQuery = supabase
      .from('asaas_payments')
      .select(`
        *,
        client:clients(id, nome, cpf_cnpj, email),
        company:companies(id, nome, cnpj)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    const { data: asaasPayments, error: asaasError } = await asaasQuery;
    
    if (asaasError) {
      console.error('Erro ao buscar cobranças Asaas da empresa:', asaasError);
    }
    
    // 4. NOVA FUNCIONALIDADE: Buscar diretamente no Asaas
    const asaasApiPayments = await getAsaasPayments(companyId);
    
    // 5. NOVA FUNCIONALIDADE: Sincronizar cobranças do Asaas para o banco local
    const syncedPayments = await syncPayments(asaasApiPayments, companyId);
    
    console.log(`📊 Dados encontrados:`);
    console.log(`  - Payments (créditos): ${payments?.length || 0}`);
    console.log(`  - Service Orders (multas): ${serviceOrders?.length || 0}`);
    console.log(`  - Asaas Payments (legado): ${asaasPayments?.length || 0}`);
    console.log(`  - Asaas API (direto): ${asaasApiPayments?.length || 0}`);
    console.log(`  - Sincronizadas: ${syncedPayments?.length || 0}`);
    
    // 6. Combinar e formatar os dados (INCLUINDO DADOS SINCRONIZADOS)
    let allPayments = [
      // Cobranças de créditos - MAPEAMENTO COMPLETO
      ...(payments || []).map(payment => ({
        ...payment,
        source: 'credits',
        payment_id: payment.id,
        payment_date: payment.confirmed_at,
        due_date: payment.due_date,
        value: payment.amount,
        amount: payment.amount,
        description: `Compra de ${payment.credit_amount || 0} créditos`,
        method: payment.payment_method,
        customer_name: payment.customer?.nome || 'Empresa',
        client_name: payment.customer?.nome || 'Empresa',
        multa_type: 'Créditos',
        status: payment.status || 'pending',
        qr_code: payment.pix_qr_code,
        pix_qr_code: payment.pix_qr_code,
        pix_copy_paste: payment.pix_copy_paste,
        pix_code: payment.pix_copy_paste,
        payment_url: null,
        invoice_url: null,
        asaas_payment_id: payment.asaas_payment_id,
        payment_method: payment.payment_method
      })),
      
      // Cobranças de multa (service_orders) - INCLUINDO AS SINCRONIZADAS
      ...(serviceOrders || []).map(order => {
        // Extrair dados do campo notes se existir
        let webhookData = null;
        let processedData = null;
        
        if (order.notes) {
          try {
            const notesData = JSON.parse(order.notes);
            webhookData = notesData.webhook_data;
            processedData = notesData.processed_data;
          } catch (e) {
            console.warn('Erro ao parsear notes:', e);
          }
        }
        
        return {
          ...order,
          source: 'service_order',
          payment_id: order.payment_id || order.id,
          payment_date: order.paid_at,
          due_date: order.expires_at,
          value: order.amount,
          amount: order.amount,
          description: order.payment_description || processedData?.payment_description || order.description || `Recurso de Multa - ${order.multa_type?.toUpperCase()}`,
          method: 'PIX',
          // Melhor mapeamento do nome do cliente
          customer_name: order.client?.nome || order.client_name || order.customer_name || processedData?.customer_name || webhookData?.customer?.name || 'Cliente não identificado',
          client_name: order.client?.nome || order.client_name || order.customer_name || processedData?.customer_name || webhookData?.customer?.name || 'Cliente não identificado',
          multa_type: order.multa_type || 'Recurso de Multa',
          // Melhor mapeamento do status
          status: order.status === 'paid' ? 'confirmed' : 
                 (order.status === 'pending_payment' ? 'pending' : 
                 (processedData?.status || webhookData?.status || order.status || 'pending')),
          // Melhor mapeamento dos dados PIX - SEMPRE INCLUIR qr_code_image
          qr_code: order.qr_code_image || processedData?.qr_code_image || order.qr_code || webhookData?.qr_code_image,
          qr_code_image: order.qr_code_image, // SEMPRE incluir qr_code_image da service_orders
          pix_qr_code: order.qr_code_image || processedData?.qr_code_image || order.qr_code || webhookData?.qr_code_image,
          pix_copy_paste: order.pix_payload || processedData?.pix_payload || order.pix_copy_paste || webhookData?.pix_copy_paste,
          pix_code: order.pix_payload || processedData?.pix_payload || order.pix_copy_paste || webhookData?.pix_copy_paste,
          payment_url: order.invoice_url || processedData?.invoice_url || order.payment_url,
          invoice_url: order.invoice_url || processedData?.invoice_url || webhookData?.invoice_url,
          asaas_payment_id: order.asaas_payment_id || processedData?.asaas_payment_id || webhookData?.id,
          payment_method: 'PIX',
          billing_type: 'PIX',
          // Campos adicionais do webhook
          webhook_data: webhookData,
          processed_data: processedData
        };
      }),
      
      // Cobranças Asaas (legado) - MAPEAMENTO COMPLETO
      ...(asaasPayments || []).map(payment => ({
        ...payment,
        source: 'asaas',
        payment_id: payment.id,
        payment_date: payment.payment_date,
        due_date: payment.due_date,
        value: payment.amount,
        amount: payment.amount,
        description: payment.description,
        method: payment.payment_method,
        customer_name: payment.client?.nome || 'Cliente',
        client_name: payment.client?.nome || 'Cliente',
        multa_type: payment.resource_type || 'Recurso de Multa',
        status: payment.status || 'PENDING',
        qr_code: payment.pix_qr_code,
        pix_qr_code: payment.pix_qr_code,
        pix_copy_paste: payment.pix_copy_paste,
        pix_code: payment.pix_copy_paste,
        payment_url: payment.invoice_url,
        invoice_url: payment.invoice_url,
        asaas_payment_id: payment.asaas_payment_id || payment.id,
        payment_method: payment.payment_method
      })),
      
      // Cobranças diretas do Asaas API (não sincronizadas ainda) - MAPEAMENTO COMPLETO
      ...(asaasApiPayments || []).filter(apiPayment => 
        // Só incluir se não foi sincronizada (evitar duplicatas)
        !syncedPayments.some(synced => synced.payment_id === apiPayment.payment_id)
      ).map(payment => ({
        ...payment,
        source: 'asaas_api',
        payment_id: payment.payment_id,
        payment_date: payment.paid_at,
        due_date: payment.due_date,
        value: payment.amount,
        amount: payment.amount,
        description: payment.description,
        method: 'PIX',
        customer_name: payment.client_name,
        client_name: payment.client_name,
        multa_type: payment.multa_type,
        status: payment.status,
        qr_code: payment.qr_code,
        pix_qr_code: payment.qr_code,
        pix_copy_paste: payment.pix_copy_paste,
        pix_code: payment.pix_copy_paste,
        payment_url: payment.payment_url,
        invoice_url: payment.payment_url,
        asaas_payment_id: payment.payment_id,
        payment_method: 'PIX'
      }))
    ];
    
    // 7. Remover duplicatas
    allPayments = removeDuplicates(allPayments);
    
    // 8. Aplicar filtros
    if (status) {
      const statusStr = Array.isArray(status) ? status[0] : status;
      allPayments = allPayments.filter(payment => 
        payment.status?.toLowerCase() === (statusStr as string).toLowerCase()
      );
    }
    
    if (clientName) {
      allPayments = allPayments.filter(payment => 
        payment.customer_name?.toLowerCase().includes((clientName as string).toLowerCase()) ||
        payment.client_name?.toLowerCase().includes((clientName as string).toLowerCase())
      );
    }
    
    if (startDate) {
      allPayments = allPayments.filter(payment => 
        new Date(payment.created_at) >= new Date(startDate as string)
      );
    }
    
    if (endDate) {
      allPayments = allPayments.filter(payment => 
        new Date(payment.created_at) <= new Date(endDate as string)
      );
    }
    
    // 9. Ordenar por data de criação (mais recentes primeiro)
    allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // 10. Aplicar paginação
    const paginatedPayments = allPayments.slice(offset, offset + Number(limit));
    
    console.log('\n📋 === RESULTADO FINAL HÍBRIDO ===');
    console.log(`✅ Total encontrado: ${allPayments.length} cobranças`);
    console.log(`📄 Retornando: ${paginatedPayments.length} cobranças (página ${page})`);
    console.log('🔍 IDs das cobranças retornadas:');
    paginatedPayments.forEach((payment, index) => {
      console.log(`  ${index + 1}. ${payment.payment_id} - ${payment.client_name} - R$ ${payment.amount} (${payment.source})`);
    });
    console.log(`🔄 Sincronizadas do Asaas: ${syncedPayments.length}`);
    console.log('=== FIM BUSCA HÍBRIDA ===\n');
    
    return res.json({
      success: true,
      payments: paginatedPayments,
      total: allPayments.length,
      synced_from_asaas: syncedPayments.length,
      asaas_api_found: asaasApiPayments.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: allPayments.length,
        totalPages: Math.ceil(allPayments.length / Number(limit))
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar cobranças da empresa:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/payments/:paymentId - Detalhes de uma cobrança específica
router.get('/:paymentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    
    console.log(`🔍 Buscando detalhes do pagamento: ${paymentId}`);
    
    // Verificar se é um UUID válido ou um ID do Asaas
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);
    const isAsaasId = paymentId.startsWith('pay_');
    
    console.log(`  - É UUID: ${isUUID}`);
    console.log(`  - É ID Asaas: ${isAsaasId}`);
    
    // Tentar buscar primeiro na tabela payments (compra de créditos)
    let payment, paymentError;
    
    if (isUUID) {
      const result = await supabase
        .from('payments')
        .select(`
          *,
          customer:clients(id, nome, cpf_cnpj, email, telefone),
          company:companies(id, nome, cnpj, email)
        `)
        .eq('id', paymentId)
        .single();
      payment = result.data;
      paymentError = result.error;
    } else if (isAsaasId) {
      const result = await supabase
        .from('payments')
        .select(`
          *,
          customer:clients(id, nome, cpf_cnpj, email, telefone),
          company:companies(id, nome, cnpj, email)
        `)
        .eq('asaas_payment_id', paymentId)
        .single();
      payment = result.data;
      paymentError = result.error;
    }
    
    if (payment && !paymentError) {
      // Buscar transações de crédito relacionadas
      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: false });
      
      return res.json({
        payment: {
          ...payment,
          source: 'credits',
          payment_id: payment.id,
          payment_date: payment.confirmed_at,
          due_date: payment.due_date,
          value: payment.amount,
          description: `Compra de ${payment.credit_amount} créditos`,
          method: payment.payment_method,
          transactions: transactions || []
        }
      });
    }
    
    // Se não encontrou, buscar na tabela service_orders (recursos de multa)
    console.log('⚠️ Não encontrado em payments, buscando em service_orders...');
    
    let serviceOrder, serviceOrderError;
    
    if (isUUID) {
      const result = await supabase
        .from('service_orders')
        .select(`
          *,
          client:clients(id, nome, cpf_cnpj, email, telefone),
          company:companies(id, nome, cnpj, email)
        `)
        .eq('id', paymentId)
        .single();
      serviceOrder = result.data;
      serviceOrderError = result.error;
    } else if (isAsaasId) {
      const result = await supabase
        .from('service_orders')
        .select(`
          *,
          client:clients(id, nome, cpf_cnpj, email, telefone),
          company:companies(id, nome, cnpj, email)
        `)
        .eq('asaas_payment_id', paymentId)
        .single();
      serviceOrder = result.data;
      serviceOrderError = result.error;
    }
    
    if (serviceOrder && !serviceOrderError) {
      // Extrair dados do campo notes (JSON com dados do webhook)
      let webhookData = null;
      let processedData = null;
      
      if (serviceOrder.notes) {
        try {
          const notesData = JSON.parse(serviceOrder.notes);
          webhookData = notesData.webhook_data;
          processedData = notesData.processed_data;
          
          console.log('✅ Dados extraídos do campo notes:', {
            hasWebhookData: !!webhookData,
            hasProcessedData: !!processedData,
            hasQrCode: !!processedData?.qr_code_image,
            hasPixPayload: !!processedData?.pix_payload,
            hasInvoiceUrl: !!processedData?.invoice_url
          });
        } catch (error) {
          console.error('❌ Erro ao parsear campo notes:', error);
        }
      }
      
      return res.json({
        payment: {
          ...serviceOrder,
          source: 'service_orders',
          payment_id: serviceOrder.id,
          payment_date: serviceOrder.paid_at,
          due_date: serviceOrder.due_date,
          value: serviceOrder.amount,
          description: serviceOrder.payment_description || processedData?.payment_description || serviceOrder.description || `Recurso de Multa - ${serviceOrder.multa_type}`,
          method: serviceOrder.billing_type || processedData?.billing_type || 'PIX',
          // Priorizar campos diretos da tabela, depois dados do campo notes
          pix_qr_code: serviceOrder.qr_code_image || processedData?.qr_code_image,
          qr_code_image: serviceOrder.qr_code_image || processedData?.qr_code_image,
          pix_payload: serviceOrder.pix_payload || processedData?.pix_payload,
          pix_copy_paste: serviceOrder.pix_payload || processedData?.pix_payload,
          invoice_url: serviceOrder.invoice_url || processedData?.invoice_url,
          invoice_number: serviceOrder.invoice_number || processedData?.invoice_number,
          external_reference: serviceOrder.external_reference || processedData?.external_reference,
          billing_type: serviceOrder.billing_type || processedData?.billing_type,
          date_created: serviceOrder.date_created || processedData?.date_created,
          due_date_webhook: serviceOrder.due_date || processedData?.due_date,
          splits_details: serviceOrder.splits_details || processedData?.splits_details,
          webhook_response: serviceOrder.webhook_response || webhookData,
          // Dados completos para debug
          notes_data: {
            webhook_data: webhookData,
            processed_data: processedData
          },
          // Debug dos campos diretos
          direct_fields: {
            qr_code_image: serviceOrder.qr_code_image,
            pix_payload: serviceOrder.pix_payload,
            invoice_url: serviceOrder.invoice_url,
            payment_description: serviceOrder.payment_description,
            billing_type: serviceOrder.billing_type
          }
        }
      });
    }
    
    // Se não encontrou, buscar na tabela asaas_payments
    const { data: asaasPayment, error: asaasError } = await supabase
      .from('asaas_payments')
      .select(`
        *,
        client:clients(id, nome, cpf_cnpj, email, telefone),
        company:companies(id, nome, cnpj, email)
      `)
      .eq('id', paymentId)
      .single();
    
    if (asaasPayment && !asaasError) {
      // Buscar logs de transação relacionados
      const { data: logs } = await supabase
        .from('asaas_transaction_logs')
        .select('*')
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: false });
      
      return res.json({
        payment: {
          ...asaasPayment,
          source: 'asaas',
          payment_id: asaasPayment.id,
          payment_date: asaasPayment.payment_date,
          due_date: asaasPayment.due_date,
          value: asaasPayment.amount,
          description: asaasPayment.description,
          method: asaasPayment.payment_method,
          logs: logs || []
        }
      });
    }
    
    console.log('❌ Pagamento não encontrado em nenhuma tabela:', {
      paymentId,
      isUUID,
      isAsaasId,
      paymentError: paymentError?.message,
      serviceOrderError: serviceOrderError?.message,
      asaasError: asaasError?.message
    });
    
    return res.status(404).json({ 
      error: 'Cobrança não encontrada',
      details: {
        paymentId,
        searchedTables: ['payments', 'service_orders', 'asaas_payments'],
        errors: {
          payments: paymentError?.message,
          service_orders: serviceOrderError?.message,
          asaas_payments: asaasError?.message
        }
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar detalhes da cobrança:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/payments/:paymentId/webhook-data - Buscar dados do webhook
router.get('/:paymentId/webhook-data', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    
    console.log(`🔍 Buscando dados do webhook para pagamento: ${paymentId}`);
    
    // Buscar dados na tabela webhook_payments usando service_order_id
    const { data: webhookPayment, error: webhookError } = await supabase
      .from('webhook_payments')
      .select('*')
      .eq('service_order_id', paymentId)
      .single();
    
    if (webhookError && webhookError.code !== 'PGRST116') {
      console.error('Erro ao buscar webhook_payments:', webhookError);
      return res.status(500).json({ error: 'Erro ao buscar dados do webhook' });
    }
    
    if (webhookPayment) {
      console.log('✅ Dados do webhook encontrados:', {
        id: webhookPayment.id,
        hasEncodedImage: !!webhookPayment.encoded_image,
        hasInvoiceUrl: !!webhookPayment.invoice_url,
        hasDescription: !!webhookPayment.description
      });
      
      return res.json({
        success: true,
        webhookPayment
      });
    }
    
    console.log('⚠️ Dados do webhook não encontrados para:', paymentId);
    return res.json({
      success: false,
      message: 'Dados do webhook não encontrados',
      webhookPayment: null
    });
    
  } catch (error) {
    console.error('Erro ao buscar dados do webhook:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/payments/:paymentId/status - Atualizar status manualmente
router.put('/:paymentId/status', authenticateToken, authorizeRoles(['dispatcher', 'master_company']), async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { status, reason } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }
    
    // Tentar atualizar na tabela payments primeiro
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'cancelled' && { cancelled_at: new Date().toISOString() }),
        ...(status === 'confirmed' && { confirmed_at: new Date().toISOString() })
      })
      .eq('id', paymentId)
      .select()
      .single();
    
    if (payment && !paymentError) {
      return res.json({ 
        message: 'Status atualizado com sucesso',
        payment: {
          ...payment,
          source: 'credits'
        }
      });
    }
    
    // Se não encontrou, tentar na tabela asaas_payments
    const asaasStatus = mapStatusToAsaas(status);
    if (!asaasStatus) {
      return res.status(400).json({ error: 'Status inválido para pagamento Asaas' });
    }
    
    const { data: asaasPayment, error: asaasError } = await supabase
      .from('asaas_payments')
      .update({ 
        status: asaasStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select()
      .single();
    
    if (asaasPayment && !asaasError) {
      // Registrar log da alteração manual
      await supabase
        .from('asaas_transaction_logs')
        .insert({
          payment_id: paymentId,
          action: 'status_update_manual',
          old_status: asaasPayment.status,
          new_status: asaasStatus,
          details: { reason, updated_by: 'manual' }
        });
      
      return res.json({ 
        message: 'Status atualizado com sucesso',
        payment: {
          ...asaasPayment,
          source: 'asaas'
        }
      });
    }
    
    return res.status(404).json({ error: 'Cobrança não encontrada' });
    
  } catch (error) {
    console.error('Erro ao atualizar status da cobrança:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função auxiliar para mapear status do sistema para status do Asaas
function mapStatusToAsaas(status: string): string | null {
  const statusMap: { [key: string]: string } = {
    'pending': 'PENDING',
    'confirmed': 'RECEIVED',
    'cancelled': 'REFUNDED',
    'expired': 'OVERDUE',
    'refunded': 'REFUNDED'
  };
  
  return statusMap[status] || null;
}

// Função auxiliar para mapear status do Asaas para status do sistema
export function mapAsaasToSystemStatus(asaasStatus: string): string {
  const statusMap: { [key: string]: string } = {
    'PENDING': 'pending',
    'RECEIVED': 'confirmed',
    'CONFIRMED': 'confirmed',
    'OVERDUE': 'expired',
    'REFUNDED': 'refunded',
    'RECEIVED_IN_CASH': 'confirmed',
    'REFUND_REQUESTED': 'refunded',
    'CHARGEBACK_REQUESTED': 'cancelled',
    'CHARGEBACK_DISPUTE': 'cancelled',
    'AWAITING_CHARGEBACK_REVERSAL': 'pending',
    'DUNNING_REQUESTED': 'pending',
    'DUNNING_RECEIVED': 'confirmed',
    'AWAITING_RISK_ANALYSIS': 'pending'
  };
  
  return statusMap[asaasStatus] || 'pending';
}

// POST /api/payments/sync/:companyId - Sincronização manual com Asaas
router.post('/sync/:companyId', authenticateToken, authorizeRoles(['dispatcher', 'master_company']), async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    
    console.log('\n🔄 === SINCRONIZAÇÃO MANUAL INICIADA ===');
    console.log(`Company ID: ${companyId}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // 1. Buscar cobranças diretamente do Asaas
    const asaasApiPayments = await getAsaasPayments(companyId);
    
    if (asaasApiPayments.length === 0) {
      console.log('❌ Nenhuma cobrança encontrada no Asaas para sincronizar');
      return res.json({
        success: true,
        message: 'Nenhuma cobrança encontrada no Asaas para sincronizar',
        synced: 0,
        total_asaas: 0
      });
    }
    
    // 2. Sincronizar cobranças do Asaas para o banco local
    const syncedPayments = await syncPayments(asaasApiPayments, companyId);
    
    console.log('\n📊 === RESULTADO DA SINCRONIZAÇÃO ===');
    console.log(`✅ Cobranças encontradas no Asaas: ${asaasApiPayments.length}`);
    console.log(`✅ Cobranças sincronizadas: ${syncedPayments.length}`);
    console.log(`✅ Cobranças já existiam: ${asaasApiPayments.length - syncedPayments.length}`);
    
    if (syncedPayments.length > 0) {
      console.log('🔍 Cobranças sincronizadas:');
      syncedPayments.forEach((payment, index) => {
        console.log(`  ${index + 1}. ${payment.payment_id} - ${payment.client_name} - R$ ${payment.amount}`);
      });
    }
    
    console.log('=== FIM SINCRONIZAÇÃO MANUAL ===\n');
    
    return res.json({
      success: true,
      message: `${syncedPayments.length} cobranças sincronizadas com sucesso`,
      synced: syncedPayments.length,
      total_asaas: asaasApiPayments.length,
      already_existed: asaasApiPayments.length - syncedPayments.length,
      synced_payments: syncedPayments.map(p => ({
        payment_id: p.payment_id,
        client_name: p.client_name,
        amount: p.amount,
        status: p.status
      }))
    });
    
  } catch (error) {
    console.error('❌ Erro na sincronização manual:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor durante sincronização',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST /api/payments/create-service-order - Criar cobrança de serviço com splits dinâmicos
router.post('/create-service-order', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('=== CRIANDO COBRANÇA COM SPLITS DINÂMICOS ===');
    console.log('Body recebido:', req.body);
    
    const { 
      customer_id, 
      multa_type_id, 
      service_id, 
      company_id,
      valor_cobranca // Valor total que o despachante quer cobrar
    } = req.body;
    
    // Validar dados obrigatórios
    if (!customer_id || !service_id || !company_id || !valor_cobranca) {
      return res.status(400).json({ 
        error: 'Dados obrigatórios não fornecidos',
        required: ['customer_id', 'service_id', 'company_id', 'valor_cobranca']
      });
    }
    
    // 1. Buscar configurações do serviço
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        id, name, category,
        acsm_value, icetran_value, taxa_cobranca
      `)
      .eq('id', service_id)
      .single();
    
    if (serviceError || !service) {
      console.error('Serviço não encontrado:', serviceError);
      return res.status(404).json({ 
        error: 'Serviço não encontrado',
        details: serviceError?.message 
      });
    }
    
    console.log('Configurações do serviço:', service);
    
    // 2. Buscar wallet da empresa (despachante)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('asaas_wallet_id, nome')
      .eq('id', company_id)
      .single();
    
    if (companyError || !company?.asaas_wallet_id) {
      console.error('Wallet da empresa não configurado:', companyError);
      return res.status(400).json({ 
        error: 'Wallet da empresa não configurado. Configure o wallet no painel administrativo.',
        details: companyError?.message
      });
    }
    
    console.log('Empresa encontrada:', company.nome, 'Wallet:', company.asaas_wallet_id);
    
    // 3. Calcular splits dinamicamente
    const custoMinimo = (service.acsm_value || 0) + (service.icetran_value || 0) + (service.taxa_cobranca || 3.50);
    const margemDespachante = Math.max(0, valor_cobranca - custoMinimo);
    
    console.log('Cálculo de splits:');
    console.log('- Valor da cobrança:', valor_cobranca);
    console.log('- ACSM:', service.acsm_value);
    console.log('- ICETRAN:', service.icetran_value);
    console.log('- Taxa:', service.taxa_cobranca);
    console.log('- Custo mínimo:', custoMinimo);
    console.log('- Margem despachante:', margemDespachante);
    
    // Validar se o valor é suficiente
    if (valor_cobranca < custoMinimo) {
      return res.status(400).json({
        error: `Valor mínimo deve ser R$ ${custoMinimo.toFixed(2)}`,
        custo_minimo: custoMinimo,
        detalhes: {
          acsm: service.acsm_value,
          icetran: service.icetran_value,
          taxa: service.taxa_cobranca
        }
      });
    }
    
    // 4. Buscar cliente no Asaas
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('asaas_customer_id, nome, cpf_cnpj, email')
      .eq('id', customer_id)
      .single();
    
    if (clientError || !client?.asaas_customer_id) {
      console.error('Cliente não encontrado:', clientError);
      return res.status(404).json({ 
        error: 'Cliente não encontrado ou sem ID do Asaas',
        details: clientError?.message 
      });
    }
    
    // 5. Criar JSON de splits para o Asaas
    const splits = [];
    
    // Split ICETRAN (sempre presente se valor > 0)
    if (service.icetran_value && service.icetran_value > 0) {
      splits.push({
        walletId: process.env.ICETRAN_WALLET_ID,
        fixedValue: service.icetran_value
      });
    }
    
    // Split Despachante (valor restante após descontar ACSM, ICETRAN e taxa)
    if (margemDespachante > 0) {
      splits.push({
        walletId: company.asaas_wallet_id,
        fixedValue: margemDespachante
      });
    }
    
    console.log('Splits calculados:', splits);
    
    // 6. Enviar para webhook externo
    console.log('🌐 Enviando para webhook externo...');
    
    const webhookData = {
      wallet_icetran: 'eb35cde4-d0f2-44d1-83c0-aaa3496f7ed0',
      wallet_despachante: company.asaas_wallet_id,
      Customer_cliente: {
        id: customer_id,
        nome: client.nome,
        cpf_cnpj: client.cpf_cnpj,
        email: client.email,
        asaas_customer_id: client.asaas_customer_id
      },
      Valor_cobrança: valor_cobranca,
      Idserviço: service_id,
      descricaoserviço: service.name,
      valoracsm: service.acsm_value || 0,
      valoricetran: service.icetran_value || 0,
      taxa: service.taxa_cobranca || 3.50,
      despachante: {
        company_id: company_id,
        nome: company.nome,
        wallet_id: company.asaas_wallet_id,
        margem: margemDespachante
      }
    };
    
    console.log('📤 Dados para webhook:', webhookData);
    
    const webhookResponse = await fetch('https://webhookn8n.synsoft.com.br/webhook/d37fac6e-9379-4bca-b015-9c56b104cae1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });
    
    let webhookResult;
    try {
      webhookResult = await webhookResponse.json();
    } catch (e) {
      webhookResult = { message: 'Resposta não é JSON válido' };
    }
    
    if (!webhookResponse.ok) {
      console.error('❌ Erro no webhook:', webhookResult);
      throw new Error(`Erro ao processar cobrança via webhook: ${webhookResponse.status}`);
    }
    
    console.log('✅ Webhook processado com sucesso:', webhookResult);
    
    // Extrair dados PIX da resposta do webhook externo
    console.log('🔍 Extraindo dados PIX da resposta do webhook...');
    
    let qrCodeImage = null;
    let pixPayload = null;
    let invoiceUrl = null;
    let asaasPaymentId = null;
    
    // Verificar diferentes estruturas possíveis da resposta
    if (webhookResult) {
      // Estrutura direta
      qrCodeImage = webhookResult.qr_code_image || webhookResult.qr_code || webhookResult.encodedImage;
      pixPayload = webhookResult.pix_payload || webhookResult.pix_code || webhookResult.payload;
      invoiceUrl = webhookResult.invoice_url || webhookResult.invoiceUrl;
      asaasPaymentId = webhookResult.payment_id || webhookResult.id || webhookResult.asaas_payment_id;
      
      // Estrutura aninhada (se vier dentro de payment)
      if (webhookResult.payment) {
        const payment = webhookResult.payment;
        qrCodeImage = qrCodeImage || payment.qr_code_image || payment.qr_code;
        pixPayload = pixPayload || payment.pix_payload || payment.pix_code;
        invoiceUrl = invoiceUrl || payment.invoice_url || payment.invoiceUrl;
        asaasPaymentId = asaasPaymentId || payment.id;
        
        // Estrutura PIX Transaction (padrão Asaas)
        if (payment.pixTransaction?.qrCode) {
          const pixTx = payment.pixTransaction.qrCode;
          qrCodeImage = qrCodeImage || pixTx.encodedImage;
          pixPayload = pixPayload || pixTx.payload;
        }
      }
      
      // Estrutura de dados do Asaas (se vier completa)
      if (webhookResult.data) {
        const data = webhookResult.data;
        qrCodeImage = qrCodeImage || data.qr_code_image || data.qr_code;
        pixPayload = pixPayload || data.pix_payload || data.pix_code;
        invoiceUrl = invoiceUrl || data.invoice_url || data.invoiceUrl;
        asaasPaymentId = asaasPaymentId || data.id;
      }
    }
    
    console.log('📊 Dados PIX extraídos:');
    console.log(`   - QR Code Image: ${qrCodeImage ? 'SIM (' + qrCodeImage.length + ' chars)' : 'NÃO'}`);
    console.log(`   - PIX Payload: ${pixPayload ? 'SIM (' + pixPayload.length + ' chars)' : 'NÃO'}`);
    console.log(`   - Invoice URL: ${invoiceUrl ? 'SIM' : 'NÃO'}`);
    console.log(`   - Asaas Payment ID: ${asaasPaymentId || 'NÃO'}`);
    
    // Usar ID do Asaas se disponível, senão gerar um temporário
    const finalPaymentId = asaasPaymentId || `webhook_${Date.now()}`;
    
    // Simular dados de resposta do Asaas para compatibilidade
    const simulatedAsaasPayment = {
      id: finalPaymentId,
      pixQrCodeId: qrCodeImage,
      pixCopyAndPaste: pixPayload,
      webhook_response: webhookResult
    };
    
    // 7. Salvar no banco com TODOS os dados PIX extraídos
    console.log('💾 SALVANDO NO BANCO DE DADOS...');
    console.log('   - Tabela: service_orders');
    console.log('   - QR Code para salvar:', qrCodeImage ? 'SIM (' + qrCodeImage.length + ' chars)' : 'NÃO');
    console.log('   - PIX Payload para salvar:', pixPayload ? 'SIM (' + pixPayload.length + ' chars)' : 'NÃO');
    console.log('   - Invoice URL para salvar:', invoiceUrl || 'NÃO');
    console.log('   - Asaas Payment ID:', finalPaymentId);
    
    const insertData = {
      client_id: customer_id,
      service_id,
      company_id,
      service_type: 'recurso_multa',
      multa_type: 'leve', // Valor padrão, pode ser ajustado conforme necessário
      amount: valor_cobranca,
      status: 'pending_payment',
      description: `${service.name} - ${client.nome}`,
      asaas_payment_id: finalPaymentId,
      customer_id: client.asaas_customer_id || customer_id,
      // SALVAR DADOS PIX IMEDIATAMENTE
      qr_code_image: qrCodeImage,
      pix_payload: pixPayload,
      invoice_url: invoiceUrl,
      payment_description: `${service.name} - ${client.nome}`,
      billing_type: 'PIX',
      webhook_response: webhookResult,
      splits_config: {
        acsm_value: service.acsm_value,
        icetran_value: service.icetran_value,
        taxa_cobranca: service.taxa_cobranca,
        margem_despachante: margemDespachante,
        custo_minimo: custoMinimo
      },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    console.log('📦 DADOS PARA INSERÇÃO:');
    console.log(JSON.stringify(insertData, null, 2));
    
    const { data: payment, error: paymentError } = await supabase
      .from('service_orders')
      .insert(insertData)
      .select()
      .single();
    
    if (paymentError) {
      console.error('❌ ERRO AO SALVAR NO BANCO:', paymentError);
      console.log('   - Código do erro:', paymentError.code);
      console.log('   - Mensagem:', paymentError.message);
      console.log('   - Detalhes:', paymentError.details);
      return res.status(500).json({ 
        error: 'Erro ao salvar cobrança no banco de dados',
        details: paymentError.message 
      });
    }
    
    console.log('✅ SERVICE ORDER SALVA COM SUCESSO NO BANCO!');
    console.log('   - ID gerado:', payment.id);
    console.log('   - Asaas Payment ID salvo:', payment.asaas_payment_id);
    console.log('   - Status:', payment.status);
    console.log('   - Valor:', payment.amount);
    
    console.log('\n📊 VERIFICAÇÃO DOS DADOS PIX SALVOS:');
    console.log(`   - QR Code Image salvo: ${payment.qr_code_image ? 'SIM (' + payment.qr_code_image.length + ' chars)' : 'NÃO'}`);
    console.log(`   - PIX Payload salvo: ${payment.pix_payload ? 'SIM (' + payment.pix_payload.length + ' chars)' : 'NÃO'}`);
    console.log(`   - Invoice URL salvo: ${payment.invoice_url ? 'SIM' : 'NÃO'}`);
    console.log(`   - Webhook Response salvo: ${payment.webhook_response ? 'SIM' : 'NÃO'}`);
    
    console.log('\n🎯 DADOS PRONTOS PARA RETORNO AO FRONTEND!');
    console.log('   - Modal poderá exibir QR Code e informações completas');
    console.log('   - Cobrança foi persistida com sucesso na tabela service_orders');
    
    res.json({
      success: true,
      payment: {
        id: payment.id,
        webhook_id: simulatedAsaasPayment.id,
        amount: valor_cobranca,
        qr_code: qrCodeImage,
        qr_code_image: qrCodeImage,
        pix_code: pixPayload,
        pix_payload: pixPayload,
        invoice_url: invoiceUrl,
        asaas_payment_id: finalPaymentId,
        splits: {
          acsm: service.acsm_value,
          icetran: service.icetran_value,
          taxa: service.taxa_cobranca,
          despachante: margemDespachante
        },
        description: `${service.name} - ${client.nome}`,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        webhook_response: webhookResult,
        // Dados para debug
        debug_info: {
          qr_code_extracted: !!qrCodeImage,
          pix_payload_extracted: !!pixPayload,
          invoice_url_extracted: !!invoiceUrl,
          asaas_payment_id_extracted: !!asaasPaymentId
        }
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar cobrança:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/payments/:paymentId/recurso - Verificar se existe recurso para um pagamento
router.get('/:paymentId/recurso', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    
    console.log('🔍 Verificando recurso para pagamento:', paymentId);
    
    // Buscar o service_order pelo asaas_payment_id ou id
    const { data: serviceOrder, error: serviceOrderError } = await supabase
      .from('service_orders')
      .select('id, status, client_id, company_id')
      .or(`id.eq.${paymentId},asaas_payment_id.eq.${paymentId}`)
      .single();
    
    if (serviceOrderError || !serviceOrder) {
      console.log('❌ Service order não encontrada:', paymentId);
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    
    console.log('✅ Service order encontrada:', serviceOrder.id);
    
    // Verificar se o pagamento está pago
    const isPaid = ['paid', 'confirmed', 'processing', 'completed'].includes(serviceOrder.status);
    
    if (!isPaid) {
      console.log('⚠️ Pagamento não está pago:', serviceOrder.status);
      return res.json({
        canCreateRecurso: false,
        reason: 'payment_not_paid',
        message: 'Recurso só pode ser criado para pagamentos efetuados',
        paymentStatus: serviceOrder.status
      });
    }
    
    // Buscar recurso existente baseado no service_order
    // Como não há relacionamento direto, vamos buscar por client_id e company_id
    const { data: existingRecurso, error: recursoError } = await supabase
      .from('recursos')
      .select(`
        id,
        numero_processo,
        tipo_recurso,
        status,
        data_protocolo,
        created_at,
        multas!inner(
          id,
          numero_auto,
          placa_veiculo
        )
      `)
      .eq('company_id', serviceOrder.company_id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (recursoError) {
      console.error('❌ Erro ao buscar recursos:', recursoError);
      return res.status(500).json({ error: 'Erro ao verificar recursos existentes' });
    }
    
    if (existingRecurso && existingRecurso.length > 0) {
      const recurso = existingRecurso[0];
      console.log('✅ Recurso existente encontrado:', recurso.id);
      
      return res.json({
        canCreateRecurso: false,
        hasExistingRecurso: true,
        recurso: {
          id: recurso.id,
          numero_processo: recurso.numero_processo,
          tipo_recurso: recurso.tipo_recurso,
          status: recurso.status,
          data_protocolo: recurso.data_protocolo,
          multa: recurso.multas
        },
        message: 'Já existe um recurso para esta empresa'
      });
    }
    
    console.log('✅ Pode criar novo recurso');
    
    return res.json({
      canCreateRecurso: true,
      hasExistingRecurso: false,
      serviceOrderId: serviceOrder.id,
      message: 'Pagamento efetuado - pode criar recurso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar recurso:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;