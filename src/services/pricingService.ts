import { supabase } from '../lib/supabase';

// Interfaces para os diferentes tipos de preços
export interface PricingBase {
  id: string;
  resource_type: string;
  price: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingCompany {
  id: string;
  company_master_id: string;
  resource_type: string;
  markup_percentage: number;
  fixed_markup: number;
  final_price?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingDispatcher {
  id: string;
  company_id: string;
  resource_type: string;
  base_price: number;
  client_price: number;
  profit_margin?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingCalculation {
  resource_type: string;
  base_price: number;
  company_markup: number;
  company_final_price: number;
  dispatcher_cost: number;
  client_price: number;
  dispatcher_profit: number;
}

class PricingService {
  // ==================== PREÇOS BASE (Admin Master) ====================
  
  async getBasePrices(): Promise<PricingBase[]> {
    const { data, error } = await supabase
      .from('pricing_base')
      .select('*')
      .eq('is_active', true)
      .order('resource_type');

    if (error) throw error;
    return data || [];
  }

  async getBasePriceByType(resourceType: string): Promise<PricingBase | null> {
    const { data, error } = await supabase
      .from('pricing_base')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async createBasePrice(pricing: Omit<PricingBase, 'id' | 'created_at' | 'updated_at'>): Promise<PricingBase> {
    const { data, error } = await supabase
      .from('pricing_base')
      .insert(pricing)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBasePrice(id: string, updates: Partial<PricingBase>): Promise<PricingBase> {
    const { data, error } = await supabase
      .from('pricing_base')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBasePrice(id: string): Promise<void> {
    const { error } = await supabase
      .from('pricing_base')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== PREÇOS DA EMPRESA ====================
  
  async getCompanyPrices(companyMasterId: string): Promise<PricingCompany[]> {
    const { data, error } = await supabase
      .from('pricing_company')
      .select('*')
      .eq('company_master_id', companyMasterId)
      .eq('is_active', true)
      .order('resource_type');

    if (error) throw error;
    return data || [];
  }

  async getCompanyPriceByType(companyMasterId: string, resourceType: string): Promise<PricingCompany | null> {
    const { data, error } = await supabase
      .from('pricing_company')
      .select('*')
      .eq('company_master_id', companyMasterId)
      .eq('resource_type', resourceType)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async createCompanyPrice(pricing: Omit<PricingCompany, 'id' | 'created_at' | 'updated_at'>): Promise<PricingCompany> {
    // Calcular o preço final baseado no preço base + markup
    const basePrice = await this.getBasePriceByType(pricing.resource_type);
    if (!basePrice) {
      throw new Error(`Preço base não encontrado para o tipo: ${pricing.resource_type}`);
    }

    const finalPrice = this.calculateCompanyPrice(basePrice.price, pricing.markup_percentage, pricing.fixed_markup);
    
    const { data, error } = await supabase
      .from('pricing_company')
      .insert({ ...pricing, final_price: finalPrice })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCompanyPrice(id: string, updates: Partial<PricingCompany>): Promise<PricingCompany> {
    // Recalcular preço final se necessário
    if (updates.markup_percentage !== undefined || updates.fixed_markup !== undefined) {
      const current = await supabase.from('pricing_company').select('*').eq('id', id).single();
      if (current.error) throw current.error;
      
      const basePrice = await this.getBasePriceByType(current.data.resource_type);
      if (basePrice) {
        const markupPercentage = updates.markup_percentage ?? current.data.markup_percentage;
        const fixedMarkup = updates.fixed_markup ?? current.data.fixed_markup;
        updates.final_price = this.calculateCompanyPrice(basePrice.price, markupPercentage, fixedMarkup);
      }
    }

    const { data, error } = await supabase
      .from('pricing_company')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCompanyPrice(id: string): Promise<void> {
    const { error } = await supabase
      .from('pricing_company')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== PREÇOS DO DESPACHANTE ====================
  
  async getDispatcherPrices(companyId: string): Promise<PricingDispatcher[]> {
    const { data, error } = await supabase
      .from('pricing_dispatcher')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('resource_type');

    if (error) throw error;
    return data || [];
  }

  async getDispatcherPriceByType(companyId: string, resourceType: string): Promise<PricingDispatcher | null> {
    const { data, error } = await supabase
      .from('pricing_dispatcher')
      .select('*')
      .eq('company_id', companyId)
      .eq('resource_type', resourceType)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async createDispatcherPrice(pricing: Omit<PricingDispatcher, 'id' | 'created_at' | 'updated_at' | 'profit_margin'>): Promise<PricingDispatcher> {
    const { data, error } = await supabase
      .from('pricing_dispatcher')
      .insert(pricing)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateDispatcherPrice(id: string, updates: Partial<PricingDispatcher>): Promise<PricingDispatcher> {
    const { data, error } = await supabase
      .from('pricing_dispatcher')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteDispatcherPrice(id: string): Promise<void> {
    const { error } = await supabase
      .from('pricing_dispatcher')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== CÁLCULOS DE PREÇOS ====================
  
  private calculateCompanyPrice(basePrice: number, markupPercentage: number, fixedMarkup: number): number {
    const percentageMarkup = (basePrice * markupPercentage) / 100;
    return basePrice + percentageMarkup + fixedMarkup;
  }

  async calculateFullPricing(companyId: string, resourceType: string): Promise<PricingCalculation | null> {
    // Buscar preço base
    const basePrice = await this.getBasePriceByType(resourceType);
    if (!basePrice) return null;

    // Buscar configuração da empresa
    const company = await supabase.from('companies').select('company_master_id').eq('id', companyId).single();
    if (company.error) return null;

    const companyPrice = await this.getCompanyPriceByType(company.data.company_master_id, resourceType);
    if (!companyPrice) return null;

    // Buscar preço do despachante
    const dispatcherPrice = await this.getDispatcherPriceByType(companyId, resourceType);
    if (!dispatcherPrice) return null;

    return {
      resource_type: resourceType,
      base_price: basePrice.price,
      company_markup: companyPrice.markup_percentage + (companyPrice.fixed_markup || 0),
      company_final_price: companyPrice.final_price || 0,
      dispatcher_cost: dispatcherPrice.base_price,
      client_price: dispatcherPrice.client_price,
      dispatcher_profit: dispatcherPrice.client_price - dispatcherPrice.base_price
    };
  }

  async getClientPrice(companyId: string, resourceType: string): Promise<number | null> {
    const dispatcherPrice = await this.getDispatcherPriceByType(companyId, resourceType);
    return dispatcherPrice?.client_price || null;
  }

  async getDispatcherCost(companyId: string, resourceType: string): Promise<number | null> {
    const dispatcherPrice = await this.getDispatcherPriceByType(companyId, resourceType);
    return dispatcherPrice?.base_price || null;
  }

  // ==================== SINCRONIZAÇÃO DE PREÇOS ====================
  
  async syncCompanyPricesWithBase(companyMasterId: string): Promise<void> {
    const basePrices = await this.getBasePrices();
    const companyPrices = await this.getCompanyPrices(companyMasterId);
    
    for (const basePrice of basePrices) {
      const existingCompanyPrice = companyPrices.find(cp => cp.resource_type === basePrice.resource_type);
      
      if (existingCompanyPrice) {
        // Atualizar preço final baseado no preço base atual
        const newFinalPrice = this.calculateCompanyPrice(
          basePrice.price,
          existingCompanyPrice.markup_percentage,
          existingCompanyPrice.fixed_markup
        );
        
        await this.updateCompanyPrice(existingCompanyPrice.id, {
          final_price: newFinalPrice
        });
      } else {
        // Criar novo preço da empresa com markup padrão de 0%
        await this.createCompanyPrice({
          company_master_id: companyMasterId,
          resource_type: basePrice.resource_type,
          markup_percentage: 0,
          fixed_markup: 0,
          is_active: true
        });
      }
    }
  }

  async syncDispatcherPricesWithCompany(companyId: string): Promise<void> {
    const company = await supabase.from('companies').select('company_master_id').eq('id', companyId).single();
    if (company.error) throw company.error;

    const companyPrices = await this.getCompanyPrices(company.data.company_master_id);
    const dispatcherPrices = await this.getDispatcherPrices(companyId);
    
    for (const companyPrice of companyPrices) {
      const existingDispatcherPrice = dispatcherPrices.find(dp => dp.resource_type === companyPrice.resource_type);
      
      if (existingDispatcherPrice) {
        // Atualizar preço base do despachante
        await this.updateDispatcherPrice(existingDispatcherPrice.id, {
          base_price: companyPrice.final_price || 0
        });
      } else {
        // Criar novo preço do despachante
        await this.createDispatcherPrice({
          company_id: companyId,
          resource_type: companyPrice.resource_type,
          base_price: companyPrice.final_price || 0,
          client_price: companyPrice.final_price || 0, // Inicialmente sem margem
          is_active: true
        });
      }
    }
  }

  // ==================== RELATÓRIOS ====================
  
  async getPricingReport(companyMasterId?: string): Promise<any[]> {
    let query = supabase
      .from('pricing_base')
      .select(`
        *,
        pricing_company!inner(
          company_master_id,
          markup_percentage,
          fixed_markup,
          final_price,
          companies_master(name)
        )
      `);

    if (companyMasterId) {
      query = query.eq('pricing_company.company_master_id', companyMasterId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Calculate resource price based on multa type (new system)
   */
  async calculateMultaTypePrice(
    multaType: 'leve' | 'media' | 'grave' | 'gravissima'
  ): Promise<number> {
    try {
      const { data: multaTypeData, error } = await supabase
        .from('multa_types')
        .select('total_price')
        .eq('type', multaType)
        .eq('active', true)
        .single();

      if (error || !multaTypeData) {
        throw new Error(`Price not found for multa type: ${multaType}`);
      }

      return multaTypeData.total_price;
    } catch (error) {
      console.error('Error calculating multa type price:', error);
      throw error;
    }
  }

  /**
   * Calculate resource price for a specific company and dispatcher (legacy system)
   */
  async calculateResourcePrice(
    resourceType: string,
    companyId: string,
    dispatcherId?: string
  ): Promise<number> {
    try {
      // Get base price
      const { data: basePrice } = await supabase
        .from('pricing_base')
        .select('price')
        .eq('resource_type', resourceType)
        .eq('is_active', true)
        .single();

      if (!basePrice) {
        throw new Error(`Base price not found for resource type: ${resourceType}`);
      }

      let finalPrice = basePrice.price;

      // Apply company markup if exists
      const { data: companyPrice } = await supabase
        .from('pricing_company')
        .select('price')
        .eq('resource_type', resourceType)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();

      if (companyPrice) {
        finalPrice = companyPrice.price;
      }

      // Apply dispatcher markup if exists
      if (dispatcherId) {
        const { data: dispatcherPrice } = await supabase
          .from('pricing_dispatcher')
          .select('price')
          .eq('resource_type', resourceType)
          .eq('dispatcher_id', dispatcherId)
          .eq('is_active', true)
          .single();

        if (dispatcherPrice) {
          finalPrice = dispatcherPrice.price;
        }
      }

      return finalPrice;
    } catch (error) {
      console.error('Error calculating resource price:', error);
      throw error;
    }
  }
}

export const pricingService = new PricingService();
export default pricingService;