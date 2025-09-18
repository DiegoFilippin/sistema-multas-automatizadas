import express from 'express';
import { supabase } from '../config/supabase.js';
import fetch from 'node-fetch';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Função para mapear status do Asaas
const mapAsaasStatus = (asaasStatus) => {
  const statusMap = {
    'PENDING': 'pending',
    'RECEIVED': 'paid',
    'CONFIRMED': 'paid',
    'OVERDUE': 'overdue',
    'REFUNDED': 'refunded',
    'RECEIVED_IN_CASH': 'paid',
    'REFUND_REQUESTED': 'refund_requested',
    'REFUND_IN_PROGRESS': 'refund_in_progress',
    'CHARGEBACK_REQUESTED': 'chargeback_requested',
    'CHARGEBACK_DISPUTE': 'chargeback_dispute',
    'AWAITING_CHARGEBACK_REVERSAL': 'awaiting_chargeback_reversal',
    'DUNNING_REQUESTED': 'dunning_requested',
    'DUNNING_RECEIVED': 'dunning_received',
    'AWAITING_RISK_ANALYSIS': 'awaiting_risk_analysis'
  };
  
  return statusMap[asaasStatus] || 'pending';
};

// Função para extrair tipo de multa da descrição
const extractMultaType = (description) => {
  if (!description) return 'Multa Leve';
  
  const desc = description.toLowerCase();
  if (desc.includes('grave')) return 'Multa Grave';
  if (desc.includes('gravíssima')) return 'Multa Gravíssima';
  if (desc.includes('média')) return 'Multa Média';
  return 'Multa Leve';
};

// Função para buscar cobrança específica no Asaas
const fetchFromAsaas = async (paymentId, companyId) => {
  try {
    console.log(`🔍 Buscando ${paymentId} no Asaas para empresa ${companyId}`);
    
    // Buscar configuração do Asaas
    const { data: asaasConfig, error: configError } = await supabase
      .from('asaas_subaccounts')
      .select('api_key, wallet_id, asaas_account_id')
      .eq('company_id', companyId)
      .single();
    
    if (configError || !asaasConfig?.api_key) {
      console.error('❌ Configuração do Asaas não encontrada:', configError);
      return { error: 'Configuração do Asaas não encontrada' };
    }
    
    console.log('✅ Configuração encontrada para empresa:', companyId);
    
    // Buscar cobrança específica no Asaas
    const response = await fetch(`https://sandbox.asaas.com/api/v3/payments/${paymentId}`, {
      headers: {
        'access_token': asaasConfig.api_key,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Status da resposta Asaas:', response.status);
    
    if (response.ok) {
      const payment = await response.json();
      console.log('✅ Cobrança encontrada no Asaas:', payment.id);
      return { payment, config: asaasConfig };
    } else {
      const errorText = await response.text();
      console.error('❌ Cobrança não encontrada no Asaas:', response.status, errorText);
      return { error: `Cobrança não encontrada no Asaas (${response.status})` };
    }
  } catch (error) {
    console.error('💥 Erro ao buscar no Asaas:', error.message);
    return { error: error.message };
  }
};

// Função para sincronizar cobrança específica
const syncSpecificPayment = async (asaasPayment, companyId) => {
  try {
    console.log('💾 Sincronizando cobrança:', asaasPayment.id);
    
    const paymentData = {
      payment_id: asaasPayment.id,
      company_id: companyId,
      client_name: asaasPayment.customer?.name || 'Cliente não identificado',
      customer_name: asaasPayment.customer?.name || 'Cliente não identificado',
      amount: asaasPayment.value,
      status: mapAsaasStatus(asaasPayment.status),
      multa_type: extractMultaType(asaasPayment.description),
      qr_code: asaasPayment.pixTransaction?.qrCode?.payload,
      pix_copy_paste: asaasPayment.pixTransaction?.qrCode?.payload,
      payment_url: asaasPayment.invoiceUrl,
      created_at: asaasPayment.dateCreated,
      paid_at: asaasPayment.paymentDate,
      synced_from_asaas: true,
      description: asaasPayment.description
    };
    
    console.log('📋 Dados para salvar:', {
      payment_id: paymentData.payment_id,
      company_id: paymentData.company_id,
      client_name: paymentData.client_name,
      amount: paymentData.amount,
      status: paymentData.status
    });
    
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
      return { error: error.message };
    } else {
      console.log('✅ Cobrança sincronizada com sucesso:', saved.id);
      return { success: true, payment: saved };
    }
  } catch (error) {
    console.error('💥 Erro na sincronização:', error.message);
    return { error: error.message };
  }
};

// POST /api/force-sync/:paymentId - Sincronização forçada de cobrança específica
router.post('/:paymentId', authenticateToken, authorizeRoles(['dispatcher', 'master_company']), async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { companyId } = req.body;
    
    console.log('\n🔄 === SINCRONIZAÇÃO FORÇADA ===');
    console.log('Payment ID:', paymentId);
    console.log('Company ID:', companyId);
    console.log('Timestamp:', new Date().toISOString());
    
    if (!companyId) {
      return res.status(400).json({ 
        success: false,
        error: 'Company ID é obrigatório' 
      });
    }
    
    // Buscar no Asaas
    const asaasResult = await fetchFromAsaas(paymentId, companyId);
    
    if (asaasResult.error) {
      return res.status(404).json({ 
        success: false,
        error: asaasResult.error 
      });
    }
    
    // Sincronizar
    const syncResult = await syncSpecificPayment(asaasResult.payment, companyId);
    
    if (syncResult.error) {
      return res.status(500).json({ 
        success: false,
        error: syncResult.error 
      });
    }
    
    res.json({
      success: true,
      message: 'Cobrança sincronizada com sucesso',
      payment: syncResult.payment
    });
  } catch (error) {
    console.error('💥 Erro na sincronização forçada:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET /api/force-sync/test/:companyId - Testar conexão com Asaas
router.get('/test/:companyId', authenticateToken, authorizeRoles(['dispatcher', 'master_company']), async (req, res) => {
  try {
    const { companyId } = req.params;
    
    console.log('\n🧪 === TESTE DE CONEXÃO ASAAS ===');
    console.log('Company ID:', companyId);
    
    // Buscar configuração do Asaas
    const { data: asaasConfig, error: configError } = await supabase
      .from('asaas_subaccounts')
      .select('api_key, wallet_id, asaas_account_id')
      .eq('company_id', companyId)
      .single();
    
    if (configError || !asaasConfig?.api_key) {
      return res.status(404).json({ 
        success: false,
        error: 'Configuração do Asaas não encontrada',
        details: configError 
      });
    }
    
    // Testar conexão listando cobranças
    const response = await fetch('https://sandbox.asaas.com/api/v3/payments?limit=5', {
      headers: {
        'access_token': asaasConfig.api_key,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      res.json({
        success: true,
        message: 'Conexão com Asaas funcionando',
        config: {
          wallet_id: asaasConfig.wallet_id,
          account_id: asaasConfig.asaas_account_id,
          api_key_preview: asaasConfig.api_key.substring(0, 20) + '...'
        },
        asaas_data: {
          total_payments: result.totalCount,
          payments_in_page: result.data?.length || 0
        }
      });
    } else {
      const errorText = await response.text();
      res.status(500).json({
        success: false,
        error: 'Erro na conexão com Asaas',
        details: errorText
      });
    }
  } catch (error) {
    console.error('💥 Erro no teste:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;