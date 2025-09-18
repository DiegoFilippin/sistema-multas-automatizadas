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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, access_token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    console.log('🔍 === BUSCAR DETALHES DA COBRANÇA ===');
    
    const { paymentId } = req.query;
    
    if (!paymentId || typeof paymentId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Payment ID é obrigatório'
      });
      return;
    }
    
    console.log('Payment ID:', paymentId);
    
    let paymentData = null;
    
    // 1. Tentar buscar em service_orders primeiro
    const { data: serviceOrder, error: serviceError } = await supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(*),
        company:companies(*)
      `)
      .eq('asaas_payment_id', paymentId)
      .single();
    
    if (serviceOrder && !serviceError) {
      console.log('✅ Cobrança encontrada em service_orders');
      paymentData = {
        id: serviceOrder.id,
        payment_id: serviceOrder.asaas_payment_id,
        asaas_payment_id: serviceOrder.asaas_payment_id,
        client_name: serviceOrder.client?.nome || 'Cliente',
        customer_name: serviceOrder.client?.nome || 'Cliente',
        company_name: serviceOrder.company?.nome || 'Empresa',
        company_id: serviceOrder.company_id,
        amount: serviceOrder.amount,
        status: serviceOrder.status,
        created_at: serviceOrder.created_at,
        paid_at: serviceOrder.payment_date,
        due_date: serviceOrder.due_date,
        description: serviceOrder.description,
        payment_method: serviceOrder.payment_method || 'PIX',
        pix_qr_code: serviceOrder.pix_qr_code,
        pix_code: serviceOrder.pix_code,
        qr_code_image: serviceOrder.qr_code_image,
        pix_copy_paste: serviceOrder.pix_copy_paste,
        pix_payload: serviceOrder.pix_payload,
        encodedImage: serviceOrder.encodedImage,
        invoice_url: serviceOrder.invoice_url,
        bank_slip_url: serviceOrder.bank_slip_url,
        source: 'service_orders'
      };
    } else {
      // 2. Tentar buscar em payments
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('asaas_payment_id', paymentId)
        .single();
      
      if (payment && !paymentError) {
        console.log('✅ Cobrança encontrada em payments');
        paymentData = {
          id: payment.id,
          payment_id: payment.asaas_payment_id,
          asaas_payment_id: payment.asaas_payment_id,
          client_name: 'Cliente',
          customer_name: 'Cliente',
          company_name: payment.company?.nome || 'Empresa',
          company_id: payment.company_id,
          amount: payment.amount,
          status: payment.status,
          created_at: payment.created_at,
          paid_at: payment.payment_date,
          due_date: payment.due_date,
          description: payment.description || `Compra de ${payment.credit_amount || 0} créditos`,
          payment_method: payment.payment_method || 'PIX',
          pix_qr_code: payment.pix_qr_code,
          pix_code: payment.pix_code,
          qr_code_image: payment.qr_code_image,
          pix_copy_paste: payment.pix_copy_paste,
          pix_payload: payment.pix_payload,
          encodedImage: payment.encodedImage,
          invoice_url: payment.invoice_url,
          bank_slip_url: payment.bank_slip_url,
          source: 'payments'
        };
      } else {
        // 3. Tentar buscar em asaas_payments
        const { data: asaasPayment, error: asaasError } = await supabase
          .from('asaas_payments')
          .select(`
            *,
            client:clients(*),
            company:companies(*)
          `)
          .eq('id', paymentId)
          .single();
        
        if (asaasPayment && !asaasError) {
          console.log('✅ Cobrança encontrada em asaas_payments');
          paymentData = {
            id: asaasPayment.id,
            payment_id: asaasPayment.id,
            asaas_payment_id: asaasPayment.id,
            client_name: asaasPayment.client?.nome || 'Cliente',
            customer_name: asaasPayment.client?.nome || 'Cliente',
            company_name: asaasPayment.company?.nome || 'Empresa',
            company_id: asaasPayment.company_id,
            amount: asaasPayment.amount,
            status: asaasPayment.status,
            created_at: asaasPayment.created_at,
            paid_at: asaasPayment.payment_date,
            due_date: asaasPayment.due_date,
            description: asaasPayment.description,
            payment_method: asaasPayment.payment_method || 'PIX',
            pix_qr_code: asaasPayment.pix_qr_code,
            pix_code: asaasPayment.pix_code,
            qr_code_image: asaasPayment.qr_code_image,
            pix_copy_paste: asaasPayment.pix_copy_paste,
            pix_payload: asaasPayment.pix_payload,
            encodedImage: asaasPayment.encodedImage,
            invoice_url: asaasPayment.invoice_url,
            bank_slip_url: asaasPayment.bank_slip_url,
            source: 'asaas_payments'
          };
        }
      }
    }
    
    if (!paymentData) {
      console.log('❌ Cobrança não encontrada em nenhuma tabela');
      res.status(404).json({
        success: false,
        error: 'Cobrança não encontrada'
      });
      return;
    }
    
    console.log('✅ Detalhes da cobrança encontrados:', paymentData.source);
    console.log('  - QR Code disponível:', !!paymentData.pix_qr_code);
    console.log('  - PIX Code disponível:', !!paymentData.pix_code);
    console.log('  - QR Code Image disponível:', !!paymentData.qr_code_image);
    
    res.status(200).json({
      success: true,
      payment: paymentData
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar detalhes da cobrança:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}