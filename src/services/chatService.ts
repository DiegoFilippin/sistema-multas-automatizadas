import { supabase } from '../lib/supabase';

export interface ChatSession {
  id: string;
  company_id: string;
  user_id: string;
  multa_id?: string;
  session_id: string;
  webhook_url: string;
  webhook_payload: any;
  status: 'active' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface ChatMessage {
  id: string;
  chat_session_id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  created_at: string;
}

export interface RecursoGerado {
  id: string;
  company_id: string;
  user_id: string;
  multa_id?: string;
  chat_session_id?: string;
  recurso_id?: string;
  titulo: string;
  conteudo_recurso: string;
  fundamentacao_legal?: string;
  argumentos_principais?: string[];
  tipo_recurso: string;
  status: 'gerado' | 'revisado' | 'aprovado' | 'protocolado' | 'rejeitado';
  metadata?: any;
  versao: number;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  approved_by?: string;
}

class ChatService {
  // Criar nova sessão de chat
  async createSession(data: {
    sessionId: string;
    webhookUrl: string;
    webhookPayload: any;
    multaId?: string;
    companyId: string;
    userId: string;
  }): Promise<ChatSession> {
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        session_id: data.sessionId,
        webhook_url: data.webhookUrl,
        webhook_payload: data.webhookPayload,
        multa_id: data.multaId,
        company_id: data.companyId,
        user_id: data.userId,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar sessão de chat:', error);
      throw new Error(`Erro ao criar sessão de chat: ${error.message}`);
    }

    return session;
  }

  // Buscar sessão por ID
  async getSession(sessionId: string): Promise<ChatSession | null> {
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Sessão não encontrada
      }
      console.error('Erro ao buscar sessão:', error);
      throw new Error(`Erro ao buscar sessão: ${error.message}`);
    }

    return session;
  }

  // Atualizar status da sessão
  async updateSessionStatus(sessionId: string, status: ChatSession['status']): Promise<void> {
    const updateData: any = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('chat_sessions')
      .update(updateData)
      .eq('session_id', sessionId);

    if (error) {
      console.error('Erro ao atualizar status da sessão:', error);
      throw new Error(`Erro ao atualizar status da sessão: ${error.message}`);
    }
  }

  // Adicionar mensagem ao chat
  async addMessage(data: {
    chatSessionId: string;
    messageType: ChatMessage['message_type'];
    content: string;
    metadata?: any;
  }): Promise<ChatMessage> {
    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({
        chat_session_id: data.chatSessionId,
        message_type: data.messageType,
        content: data.content,
        metadata: data.metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar mensagem:', error);
      throw new Error(`Erro ao adicionar mensagem: ${error.message}`);
    }

    return message;
  }

  // Buscar mensagens de uma sessão
  async getMessages(chatSessionId: string): Promise<ChatMessage[]> {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_session_id', chatSessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      throw new Error(`Erro ao buscar mensagens: ${error.message}`);
    }

    return messages || [];
  }

  // Criar recurso gerado
  async createRecursoGerado(data: {
    titulo: string;
    conteudoRecurso: string;
    fundamentacaoLegal?: string;
    argumentosPrincipais?: string[];
    tipoRecurso: string;
    chatSessionId?: string;
    multaId?: string;
    companyId: string;
    userId: string;
    metadata?: any;
  }): Promise<RecursoGerado> {
    const { data: recurso, error } = await supabase
      .from('recursos_gerados')
      .insert({
        titulo: data.titulo,
        conteudo_recurso: data.conteudoRecurso,
        fundamentacao_legal: data.fundamentacaoLegal,
        argumentos_principais: data.argumentosPrincipais,
        tipo_recurso: data.tipoRecurso,
        chat_session_id: data.chatSessionId,
        multa_id: data.multaId,
        company_id: data.companyId,
        user_id: data.userId,
        metadata: data.metadata,
        status: 'gerado'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar recurso gerado:', error);
      throw new Error(`Erro ao criar recurso gerado: ${error.message}`);
    }

    return recurso;
  }

  // Buscar recursos gerados por sessão
  async getRecursosBySessao(chatSessionId: string): Promise<RecursoGerado[]> {
    const { data: recursos, error } = await supabase
      .from('recursos_gerados')
      .select('*')
      .eq('chat_session_id', chatSessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar recursos gerados:', error);
      throw new Error(`Erro ao buscar recursos gerados: ${error.message}`);
    }

    return recursos || [];
  }

  // Atualizar recurso gerado
  async updateRecursoGerado(id: string, data: {
    conteudoRecurso?: string;
    fundamentacaoLegal?: string;
    argumentosPrincipais?: string[];
    status?: RecursoGerado['status'];
    metadata?: any;
  }): Promise<RecursoGerado> {
    const updateData: any = {};
    
    if (data.conteudoRecurso !== undefined) updateData.conteudo_recurso = data.conteudoRecurso;
    if (data.fundamentacaoLegal !== undefined) updateData.fundamentacao_legal = data.fundamentacaoLegal;
    if (data.argumentosPrincipais !== undefined) updateData.argumentos_principais = data.argumentosPrincipais;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const { data: recurso, error } = await supabase
      .from('recursos_gerados')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar recurso gerado:', error);
      throw new Error(`Erro ao atualizar recurso gerado: ${error.message}`);
    }

    return recurso;
  }

  // Buscar sessões por empresa
  async getSessionsByCompany(companyId: string, limit: number = 50): Promise<ChatSession[]> {
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar sessões da empresa:', error);
      throw new Error(`Erro ao buscar sessões da empresa: ${error.message}`);
    }

    return sessions || [];
  }

  // Buscar recursos gerados por empresa
  async getRecursosByCompany(companyId: string, limit: number = 50): Promise<RecursoGerado[]> {
    const { data: recursos, error } = await supabase
      .from('recursos_gerados')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar recursos da empresa:', error);
      throw new Error(`Erro ao buscar recursos da empresa: ${error.message}`);
    }

    return recursos || [];
  }
}

export const chatService = new ChatService();
export default chatService;