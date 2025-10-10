import { supabase } from '../lib/supabase'

// Tipo genérico para service_orders
type ServiceOrder = any

export interface ServiceOrderFilters {
  companyId?: string
  status?: string
  all?: boolean
}

export interface ServiceOrdersResponse {
  success: boolean
  payments: any[]
  total: number
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

class ServiceOrdersService {
  async getServiceOrders(filters?: ServiceOrderFilters): Promise<ServiceOrdersResponse> {
    try {
      console.log('🔍 Buscando service_orders diretamente no Supabase...');
      
      let query = supabase
        .from('service_orders')
        .select(`
          *,
          clients!inner(id, nome, cpf_cnpj, email)
        `)
        .order('created_at', { ascending: false })
        .limit(filters?.all ? 100 : 50);
      
      // Filtrar por empresa se especificado
      if (filters?.companyId && filters.companyId !== 'all') {
        query = query.eq('company_id', filters.companyId);
      }
      
      const { data: serviceOrders, error } = await query;
      
      if (error) {
        console.error('❌ Erro ao buscar service_orders:', error);
        throw new Error(`Erro ao buscar service_orders: ${error.message}`);
      }
      
      // Formatar dados para compatibilidade com a interface existente
      const formattedPayments = (serviceOrders || []).map(order => ({
        id: order.id,
        payment_id: order.id,
        client_name: order.clients?.nome || order.client_name || order.customer_name || 'Cliente',
        customer_name: order.clients?.nome || order.client_name || order.customer_name || 'Cliente',
        client_cpf: order.clients?.cpf_cnpj || '',
        client_email: order.clients?.email || '',
        company_id: order.company_id,
        amount: order.amount,
        status: order.status,
        created_at: order.created_at,
        paid_at: order.paid_at,
        due_date: order.due_date,
        description: order.description || 'Recurso de Multa',
        payment_method: order.billing_type || 'PIX',
        asaas_payment_id: order.asaas_payment_id,
        invoice_url: order.invoice_url,
        pix_qr_code: order.qr_code_image || order.qr_code,
        pix_copy_paste: order.pix_payload || order.pix_copy_paste,
        source: 'service_order'
      }));
      
      console.log('✅ Service orders encontrados:', formattedPayments.length);
      
      return {
        success: true,
        payments: formattedPayments,
        total: formattedPayments.length,
        pagination: {
          page: 1,
          limit: filters?.all ? 100 : 50,
          total: formattedPayments.length,
          hasMore: false
        }
      };
      
    } catch (error: any) {
      console.error('❌ Erro no ServiceOrdersService:', error);
      throw error;
    }
  }
}

export const serviceOrdersService = new ServiceOrdersService();