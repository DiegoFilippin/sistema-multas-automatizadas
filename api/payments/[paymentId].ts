import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { paymentId } = req.query;
    const url = req.url || '';
    
    console.log('🔍 API Payment Route:', {
      method: req.method,
      paymentId,
      url,
      fullPath: url
    });

    // Rota para verificar recurso: /api/payments/{paymentId}/recurso
    if (url.endsWith('/recurso') && req.method === 'GET') {
      console.log('🔍 === VERIFICAR STATUS DO RECURSO ===');
      console.log('Payment ID:', paymentId);
      
      try {
        // Buscar recursos existentes para este payment_id
        const { data: recursos, error: recursoError } = await supabase
          .from('recursos')
          .select('*')
          .eq('service_order_id', paymentId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (recursoError && recursoError.code !== 'PGRST116') {
          console.error('❌ Erro ao buscar recurso:', recursoError);
          return res.status(500).json({
            success: false,
            error: 'Erro ao verificar recurso'
          });
        }

        const hasRecurso = recursos && recursos.length > 0;
        const recurso = hasRecurso ? recursos[0] : null;

        console.log('✅ Resultado da verificação:', {
          hasRecurso,
          recursoId: recurso?.id,
          recursoStatus: recurso?.status
        });

        return res.status(200).json({
          success: true,
          hasRecurso,
          recurso
        });

      } catch (error) {
        console.error('❌ Erro ao verificar recurso:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro interno ao verificar recurso'
        });
      }
    }

    // Rota para buscar detalhes do pagamento: /api/payments/{paymentId}
    if (req.method === 'GET' && !url.endsWith('/recurso')) {
      console.log('🔍 === BUSCAR DETALHES DO PAGAMENTO ===');
      console.log('Payment ID:', paymentId);
      
      try {
        // Buscar detalhes do pagamento
        const { data: payment, error: paymentError } = await supabase
          .from('service_orders')
          .select('*')
          .eq('asaas_payment_id', paymentId)
          .single();

        if (paymentError) {
          console.error('❌ Erro ao buscar pagamento:', paymentError);
          return res.status(404).json({
            success: false,
            error: 'Pagamento não encontrado'
          });
        }

        console.log('✅ Pagamento encontrado:', payment.id);

        return res.status(200).json({
          success: true,
          payment
        });

      } catch (error) {
        console.error('❌ Erro ao buscar pagamento:', error);
        return res.status(500).json({
          success: false,
          error: 'Erro interno ao buscar pagamento'
        });
      }
    }

    // Método não suportado
    return res.status(405).json({
      success: false,
      error: 'Método não permitido'
    });

  } catch (error) {
    console.error('❌ Erro geral na API:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}