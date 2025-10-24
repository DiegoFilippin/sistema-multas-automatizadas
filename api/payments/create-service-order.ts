import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Variáveis do Supabase não configuradas!');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://sistema-multas-automatizadas.vercel.app' : 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, access_token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    console.log('🔍 === CRIAR COBRANÇA DE SERVIÇO ===');
    console.log('📦 Dados recebidos:', req.body);
    
    const { 
      customer_id, 
      service_id, 
      company_id,
      valor_cobranca
    } = req.body;
    
    // Validar dados obrigatórios
    if (!customer_id || !service_id || !company_id || !valor_cobranca) {
      res.status(400).json({ 
        success: false,
        error: 'Dados obrigatórios não fornecidos',
        required: ['customer_id', 'service_id', 'company_id', 'valor_cobranca']
      });
      return;
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
      console.error('❌ Serviço não encontrado:', serviceError);
      res.status(404).json({ 
        success: false,
        error: 'Serviço não encontrado',
        details: serviceError?.message 
      });
      return;
    }
    
    console.log('✅ Configurações do serviço:', service);
    
    // 2. Buscar wallet da empresa (despachante)
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('manual_wallet_id, nome')
      .eq('id', company_id)
      .single();
    
    if (companyError || !company?.manual_wallet_id) {
      console.error('❌ Wallet da empresa não configurado:', companyError);
      res.status(400).json({ 
        success: false,
        error: 'Wallet da empresa não configurado. Configure o wallet no painel administrativo.',
        details: companyError?.message
      });
      return;
    }
    
    console.log('✅ Empresa encontrada:', company.nome, 'Wallet:', company.manual_wallet_id);
    
    // 3. Calcular splits dinamicamente
    const custoMinimo = (service.acsm_value || 0) + (service.icetran_value || 0) + (service.taxa_cobranca || 3.50);
    const margemDespachante = Math.max(0, valor_cobranca - custoMinimo);
    
    console.log('💰 Cálculo de splits:');
    console.log('  - Valor da cobrança:', valor_cobranca);
    console.log('  - ACSM:', service.acsm_value);
    console.log('  - ICETRAN:', service.icetran_value);
    console.log('  - Taxa:', service.taxa_cobranca);
    console.log('  - Custo mínimo:', custoMinimo);
    console.log('  - Margem despachante:', margemDespachante);
    
    // Validar se o valor é suficiente
    if (valor_cobranca < custoMinimo) {
      res.status(400).json({
        success: false,
        error: `Valor mínimo deve ser R$ ${custoMinimo.toFixed(2)}`,
        custo_minimo: custoMinimo,
        detalhes: {
          acsm: service.acsm_value,
          icetran: service.icetran_value,
          taxa: service.taxa_cobranca
        }
      });
      return;
    }
    
    // 4. Buscar cliente no Asaas
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('asaas_customer_id, nome, cpf_cnpj, email')
      .eq('id', customer_id)
      .single();
    
    if (clientError || !client?.asaas_customer_id) {
      console.error('❌ Cliente não encontrado:', clientError);
      res.status(404).json({ 
        success: false,
        error: 'Cliente não encontrado ou sem ID do Asaas',
        details: clientError?.message 
      });
      return;
    }
    
    console.log('✅ Cliente encontrado:', client.nome);
    
    // 5. Enviar para webhook externo
    console.log('🌐 Enviando para webhook externo...');
    
    // Resolver wallet do ICETRAN dinamicamente
    let icetranWalletId: string | null = null;
    try {
      // 5.1 Tentar via empresa pai do despachante
      const { data: companyRow } = await supabase
        .from('companies')
        .select('parent_company_id')
        .eq('id', company_id)
        .single();

      if (companyRow?.parent_company_id) {
        const { data: parent } = await supabase
          .from('companies')
          .select('id, nome, manual_wallet_id')
          .eq('id', companyRow.parent_company_id)
          .single();
        
        if (parent?.manual_wallet_id) {
          icetranWalletId = parent.manual_wallet_id;
        }
      }

      // 5.2 Fallback: buscar empresa ICETRAN ativa (por tipo ou nome), usando somente manual_wallet_id
      if (!icetranWalletId) {
        const { data: icetranCompanies } = await supabase
          .from('companies')
          .select('id, nome, manual_wallet_id, company_type, status')
          .or('company_type.eq.icetran,nome.ilike.%ICETRAN%')
          .eq('status', 'ativo')
          .limit(1);
        const icetran = Array.isArray(icetranCompanies) ? icetranCompanies[0] : null;
        if (icetran?.manual_wallet_id) {
          icetranWalletId = icetran.manual_wallet_id;
        }
      }
    } catch (resolveErr) {
      console.warn('⚠️  Falha ao resolver wallet do ICETRAN dinamicamente:', resolveErr);
    }

    // Não usar defaults ou subcontas; exigir manual_wallet_id quando houver icetran_value
    if (!icetranWalletId && service.icetran_value && service.icetran_value > 0) {
      return res.status(400).json({ 
        error: 'Wallet da ICETRAN não configurada. Cadastre manual_wallet_id na empresa ICETRAN.',
        code: 'ICETRAN_WALLET_MISSING'
      });
    }
    console.log('🏦 Wallet ICETRAN usada:', icetranWalletId);
    
    const webhookData = {
      wallet_icetran: icetranWalletId,
      wallet_despachante: company.manual_wallet_id,
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
      multa_type: req.body.multa_type || service.category || 'leve',
      valoracsm: service.acsm_value || 0,
      valoricetran: service.icetran_value || 0,
      taxa: service.taxa_cobranca || 3.50,
      despachante: {
        company_id: company_id,
        nome: company.nome,
        wallet_id: company.manual_wallet_id,
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
    } catch {
      webhookResult = { message: 'Resposta não é JSON válido' };
    }
    
    if (!webhookResponse.ok) {
      console.error('❌ Erro no webhook:', webhookResult);
      res.status(500).json({
        success: false,
        error: `Erro ao processar cobrança via webhook: ${webhookResponse.status}`,
        details: webhookResult
      });
      return;
    }
    
    console.log('✅ Webhook processado com sucesso:', webhookResult);
    
    // Extrair dados PIX da resposta do webhook
    let qrCodeImage = null;
    let pixPayload = null;
    let invoiceUrl = null;
    let asaasPaymentId = null;
    
    if (webhookResult) {
      qrCodeImage = webhookResult.qr_code_image || webhookResult.qr_code || webhookResult.encodedImage;
      pixPayload = webhookResult.pix_payload || webhookResult.pix_code || webhookResult.payload;
      invoiceUrl = webhookResult.invoice_url || webhookResult.invoiceUrl;
      asaasPaymentId = webhookResult.payment_id || webhookResult.id || webhookResult.asaas_payment_id;
      
      if (webhookResult.payment) {
        const payment = webhookResult.payment;
        qrCodeImage = qrCodeImage || payment.qr_code_image || payment.qr_code;
        pixPayload = pixPayload || payment.pix_payload || payment.pix_code;
        invoiceUrl = invoiceUrl || payment.invoice_url || payment.invoiceUrl;
        asaasPaymentId = asaasPaymentId || payment.id;
      }
    }
    
    console.log('🎉 Cobrança criada com sucesso!');
    console.log('  - Payment ID:', asaasPaymentId);
    console.log('  - QR Code disponível:', !!qrCodeImage);
    console.log('  - PIX Code disponível:', !!pixPayload);
    
    res.status(200).json({
      success: true,
      payment: {
        id: asaasPaymentId,
        webhook_id: asaasPaymentId,
        amount: valor_cobranca,
        description: `${service.name} - ${client.nome}`,
        qr_code: qrCodeImage,
        pix_code: pixPayload,
        invoice_url: invoiceUrl,
        webhook_response: webhookResult,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar cobrança:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}