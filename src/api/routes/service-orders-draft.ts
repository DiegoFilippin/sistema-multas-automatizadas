import { Router, Request, Response } from 'express';
import { supabase } from '../../lib/supabase';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

/**
 * POST /api/service-orders/draft/create
 * Criar novo rascunho
 */
router.post('/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { client_id, service_id, multa_type, amount } = req.body;
    const company_id = (req as any).user?.company_id;

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID não disponível' });
    }

    console.log('📝 Criando novo rascunho...', { company_id, client_id, service_id });

    const draftData = {
      company_id,
      client_id: client_id || null,
      service_id: service_id || null,
      status: 'rascunho',
      current_step: 1,
      wizard_data: {},
      multa_type: multa_type || 'grave',
      amount: amount || 0,
    };

    const { data, error } = await supabase
      .from('service_orders')
      .insert(draftData)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar rascunho:', error);
      return res.status(500).json({ error: 'Erro ao criar rascunho' });
    }

    console.log('✅ Rascunho criado:', data.id);
    res.json({ success: true, draft: data });
  } catch (error: any) {
    console.error('❌ Erro ao criar rascunho:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar rascunho' });
  }
});

/**
 * PUT /api/service-orders/draft/:id/save
 * Salvar progresso do rascunho
 */
router.put('/:id/save', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { step, stepData } = req.body;
    const company_id = (req as any).user?.company_id;

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID não disponível' });
    }

    console.log(`💾 Salvando rascunho ${id} - Step ${step}...`);

    // Buscar wizard_data atual
    const { data: current, error: fetchError } = await supabase
      .from('service_orders')
      .select('wizard_data')
      .eq('id', id)
      .eq('company_id', company_id)
      .single();

    if (fetchError) {
      console.error('❌ Erro ao buscar rascunho:', fetchError);
      return res.status(404).json({ error: 'Rascunho não encontrado' });
    }

    // Mesclar dados do step atual
    const updatedWizardData = {
      ...(current?.wizard_data || {}),
      [`step${step}`]: stepData,
    };

    // Preparar dados para atualização
    const updateData: any = {
      current_step: step,
      wizard_data: updatedWizardData,
    };

    // Atualizar client_id e service_id se disponíveis
    if (stepData.cliente_id) updateData.client_id = stepData.cliente_id;
    if (stepData.servico_id) updateData.service_id = stepData.servico_id;
    if (stepData.servico_preco) updateData.amount = stepData.servico_preco;
    if (stepData.servico_tipo) updateData.multa_type = stepData.servico_tipo;
    if (stepData.payment_method) updateData.payment_method = stepData.payment_method;

    // Atualizar no banco
    const { data, error: updateError } = await supabase
      .from('service_orders')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', company_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao salvar rascunho:', updateError);
      return res.status(500).json({ error: 'Erro ao salvar rascunho' });
    }

    console.log('✅ Rascunho salvo com sucesso');
    res.json({ success: true, draft: data });
  } catch (error: any) {
    console.error('❌ Erro ao salvar rascunho:', error);
    res.status(500).json({ error: error.message || 'Erro ao salvar rascunho' });
  }
});

/**
 * GET /api/service-orders/draft/:id
 * Carregar rascunho específico
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const company_id = (req as any).user?.company_id;

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID não disponível' });
    }

    console.log(`📂 Carregando rascunho ${id}...`);

    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .eq('id', id)
      .eq('company_id', company_id)
      .single();

    if (error) {
      console.error('❌ Erro ao carregar rascunho:', error);
      return res.status(404).json({ error: 'Rascunho não encontrado' });
    }

    console.log('✅ Rascunho carregado');
    res.json({ success: true, draft: data });
  } catch (error: any) {
    console.error('❌ Erro ao carregar rascunho:', error);
    res.status(500).json({ error: error.message || 'Erro ao carregar rascunho' });
  }
});

/**
 * GET /api/service-orders/draft/list
 * Listar rascunhos do usuário
 */
router.get('/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const company_id = (req as any).user?.company_id;
    const { status, limit } = req.query;

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID não disponível' });
    }

    console.log('📋 Listando rascunhos...', { status, limit });

    let query = supabase
      .from('service_orders')
      .select('*')
      .eq('company_id', company_id)
      .order('last_saved_at', { ascending: false });

    // Aplicar filtros
    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      query = query.in('status', statusArray);
    }

    if (limit) {
      query = query.limit(parseInt(limit as string));
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao listar rascunhos:', error);
      return res.status(500).json({ error: 'Erro ao listar rascunhos' });
    }

    console.log(`✅ ${data?.length || 0} rascunhos encontrados`);
    res.json({ success: true, drafts: data || [] });
  } catch (error: any) {
    console.error('❌ Erro ao listar rascunhos:', error);
    res.status(500).json({ error: error.message || 'Erro ao listar rascunhos' });
  }
});

/**
 * DELETE /api/service-orders/draft/:id
 * Excluir rascunho (marca como cancelado)
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const company_id = (req as any).user?.company_id;

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID não disponível' });
    }

    console.log(`🗑️ Excluindo rascunho ${id}...`);

    const { error } = await supabase
      .from('service_orders')
      .update({ status: 'cancelado' })
      .eq('id', id)
      .eq('company_id', company_id);

    if (error) {
      console.error('❌ Erro ao excluir rascunho:', error);
      return res.status(500).json({ error: 'Erro ao excluir rascunho' });
    }

    console.log('✅ Rascunho excluído');
    res.json({ success: true, message: 'Rascunho excluído com sucesso' });
  } catch (error: any) {
    console.error('❌ Erro ao excluir rascunho:', error);
    res.status(500).json({ error: error.message || 'Erro ao excluir rascunho' });
  }
});

/**
 * PUT /api/service-orders/draft/:id/status
 * Atualizar status do rascunho
 */
router.put('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, ...additionalData } = req.body;
    const company_id = (req as any).user?.company_id;

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID não disponível' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status não fornecido' });
    }

    console.log(`🔄 Atualizando status do rascunho ${id} para ${status}...`);

    const { data, error } = await supabase
      .from('service_orders')
      .update({
        status,
        ...additionalData,
      })
      .eq('id', id)
      .eq('company_id', company_id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar status:', error);
      return res.status(500).json({ error: 'Erro ao atualizar status' });
    }

    console.log('✅ Status atualizado');
    res.json({ success: true, draft: data });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar status' });
  }
});

export default router;
