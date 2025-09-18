import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// POST /api/leads/create - Criar novo lead (rota pública)
router.post('/create', async (req: Request, res: Response) => {
  try {
    const {
      nome,
      email,
      telefone,
      empresa,
      cnpj,
      cidade,
      estado,
      servico_interesse,
      mensagem,
      origem
    } = req.body;
    
    // Validações básicas
    if (!nome || !email || !telefone || !cidade || !estado || !servico_interesse) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios não preenchidos: nome, email, telefone, cidade, estado, servico_interesse' 
      });
    }
    
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }
    
    // Validar serviço de interesse
    const servicosValidos = ['recurso_multa', 'consultoria', 'gestao_frotas', 'outros'];
    if (!servicosValidos.includes(servico_interesse)) {
      return res.status(400).json({ error: 'Serviço de interesse inválido' });
    }
    
    // Validar origem
    const origensValidas = ['site', 'google', 'indicacao', 'redes_sociais', 'outros'];
    if (origem && !origensValidas.includes(origem)) {
      return res.status(400).json({ error: 'Origem inválida' });
    }
    
    // Verificar se email já existe
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, status')
      .eq('email', email)
      .single();
    
    if (existingLead) {
      // Se já existe, atualizar com novas informações
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update({
          nome,
          telefone,
          empresa,
          cnpj,
          cidade,
          estado,
          servico_interesse,
          mensagem,
          origem: origem || 'site',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      return res.json({ 
        success: true, 
        id: updatedLead.id,
        message: 'Informações atualizadas com sucesso'
      });
    }
    
    // Criar novo lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        nome,
        email,
        telefone,
        empresa,
        cnpj,
        cidade,
        estado,
        servico_interesse,
        mensagem,
        origem: origem || 'site',
        status: 'novo'
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.json({ 
      success: true, 
      id: lead.id,
      message: 'Lead criado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao criar lead:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST /api/leads/notify-admin - Notificar administrador sobre novo lead
router.post('/notify-admin', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ error: 'leadId é obrigatório' });
    }
    
    // Buscar dados do lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();
    
    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }
    
    // Aqui você pode implementar o envio de email/notificação
    // Por enquanto, apenas logamos a informação
    console.log('📧 Novo lead recebido:', {
      id: lead.id,
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone,
      empresa: lead.empresa,
      servico_interesse: lead.servico_interesse,
      cidade: `${lead.cidade}/${lead.estado}`,
      origem: lead.origem,
      mensagem: lead.mensagem
    });
    
    // TODO: Implementar envio de email para diegofilippin@hotmail.com
    // const emailContent = `
    //   Novo lead recebido!
    //   
    //   Nome: ${lead.nome}
    //   Email: ${lead.email}
    //   Telefone: ${lead.telefone}
    //   Empresa: ${lead.empresa || 'Não informado'}
    //   Cidade: ${lead.cidade}/${lead.estado}
    //   Serviço: ${lead.servico_interesse}
    //   Origem: ${lead.origem}
    //   
    //   Mensagem:
    //   ${lead.mensagem || 'Nenhuma mensagem adicional'}
    //   
    //   Acesse a plataforma para mais detalhes.
    // `;
    
    res.json({ 
      success: true,
      message: 'Notificação processada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao notificar admin:', error);
    res.status(500).json({ 
      error: 'Erro ao enviar notificação',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Aplicar autenticação nas rotas protegidas
router.use(authenticateToken);

// GET /api/leads/list - Listar leads (apenas admins)
router.get('/list', authorizeRoles(['Superadmin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      servico_interesse, 
      origem, 
      limit = '50', 
      offset = '0',
      search
    } = req.query;
    
    let query = supabase
      .from('leads')
      .select(`
        *,
        responsavel:responsavel_id(
          id,
          nome,
          email
        )
      `);
    
    // Filtros
    if (status && status !== 'todos') {
      query = query.eq('status', status);
    }
    
    if (servico_interesse) {
      query = query.eq('servico_interesse', servico_interesse);
    }
    
    if (origem) {
      query = query.eq('origem', origem);
    }
    
    // Busca por texto
    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,empresa.ilike.%${search}%`);
    }
    
    // Ordenação e paginação
    query = query
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);
    
    const { data: leads, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      data: {
        leads: leads || [],
        total: count || 0,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      }
    });
    
  } catch (error) {
    console.error('Erro ao listar leads:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/leads/:id - Buscar lead específico (apenas admins)
router.get('/:id', authorizeRoles(['Superadmin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        *,
        responsavel:responsavel_id(
          id,
          nome,
          email
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }
      throw error;
    }
    
    res.json({
      success: true,
      data: lead
    });
    
  } catch (error) {
    console.error('Erro ao buscar lead:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// PUT /api/leads/:id/status - Atualizar status do lead (apenas admins)
router.put('/:id/status', authorizeRoles(['Superadmin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, observacoes } = req.body;
    const userId = req.user?.id;
    
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }
    
    const statusValidos = ['novo', 'contatado', 'qualificado', 'convertido', 'perdido'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    // Se está sendo contatado pela primeira vez
    if (status === 'contatado') {
      updateData.data_primeiro_contato = new Date().toISOString();
      updateData.responsavel_id = userId;
    }
    
    // Sempre atualiza a data do último contato se não for 'novo'
    if (status !== 'novo') {
      updateData.data_ultimo_contato = new Date().toISOString();
      updateData.responsavel_id = userId;
    }
    
    // Adicionar observações se fornecidas
    if (observacoes) {
      updateData.observacoes = observacoes;
    }
    
    const { data: lead, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }
      throw error;
    }
    
    res.json({
      success: true,
      data: lead,
      message: 'Status atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar status do lead:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// PUT /api/leads/:id - Atualizar dados do lead (apenas admins)
router.put('/:id', authorizeRoles(['Superadmin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { observacoes, responsavel_id } = req.body;
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (observacoes !== undefined) {
      updateData.observacoes = observacoes;
    }
    
    if (responsavel_id !== undefined) {
      updateData.responsavel_id = responsavel_id;
    }
    
    const { data: lead, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }
      throw error;
    }
    
    res.json({
      success: true,
      data: lead,
      message: 'Lead atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar lead:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/leads/stats/dashboard - Estatísticas para dashboard (apenas admins)
router.get('/stats/dashboard', authorizeRoles(['Superadmin', 'admin']), async (req: Request, res: Response) => {
  try {
    // Estatísticas gerais
    const { data: totalLeads } = await supabase
      .from('leads')
      .select('id', { count: 'exact' });
    
    const { data: novosLeads } = await supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('status', 'novo');
    
    const { data: leadsConvertidos } = await supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('status', 'convertido');
    
    // Leads por serviço
    const { data: leadsPorServico } = await supabase
      .from('leads')
      .select('servico_interesse')
      .then(result => {
        if (result.error) throw result.error;
        const counts: Record<string, number> = {};
        result.data?.forEach(lead => {
          counts[lead.servico_interesse] = (counts[lead.servico_interesse] || 0) + 1;
        });
        return { data: counts, error: null };
      });
    
    // Leads dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: leadsRecentes } = await supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    res.json({
      success: true,
      data: {
        total: totalLeads?.length || 0,
        novos: novosLeads?.length || 0,
        convertidos: leadsConvertidos?.length || 0,
        recentes: leadsRecentes?.length || 0,
        porServico: leadsPorServico || {},
        taxaConversao: totalLeads?.length ? 
          ((leadsConvertidos?.length || 0) / totalLeads.length * 100).toFixed(1) : '0'
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;