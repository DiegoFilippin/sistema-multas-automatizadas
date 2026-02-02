import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

export interface RecursoDraft {
  id: string;
  company_id: string;
  client_id: string | null;
  service_id: string | null;
  status: 'rascunho' | 'aguardando_pagamento' | 'em_preenchimento' | 'em_analise' | 'concluido' | 'cancelado' | 'expirado';
  current_step: number;
  wizard_data: {
    step1?: {
      cliente_id?: string;
      cliente_nome?: string;
      cliente_cpf_cnpj?: string;
      cliente_email?: string;
    };
    step2?: {
      servico_id?: string;
      servico_nome?: string;
      servico_preco?: number;
      servico_tipo?: string;
    };
    step3?: {
      payment_method?: 'prepaid' | 'charge';
    };
  };
  payment_method: 'prepaid' | 'charge' | null;
  service_order_id: string | null;
  created_at: string;
  updated_at: string;
  last_saved_at: string;
}

export interface CreateDraftParams {
  client_id?: string;
  service_id?: string;
  multa_type?: string;
  amount?: number;
}

export function useRecursoDraft() {
  const { user } = useAuthStore();
  const [currentDraft, setCurrentDraft] = useState<RecursoDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Criar novo rascunho
   */
  const createDraft = useCallback(async (params?: CreateDraftParams): Promise<RecursoDraft | null> => {
    if (!user?.company_id) {
      console.error('❌ Company ID não disponível');
      toast.error('Erro ao criar rascunho');
      return null;
    }

    try {
      setIsLoading(true);
      console.log('📝 Criando novo rascunho...', params);

      const draftData = {
        company_id: user.company_id,
        client_id: params?.client_id || null,
        service_id: params?.service_id || null,
        status: 'rascunho',
        current_step: 1,
        wizard_data: {},
        multa_type: params?.multa_type || 'grave',
        amount: params?.amount || 1, // Valor mínimo para satisfazer constraint
      };

      const { data, error } = await supabase
        .from('service_orders')
        .insert(draftData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar rascunho:', error);
        throw error;
      }

      console.log('✅ Rascunho criado:', data.id);
      setCurrentDraft(data);
      return data;
    } catch (error: any) {
      console.error('❌ Erro ao criar rascunho:', error);
      toast.error('Erro ao criar rascunho');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id]);

  /**
   * Salvar progresso do rascunho
   */
  const saveDraft = useCallback(async (
    draftId: string,
    step: number,
    stepData: any
  ): Promise<boolean> => {
    if (!draftId) {
      console.error('❌ Draft ID não fornecido');
      return false;
    }

    try {
      setIsSaving(true);
      console.log(`💾 Salvando rascunho ${draftId} - Step ${step}...`);

      // Buscar wizard_data atual
      const { data: current, error: fetchError } = await supabase
        .from('service_orders')
        .select('wizard_data')
        .eq('id', draftId)
        .single();

      if (fetchError) {
        console.error('❌ Erro ao buscar rascunho:', fetchError);
        throw fetchError;
      }

      // Mesclar dados do step atual com dados existentes
      const existingWizardData = current?.wizard_data || {};
      const updatedWizardData = {
        ...existingWizardData,
        ...stepData, // Mescla os novos dados (step1, step2, step3)
      };

      console.log('📦 Wizard data atualizado:', updatedWizardData);

      // Preparar campos para atualizar
      const updateData: any = {
        current_step: step,
        wizard_data: updatedWizardData,
        last_saved_at: new Date().toISOString(),
      };

      // Atualizar client_id se step1 tiver cliente_id
      if (updatedWizardData.step1?.cliente_id) {
        updateData.client_id = updatedWizardData.step1.cliente_id;
      }

      // Atualizar service_id, amount e multa_type se step2 tiver servico_id
      if (updatedWizardData.step2?.servico_id) {
        updateData.service_id = updatedWizardData.step2.servico_id;
        updateData.amount = updatedWizardData.step2.servico_preco || 0;
        updateData.multa_type = updatedWizardData.step2.servico_tipo || 'grave';
      }

      // Atualizar payment_method se step3 tiver
      if (updatedWizardData.step3?.payment_method) {
        updateData.payment_method = updatedWizardData.step3.payment_method;
      }

      console.log('📝 Dados a atualizar:', updateData);

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('service_orders')
        .update(updateData)
        .eq('id', draftId);

      if (updateError) {
        console.error('❌ Erro ao salvar rascunho:', updateError);
        throw updateError;
      }

      console.log('✅ Rascunho salvo com sucesso');
      
      // Atualizar estado local
      if (currentDraft?.id === draftId) {
        setCurrentDraft({
          ...currentDraft,
          current_step: step,
          wizard_data: updatedWizardData,
          last_saved_at: new Date().toISOString(),
        });
      }

      return true;
    } catch (error: any) {
      console.error('❌ Erro ao salvar rascunho:', error);
      toast.error('Erro ao salvar progresso');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [currentDraft]);

  /**
   * Carregar rascunho existente
   */
  const loadDraft = useCallback(async (draftId: string): Promise<RecursoDraft | null> => {
    if (!draftId) {
      console.error('❌ Draft ID não fornecido');
      return null;
    }

    try {
      setIsLoading(true);
      console.log(`📂 Carregando rascunho ${draftId}...`);

      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', draftId)
        .single();

      if (error) {
        console.error('❌ Erro ao carregar rascunho:', error);
        throw error;
      }

      console.log('✅ Rascunho carregado:', data);
      setCurrentDraft(data);
      return data;
    } catch (error: any) {
      console.error('❌ Erro ao carregar rascunho:', error);
      toast.error('Erro ao carregar rascunho');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Listar rascunhos do usuário
   */
  const listDrafts = useCallback(async (filters?: {
    status?: string[];
    limit?: number;
  }): Promise<RecursoDraft[]> => {
    if (!user?.company_id) {
      console.error('❌ Company ID não disponível');
      return [];
    }

    try {
      setIsLoading(true);
      console.log('📋 Listando rascunhos...', filters);

      let query = supabase
        .from('service_orders')
        .select('*')
        .eq('company_id', user.company_id)
        .order('last_saved_at', { ascending: false });

      // Aplicar filtros
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao listar rascunhos:', error);
        throw error;
      }

      console.log(`✅ ${data?.length || 0} rascunhos encontrados`);
      return data || [];
    } catch (error: any) {
      console.error('❌ Erro ao listar rascunhos:', error);
      toast.error('Erro ao carregar rascunhos');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id]);

  /**
   * Excluir rascunho (marca como cancelado)
   */
  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    if (!draftId) {
      console.error('❌ Draft ID não fornecido');
      return false;
    }

    try {
      setIsLoading(true);
      console.log(`🗑️ Excluindo rascunho ${draftId}...`);

      const { error } = await supabase
        .from('service_orders')
        .update({ status: 'cancelado' })
        .eq('id', draftId);

      if (error) {
        console.error('❌ Erro ao excluir rascunho:', error);
        throw error;
      }

      console.log('✅ Rascunho excluído');
      toast.success('Rascunho excluído');

      // Limpar estado local se for o rascunho atual
      if (currentDraft?.id === draftId) {
        setCurrentDraft(null);
      }

      return true;
    } catch (error: any) {
      console.error('❌ Erro ao excluir rascunho:', error);
      toast.error('Erro ao excluir rascunho');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentDraft]);

  /**
   * Atualizar status do rascunho
   */
  const updateStatus = useCallback(async (
    draftId: string,
    status: RecursoDraft['status'],
    additionalData?: Partial<RecursoDraft>
  ): Promise<boolean> => {
    if (!draftId) {
      console.error('❌ Draft ID não fornecido');
      return false;
    }

    try {
      console.log(`🔄 Atualizando status do rascunho ${draftId} para ${status}...`);

      const { error } = await supabase
        .from('service_orders')
        .update({
          status,
          ...additionalData,
        })
        .eq('id', draftId);

      if (error) {
        console.error('❌ Erro ao atualizar status:', error);
        throw error;
      }

      console.log('✅ Status atualizado');

      // Atualizar estado local
      if (currentDraft?.id === draftId) {
        setCurrentDraft({
          ...currentDraft,
          status,
          ...additionalData,
        } as RecursoDraft);
      }

      return true;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar status:', error);
      return false;
    }
  }, [currentDraft]);

  /**
   * Limpar rascunho atual
   */
  const clearDraft = useCallback(() => {
    setCurrentDraft(null);
  }, []);

  return {
    // Estado
    currentDraft,
    isSaving,
    isLoading,

    // Métodos
    createDraft,
    saveDraft,
    loadDraft,
    listDrafts,
    deleteDraft,
    updateStatus,
    clearDraft,
  };
}
