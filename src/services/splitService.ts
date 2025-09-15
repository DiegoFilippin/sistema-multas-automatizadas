import { supabase } from '@/lib/supabase';
import { subaccountService } from './subaccountService';

export interface SplitConfiguration {
  id?: string;
  service_type: string;
  acsm_percentage: number;
  icetran_percentage: number;
  despachante_percentage: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentSplit {
  id?: string;
  payment_id?: string;
  recipient_type: 'acsm' | 'icetran' | 'despachante';
  recipient_company_id?: string;
  wallet_id: string;
  split_percentage: number;
  split_amount: number;
  status?: 'pending' | 'processed' | 'failed';
  asaas_split_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyHierarchy {
  despachante: {
    id: string;
    name?: string;
    wallet_id?: string;
  };
  icetran: {
    id?: string;
    name?: string;
    wallet_id?: string;
  };
  acsm: {
    wallet_id?: string;
  };
}

class SplitService {
  /**
   * Calcular splits para um pagamento com base no tipo de multa
   */
  async calculateSplits(
    paymentAmount: number,
    serviceId: string,
    multaType: string,
    despachanteCompanyId: string
  ): Promise<PaymentSplit[]> {
    try {
      // 1. Buscar configuração do serviço e empresa ICETRAN
      const serviceConfig = await this.getServiceConfiguration(serviceId);
      
      // 2. Buscar configuração de tipo de multa
      const multaConfig = await this.getMultaTypeConfiguration(serviceId, multaType);
      
      // 3. Buscar dados das empresas na hierarquia
      const hierarchy = await subaccountService.getCompanyHierarchy(despachanteCompanyId);
      
      // 4. Calcular valores dos splits baseado na configuração de multa
      const splits: PaymentSplit[] = [];
      
      // Valores fixos baseados na configuração do tipo de multa
      const acsmAmount = multaConfig.acsm_cost;
      const icetranAmount = multaConfig.icetran_cost;
      const despachanteAmount = paymentAmount - acsmAmount - icetranAmount;
      
      // Split para ACSM (valor fixo)
      if (acsmAmount > 0 && hierarchy.acsm.wallet_id) {
        splits.push({
          recipient_type: 'acsm',
          wallet_id: hierarchy.acsm.wallet_id,
          split_percentage: (acsmAmount / paymentAmount) * 100,
          split_amount: acsmAmount
        });
      }
      
      // Split para ICETRAN (empresa configurada no serviço)
      if (icetranAmount > 0 && serviceConfig.icetran_company_id) {
        const icetranWallet = await this.getCompanyWallet(serviceConfig.icetran_company_id);
        if (icetranWallet) {
          splits.push({
            recipient_type: 'icetran',
            recipient_company_id: serviceConfig.icetran_company_id,
            wallet_id: icetranWallet,
            split_percentage: (icetranAmount / paymentAmount) * 100,
            split_amount: icetranAmount
          });
        }
      }
      
      // Split para Despachante (valor restante)
      if (despachanteAmount > 0 && hierarchy.despachante.wallet_id) {
        splits.push({
          recipient_type: 'despachante',
          recipient_company_id: despachanteCompanyId,
          wallet_id: hierarchy.despachante.wallet_id,
          split_percentage: (despachanteAmount / paymentAmount) * 100,
          split_amount: despachanteAmount
        });
      }
      
      return splits;
    } catch (error) {
      console.error('Erro ao calcular splits:', error);
      throw new Error(`Falha ao calcular splits: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Calcular valor do split com precisão
   */
  private calculateSplitAmount(totalAmount: number, percentage: number): number {
    return Math.round((totalAmount * percentage / 100) * 100) / 100;
  }

  /**
   * Processar splits no sistema
   */
  async processSplits(paymentId: string, splits: PaymentSplit[]): Promise<void> {
    try {
      // 1. Salvar splits no banco
      await this.saveSplitsToDatabase(paymentId, splits);
      
      // 2. Atualizar status do pagamento
      await this.updatePaymentSplitStatus(paymentId, 'processed', splits);
      
      console.log(`Splits processados com sucesso para pagamento ${paymentId}`);
    } catch (error) {
      console.error('Erro ao processar splits:', error);
      
      // Atualizar status como falha
      await this.updatePaymentSplitStatus(paymentId, 'failed', splits);
      
      throw new Error(`Falha ao processar splits: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Buscar configuração do serviço
   */
  async getServiceConfiguration(serviceId: string): Promise<any> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar configuração do serviço: ${error.message}`);
    }

    return data;
  }

  /**
   * Buscar configuração de tipo de multa
   */
  async getMultaTypeConfiguration(serviceId: string, multaType: string): Promise<any> {
    const { data, error } = await supabase
      .from('multa_types')
      .select('*')
      .eq('service_id', serviceId)
      .eq('type', multaType)
      .single();

    if (error) {
      // Se não encontrar configuração específica, usar valores padrão
      return this.getDefaultMultaTypeConfiguration(multaType);
    }

    return data;
  }

  /**
   * Buscar wallet da empresa
   */
  async getCompanyWallet(companyId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('asaas_wallet_id')
      .eq('id', companyId)
      .single();

    if (error) {
      console.error(`Erro ao buscar wallet da empresa ${companyId}:`, error);
      return null;
    }

    return data?.asaas_wallet_id || null;
  }

  /**
   * Configuração padrão de tipo de multa
   */
  private getDefaultMultaTypeConfiguration(multaType: string): any {
    const defaultConfigs: Record<string, any> = {
      'leve': {
        type: 'leve',
        acsm_cost: 50.00,
        icetran_cost: 30.00,
        fixed_cost: 3.50
      },
      'media': {
        type: 'media',
        acsm_cost: 60.00,
        icetran_cost: 35.00,
        fixed_cost: 3.50
      },
      'grave': {
        type: 'grave',
        acsm_cost: 70.00,
        icetran_cost: 40.00,
        fixed_cost: 3.50
      },
      'gravissima': {
        type: 'gravissima',
        acsm_cost: 80.00,
        icetran_cost: 45.00,
        fixed_cost: 3.50
      }
    };

    return defaultConfigs[multaType] || defaultConfigs['leve'];
  }

  /**
   * Buscar configuração de split por tipo de serviço (método legado)
   */
  async getSplitConfiguration(serviceType: string): Promise<SplitConfiguration> {
    const { data, error } = await supabase
      .from('split_configurations')
      .select('*')
      .eq('service_type', serviceType)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Configuração não encontrada, usar padrão
        return this.getDefaultSplitConfiguration(serviceType);
      }
      throw new Error(`Erro ao buscar configuração de split: ${error.message}`);
    }

    return data;
  }

  /**
   * Configuração padrão de split
   */
  private getDefaultSplitConfiguration(serviceType: string): SplitConfiguration {
    const defaultConfigs: Record<string, SplitConfiguration> = {
      'recurso': {
        service_type: 'recurso',
        acsm_percentage: 30.00,
        icetran_percentage: 20.00,
        despachante_percentage: 50.00
      },
      'assinatura_acompanhamento': {
        service_type: 'assinatura_acompanhamento',
        acsm_percentage: 40.00,
        icetran_percentage: 15.00,
        despachante_percentage: 45.00
      }
    };

    return defaultConfigs[serviceType] || defaultConfigs['recurso'];
  }

  /**
   * Salvar splits no banco de dados
   */
  private async saveSplitsToDatabase(paymentId: string, splits: PaymentSplit[]): Promise<void> {
    const splitsToInsert = splits.map(split => ({
      payment_id: paymentId,
      recipient_type: split.recipient_type,
      recipient_company_id: split.recipient_company_id,
      wallet_id: split.wallet_id,
      split_percentage: split.split_percentage,
      split_amount: split.split_amount,
      status: 'pending'
    }));

    const { error } = await supabase
      .from('payment_splits')
      .insert(splitsToInsert);

    if (error) {
      throw new Error(`Erro ao salvar splits no banco: ${error.message}`);
    }
  }

  /**
   * Atualizar status do pagamento com informações de split
   */
  private async updatePaymentSplitStatus(
    paymentId: string, 
    status: 'pending' | 'processed' | 'failed',
    splits: PaymentSplit[]
  ): Promise<void> {
    const totalSplitAmount = splits.reduce((total, split) => total + split.split_amount, 0);

    const { error } = await supabase
      .from('asaas_payments')
      .update({
        has_split: true,
        split_status: status,
        total_split_amount: totalSplitAmount
      })
      .eq('id', paymentId);

    if (error) {
      throw new Error(`Erro ao atualizar status do pagamento: ${error.message}`);
    }
  }

  /**
   * Buscar splits de um pagamento
   */
  async getPaymentSplits(paymentId: string): Promise<PaymentSplit[]> {
    const { data, error } = await supabase
      .from('payment_splits')
      .select(`
        *,
        recipient_company:companies(
          id,
          name
        )
      `)
      .eq('payment_id', paymentId);

    if (error) {
      throw new Error(`Erro ao buscar splits do pagamento: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Listar configurações de split
   */
  async listSplitConfigurations(): Promise<SplitConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('split_configurations')
        .select('*')
        .eq('is_active', true)
        .order('service_type');

      if (error) {
        // Se a tabela não existir, retornar configurações padrão
        if (error.code === 'PGRST106' || error.message.includes('does not exist')) {
          console.warn('⚠️  Tabela split_configurations não existe. Retornando configurações padrão.');
          return [
            {
              id: '1',
              service_type: 'recurso',
              acsm_percentage: 30.00,
              icetran_percentage: 20.00,
              despachante_percentage: 50.00,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '2',
              service_type: 'assinatura_acompanhamento',
              acsm_percentage: 40.00,
              icetran_percentage: 15.00,
              despachante_percentage: 45.00,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
        }
        throw new Error(`Erro ao listar configurações de split: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao listar configurações de split:', error);
      return [];
    }
  }

  /**
   * Criar ou atualizar configuração de split
   */
  async upsertSplitConfiguration(config: Omit<SplitConfiguration, 'id' | 'created_at' | 'updated_at'>): Promise<SplitConfiguration> {
    // Validar se os percentuais somam 100%
    const total = config.acsm_percentage + config.icetran_percentage + config.despachante_percentage;
    if (Math.abs(total - 100) > 0.01) {
      throw new Error(`Os percentuais devem somar 100%. Total atual: ${total}%`);
    }

    const { data, error } = await supabase
      .from('split_configurations')
      .upsert(config, {
        onConflict: 'service_type',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao salvar configuração de split: ${error.message}`);
    }

    return data;
  }

  /**
   * Desativar configuração de split
   */
  async deactivateSplitConfiguration(configId: string): Promise<void> {
    const { error } = await supabase
      .from('split_configurations')
      .update({ is_active: false })
      .eq('id', configId);

    if (error) {
      throw new Error(`Erro ao desativar configuração de split: ${error.message}`);
    }
  }

  /**
   * Validar se splits estão corretos
   */
  validateSplits(splits: PaymentSplit[], totalAmount: number): boolean {
    const totalSplitAmount = splits.reduce((total, split) => total + split.split_amount, 0);
    const totalPercentage = splits.reduce((total, split) => total + split.split_percentage, 0);
    
    // Verificar se os valores batem (com tolerância para arredondamento)
    const amountDifference = Math.abs(totalSplitAmount - totalAmount);
    const percentageDifference = Math.abs(totalPercentage - 100);
    
    return amountDifference <= 0.02 && percentageDifference <= 0.01;
  }

  /**
   * Gerar relatório de splits por período
   */
  async generateSplitReport(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('payment_splits')
      .select(`
        *,
        asaas_payments(
          amount,
          status,
          payment_date,
          service_type
        ),
        recipient_company:companies(
          name
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('status', 'processed');

    if (error) {
      throw new Error(`Erro ao gerar relatório de splits: ${error.message}`);
    }

    // Agrupar por tipo de destinatário
    const report = {
      acsm: { count: 0, total: 0 },
      icetran: { count: 0, total: 0 },
      despachante: { count: 0, total: 0 }
    };

    data?.forEach(split => {
      if (report[split.recipient_type]) {
        report[split.recipient_type].count++;
        report[split.recipient_type].total += split.split_amount;
      }
    });

    return {
      period: { startDate, endDate },
      summary: report,
      details: data || []
    };
  }
}

export const splitService = new SplitService();
export default splitService;