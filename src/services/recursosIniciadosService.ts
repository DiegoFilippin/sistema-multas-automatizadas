/**
 * Serviço para gerenciar recursos iniciados
 * Complementa o recursosGeradosService para tracking de recursos em andamento
 */

import { supabase } from '../lib/supabase';

export interface RecursoIniciado {
  id: string;
  company_id: string;
  client_id?: string;
  multa_id?: string;
  chat_session_id?: string;
  titulo: string;
  tipo_recurso: string;
  status: string;
  numero_auto?: string;
  placa_veiculo?: string;
  codigo_infracao?: string;
  valor_multa?: number;
  nome_requerente?: string;
  cpf_cnpj_requerente?: string;
  endereco_requerente?: string;
  data_inicio: string;
  data_prazo?: string;
  data_conclusao?: string;
  observacoes?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface RecursoIniciadoInsert {
  company_id: string;
  client_id?: string;
  multa_id?: string;
  chat_session_id?: string;
  titulo: string;
  tipo_recurso: string;
  status?: string;
  numero_auto?: string;
  placa_veiculo?: string;
  codigo_infracao?: string;
  valor_multa?: number;
  nome_requerente?: string;
  cpf_cnpj_requerente?: string;
  endereco_requerente?: string;
  data_prazo?: string;
  observacoes?: string;
  metadata?: any;
}

class RecursosIniciadosService {
  /**
   * Criar um novo recurso iniciado
   */
  async criarRecursoIniciado(recursoData: RecursoIniciadoInsert): Promise<RecursoIniciado | null> {
    try {
      console.log('📝 === CRIANDO RECURSO INICIADO ===');
      console.log('📋 Dados do recurso:', recursoData);
      
      const { data, error } = await supabase
        .from('recursos')
        .insert({
          ...recursoData,
          status: recursoData.status || 'iniciado',
          data_inicio: new Date().toISOString(),
          data_protocolo: new Date().toISOString().split('T')[0], // Data atual como protocolo temporário
          fundamentacao: `Recurso iniciado automaticamente após análise do auto de infração ${recursoData.numero_auto || ''}. Aguardando desenvolvimento completo.`
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao criar recurso iniciado:', error);
        return null;
      }
      
      console.log('✅ Recurso iniciado criado:', data.id);
      return data;
      
    } catch (error: any) {
      console.error('❌ Erro no serviço de recursos iniciados:', error);
      return null;
    }
  }
  
  /**
   * Buscar recursos iniciados por empresa
   */
  async buscarRecursosIniciados(
    companyId: string, 
    status?: string,
    limit: number = 20
  ): Promise<RecursoIniciado[]> {
    try {
      let query = supabase
        .from('recursos')
        .select(`
          *,
          multas:multa_id (
            numero_auto,
            placa_veiculo,
            codigo_infracao,
            valor_original,
            orgao_autuador
          ),
          clients:client_id (
            nome,
            cpf_cnpj,
            email,
            telefone
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Erro ao buscar recursos iniciados:', error);
        return [];
      }
      
      return data || [];
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar recursos iniciados:', error);
      return [];
    }
  }
  
  /**
   * Atualizar status de um recurso
   */
  async atualizarStatusRecurso(
    recursoId: string, 
    novoStatus: string,
    observacoes?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status: novoStatus,
        updated_at: new Date().toISOString()
      };
      
      if (observacoes) {
        updateData.observacoes = observacoes;
      }
      
      if (novoStatus === 'concluido') {
        updateData.data_conclusao = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('recursos')
        .update(updateData)
        .eq('id', recursoId);
      
      if (error) {
        console.error('❌ Erro ao atualizar status do recurso:', error);
        return false;
      }
      
      console.log('✅ Status do recurso atualizado:', recursoId, novoStatus);
      return true;
      
    } catch (error: any) {
      console.error('❌ Erro ao atualizar status do recurso:', error);
      return false;
    }
  }
  
  /**
   * Buscar recurso por multa_id
   */
  async buscarRecursoPorMulta(multaId: string): Promise<RecursoIniciado | null> {
    try {
      const { data, error } = await supabase
        .from('recursos')
        .select('*')
        .eq('multa_id', multaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Nenhum registro encontrado
          return null;
        }
        console.error('❌ Erro ao buscar recurso por multa:', error);
        return null;
      }
      
      return data;
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar recurso por multa:', error);
      return null;
    }
  }
  
  /**
   * Criar recurso automaticamente após início do chat
   */
  async criarRecursoAposChat(
    multaId: string,
    chatSessionId: string,
    multaData: any,
    clienteData: any,
    companyId: string
  ): Promise<RecursoIniciado | null> {
    try {
      console.log('🚀 === CRIANDO RECURSO APÓS INÍCIO DO CHAT ===');
      console.log('📋 Dados:', { multaId, chatSessionId, companyId });
      
      // Verificar se já existe um recurso para esta multa
      const recursoExistente = await this.buscarRecursoPorMulta(multaId);
      if (recursoExistente) {
        console.log('ℹ️ Recurso já existe para esta multa:', recursoExistente.id);
        return recursoExistente;
      }
      
      // Calcular data de prazo (15 dias a partir de hoje)
      const dataPrazo = new Date();
      dataPrazo.setDate(dataPrazo.getDate() + 15);
      
      const recursoData: RecursoIniciadoInsert = {
        company_id: companyId,
        client_id: clienteData?.cliente_id || null,
        multa_id: multaId,
        chat_session_id: chatSessionId,
        titulo: `Defesa Prévia - Auto ${multaData.numero || 'N/A'}`,
        tipo_recurso: 'defesa_previa',
        status: 'iniciado',
        numero_auto: multaData.numero,
        placa_veiculo: multaData.veiculo,
        codigo_infracao: multaData.codigoInfracao,
        valor_multa: parseFloat(multaData.valor?.replace(/[^\d,]/g, '').replace(',', '.') || '0'),
        nome_requerente: clienteData?.nome || multaData.nomeProprietario,
        cpf_cnpj_requerente: clienteData?.cpf_cnpj || multaData.cpfCnpjProprietario,
        endereco_requerente: clienteData?.endereco || multaData.enderecoProprietario,
        data_prazo: dataPrazo.toISOString().split('T')[0],
        observacoes: 'Recurso iniciado automaticamente após análise com IA. Chat ativo para desenvolvimento.',
        metadata: {
          source: 'chat_n8n',
          chat_session_id: chatSessionId,
          multa_data: multaData,
          cliente_data: clienteData,
          created_by: 'sistema_automatico'
        }
      };
      
      const recursoIniciado = await this.criarRecursoIniciado(recursoData);
      
      if (recursoIniciado) {
        console.log('✅ Recurso criado após início do chat:', recursoIniciado.id);
      }
      
      return recursoIniciado;
      
    } catch (error: any) {
      console.error('❌ Erro ao criar recurso após chat:', error);
      return null;
    }
  }
  
  /**
   * Listar recursos com filtros
   */
  async listarRecursos(filtros: {
    companyId: string;
    status?: string[];
    tipo?: string[];
    dataInicio?: string;
    dataFim?: string;
    limit?: number;
  }): Promise<RecursoIniciado[]> {
    try {
      let query = supabase
        .from('recursos')
        .select(`
          *,
          multas:multa_id (
            numero_auto,
            placa_veiculo,
            codigo_infracao,
            valor_original,
            orgao_autuador,
            local_infracao
          ),
          clients:client_id (
            nome,
            cpf_cnpj,
            email,
            telefone
          )
        `)
        .eq('company_id', filtros.companyId)
        .order('created_at', { ascending: false });
      
      if (filtros.status && filtros.status.length > 0) {
        query = query.in('status', filtros.status);
      }
      
      if (filtros.tipo && filtros.tipo.length > 0) {
        query = query.in('tipo_recurso', filtros.tipo);
      }
      
      if (filtros.dataInicio) {
        query = query.gte('created_at', filtros.dataInicio);
      }
      
      if (filtros.dataFim) {
        query = query.lte('created_at', filtros.dataFim);
      }
      
      if (filtros.limit) {
        query = query.limit(filtros.limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Erro ao listar recursos:', error);
        return [];
      }
      
      return data || [];
      
    } catch (error: any) {
      console.error('❌ Erro ao listar recursos:', error);
      return [];
    }
  }
  
  /**
   * Obter estatísticas de recursos
   */
  async obterEstatisticas(companyId: string): Promise<{
    total: number;
    iniciados: number;
    em_andamento: number;
    concluidos: number;
    protocolados: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('recursos')
        .select('status')
        .eq('company_id', companyId);
      
      if (error) {
        console.error('❌ Erro ao obter estatísticas:', error);
        return { total: 0, iniciados: 0, em_andamento: 0, concluidos: 0, protocolados: 0 };
      }
      
      const stats = {
        total: data.length,
        iniciados: data.filter(r => r.status === 'iniciado').length,
        em_andamento: data.filter(r => r.status === 'em_andamento').length,
        concluidos: data.filter(r => r.status === 'concluido').length,
        protocolados: data.filter(r => r.status === 'protocolado').length
      };
      
      return stats;
      
    } catch (error: any) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return { total: 0, iniciados: 0, em_andamento: 0, concluidos: 0, protocolados: 0 };
    }
  }
}

export const recursosIniciadosService = new RecursosIniciadosService();
export default recursosIniciadosService;