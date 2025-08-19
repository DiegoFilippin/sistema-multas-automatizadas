import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'
import { billingService, type BillingData, type PaymentResult } from './billingService'
import jsPDF from 'jspdf'

type Recurso = Database['public']['Tables']['recursos']['Row']
type RecursoInsert = Database['public']['Tables']['recursos']['Insert']
type RecursoUpdate = Database['public']['Tables']['recursos']['Update']

export interface RecursoFilters {
  companyId?: string
  clientId?: string
  multaId?: string
  status?: string
  type?: string
  startDate?: string
  endDate?: string
}

export interface RecursoStats {
  total: number
  emAnalise: number
  deferidos: number
  indeferidos: number
  pendentesDocumentos: number
  taxaSucesso: number
}

class RecursosService {
  async getRecursos(filters: RecursoFilters = {}): Promise<Recurso[]> {
    try {
      let query = supabase
        .from('recursos')
        .select(`
          *,
          multas!inner(
            id,
            numero_auto,
            placa_veiculo,
            descricao_infracao,
            valor_original,
            data_infracao,
            client_id,
            clients!inner(
              nome,
              cpf_cnpj
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (filters.companyId) {
        query = query.eq('company_id', filters.companyId)
      }

      if (filters.clientId) {
        query = query.eq('multas.client_id', filters.clientId)
      }

      if (filters.multaId) {
        query = query.eq('multa_id', filters.multaId)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.type) {
        query = query.eq('type', filters.type)
      }

      if (filters.startDate) {
        query = query.gte('submission_date', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('submission_date', filters.endDate)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (error) {
      throw new Error(`Failed to fetch recursos: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getRecursoById(id: string): Promise<Recurso | null> {
    try {
      const { data, error } = await supabase
        .from('recursos')
        .select(`
          *,
          multas!inner(
            numero_auto,
            placa_veiculo,
            descricao_infracao,
            valor_original,
            data_infracao,
            data_vencimento,
            clients!inner(nome, cpf_cnpj, email, telefone)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to fetch recurso: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async createRecurso(recurso: RecursoInsert): Promise<Recurso> {
    try {
      const { data, error } = await supabase
        .from('recursos')
        .insert(recurso)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Update multa status to 'em_recurso'
      await supabase
        .from('multas')
        .update({ 
          status: 'em_recurso',
          updated_at: new Date().toISOString()
        })
        .eq('id', recurso.multa_id)

      return data
    } catch (error) {
      throw new Error(`Failed to create recurso: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Cria recurso com cobrança integrada
   */
  async createRecursoWithBilling(recurso: RecursoInsert, billingData: BillingData): Promise<{ recurso: Recurso; payment: PaymentResult }> {
    try {
      // 1. Verificar se já existe pagamento para esta multa
      const existingPayment = await billingService.getTransactionByMultaId(recurso.multa_id);
      
      if (existingPayment && (existingPayment.status === 'confirmed' || existingPayment.status === 'received')) {
        // Se já foi pago, criar recurso diretamente
        const createdRecurso = await this.createRecurso(recurso);
        return {
          recurso: createdRecurso,
          payment: {
            payment_id: existingPayment.asaas_payment_id,
            invoice_url: existingPayment.invoice_url,
            bank_slip_url: existingPayment.bank_slip_url,
            pix_qr_code: existingPayment.pix_qr_code,
            pix_copy_paste: existingPayment.pix_copy_paste,
            amount: existingPayment.amount,
            due_date: existingPayment.due_date,
            status: existingPayment.status as 'pending' | 'confirmed' | 'received'
          }
        };
      }

      // 2. Criar cobrança
      const payment = await billingService.createResourceBilling(billingData);

      // 3. Criar recurso com status 'aguardando_pagamento'
      const recursoWithPayment = {
        ...recurso,
        status: 'aguardando_pagamento' as const
      };

      const createdRecurso = await this.createRecurso(recursoWithPayment);

      return {
        recurso: createdRecurso,
        payment
      };
    } catch (error) {
      throw new Error(`Failed to create recurso with billing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirma pagamento e ativa recurso
   */
  async confirmPaymentAndActivateRecurso(multaId: string): Promise<Recurso | null> {
    try {
      // Verificar se pagamento foi confirmado
      const isPaymentConfirmed = await billingService.isPaymentConfirmed(multaId);
      
      if (!isPaymentConfirmed) {
        throw new Error('Pagamento não confirmado');
      }

      // Buscar recurso da multa
      const { data: recursos, error } = await supabase
        .from('recursos')
        .select('*')
        .eq('multa_id', multaId)
        .eq('status', 'aguardando_pagamento');

      if (error) {
        throw new Error(error.message);
      }

      if (!recursos || recursos.length === 0) {
        return null;
      }

      const recurso = recursos[0];

      // Atualizar status do recurso para 'em_analise'
      const updatedRecurso = await this.updateRecurso(recurso.id, {
        status: 'em_analise'
      });

      return updatedRecurso;
    } catch (error) {
      console.error('Erro ao confirmar pagamento e ativar recurso:', error);
      throw error;
    }
  }

  async updateRecurso(id: string, updates: RecursoUpdate): Promise<Recurso> {
    try {
      const { data, error } = await supabase
        .from('recursos')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to update recurso: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteRecurso(id: string): Promise<void> {
    try {
      // Get recurso to find associated multa
      const { data: recurso, error: fetchError } = await supabase
        .from('recursos')
        .select('multa_id')
        .eq('id', id)
        .single()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      // Delete recurso
      const { error } = await supabase
        .from('recursos')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(error.message)
      }

      // Update multa status back to 'pendente'
      await supabase
        .from('multas')
        .update({ 
          status: 'pendente',
          updated_at: new Date().toISOString()
        })
        .eq('id', recurso.multa_id)
    } catch (error) {
      throw new Error(`Failed to delete recurso: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getRecursoStats(companyId: string): Promise<RecursoStats> {
    try {
      const { data, error } = await supabase
        .from('recursos')
        .select('status')
        .eq('company_id', companyId)

      if (error) {
        throw new Error(error.message)
      }

      const stats: RecursoStats = {
        total: data.length,
        emAnalise: 0,
        deferidos: 0,
        indeferidos: 0,
        pendentesDocumentos: 0,
        taxaSucesso: 0,
      }

      data.forEach(recurso => {
        switch (recurso.status) {
          case 'em_analise':
            stats.emAnalise++
            break
          case 'deferido':
            stats.deferidos++
            break
          case 'indeferido':
            stats.indeferidos++
            break
          case 'protocolado':
            stats.pendentesDocumentos++
            break
        }
      })

      const totalFinalizados = stats.deferidos + stats.indeferidos
      stats.taxaSucesso = totalFinalizados > 0 ? Math.round((stats.deferidos / totalFinalizados) * 100) : 0

      return stats
    } catch (error) {
      throw new Error(`Failed to fetch recurso stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getRecursosByType(companyId: string): Promise<{ type: string; count: number; successRate: number }[]> {
    try {
      const { data, error } = await supabase
        .from('recursos')
        .select('tipo_recurso, status')
        .eq('company_id', companyId)

      if (error) {
        throw new Error(error.message)
      }

      const groupedData = data.reduce((acc, recurso) => {
        const type = recurso.tipo_recurso
        if (!acc[type]) {
          acc[type] = { count: 0, deferidos: 0, indeferidos: 0 }
        }
        acc[type].count++
        
        if (recurso.status === 'deferido') {
          acc[type].deferidos++
        } else if (recurso.status === 'indeferido') {
          acc[type].indeferidos++
        }
        
        return acc
      }, {} as Record<string, { count: number; deferidos: number; indeferidos: number }>)

      return Object.entries(groupedData).map(([type, typeData]) => {
        const typedData = typeData as { count: number; deferidos: number; indeferidos: number }
        const totalFinalizados = typedData.deferidos + typedData.indeferidos
        const successRate = totalFinalizados > 0 ? Math.round((typedData.deferidos / totalFinalizados) * 100) : 0
        
        return {
          type,
          count: typedData.count,
          successRate,
        }
      })
    } catch (error) {
      throw new Error(`Failed to fetch recursos by type: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updateRecursoStatus(id: string, status: string, responseText?: string): Promise<Recurso> {
    try {
      const updates: RecursoUpdate = {
        status: status as any,
        updated_at: new Date().toISOString(),
      }

      if (responseText) {
        updates.resposta_orgao = responseText
        updates.data_resposta = new Date().toISOString().split('T')[0]
      }

      const { data, error } = await supabase
        .from('recursos')
        .update(updates)
        .eq('id', id)
        .select('*, multas!inner(id)')
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Update associated multa status based on recurso result
      let multaStatus = 'pendente'
      if (status === 'deferido') {
        multaStatus = 'recurso_deferido'
      } else if (status === 'indeferido') {
        multaStatus = 'recurso_indeferido'
      }

      if (status === 'deferido' || status === 'indeferido') {
        await supabase
          .from('multas')
          .update({ 
            status: multaStatus as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.multa_id)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to update recurso status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async duplicateRecurso(id: string): Promise<Recurso> {
    try {
      // Get original recurso
      const { data: original, error: fetchError } = await supabase
        .from('recursos')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      // Create new recurso with modified data
      const newRecurso: RecursoInsert = {
        company_id: original.company_id,
        multa_id: original.multa_id,
        numero_processo: `${original.numero_processo || 'REC'}-COPY-${Date.now()}`,
        data_protocolo: new Date().toISOString().split('T')[0],
        status: 'em_analise',
        tipo_recurso: original.tipo_recurso,
        fundamentacao: original.fundamentacao,
        documentos_anexos: original.documentos_anexos,
      }

      const { data, error } = await supabase
        .from('recursos')
        .insert(newRecurso)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to duplicate recurso: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async submitRecurso(id: string): Promise<Recurso> {
    try {
      const { data, error } = await supabase
        .from('recursos')
        .update({
          status: 'em_analise',
          data_protocolo: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to submit recurso: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async downloadRecursoPDF(id: string): Promise<void> {
    try {
      // Buscar dados completos do recurso
      const recurso = await this.getRecursoById(id)
      if (!recurso) {
        throw new Error('Recurso não encontrado')
      }

      // Criar novo documento PDF
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.width
      const margin = 20
      let yPosition = 30

      // Função auxiliar para adicionar texto com quebra de linha
      const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
        doc.setFontSize(fontSize)
        if (isBold) {
          doc.setFont('helvetica', 'bold')
        } else {
          doc.setFont('helvetica', 'normal')
        }
        
        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin)
        doc.text(lines, margin, yPosition)
        yPosition += lines.length * (fontSize * 0.4) + 5
        
        // Verificar se precisa de nova página
        if (yPosition > doc.internal.pageSize.height - 30) {
          doc.addPage()
          yPosition = 30
        }
      }

      // Cabeçalho do documento
      addText('RECURSO DE MULTA DE TRÂNSITO', 16, true)
      yPosition += 10

      // Dados do órgão destinatário
      addText('AO ÓRGÃO AUTUADOR COMPETENTE', 14, true)
      yPosition += 5

      // Buscar dados da multa separadamente
      const { data: multaData, error: multaError } = await supabase
        .from('multas')
        .select(`
          *,
          clients!inner(nome, cpf_cnpj, email, telefone)
        `)
        .eq('id', recurso.multa_id)
        .single()

      if (multaError) {
        console.warn('Erro ao buscar dados da multa:', multaError)
      }

      const multa = multaData
      const cliente = multa?.clients
      
      if (cliente) {
        addText('DADOS DO REQUERENTE:', 12, true)
        addText(`Nome: ${cliente.nome || 'Não informado'}`)
        addText(`CPF/CNPJ: ${cliente.cpf_cnpj || 'Não informado'}`)
        addText(`Email: ${cliente.email || 'Não informado'}`)
        addText(`Telefone: ${cliente.telefone || 'Não informado'}`)
        yPosition += 10
      }

      // Dados da multa
      if (multa) {
        addText('DADOS DA AUTUAÇÃO:', 12, true)
        addText(`Número do Auto: ${multa.numero_auto || 'Não informado'}`)
        addText(`Placa do Veículo: ${multa.placa_veiculo || 'Não informado'}`)
        addText(`Data da Infração: ${multa.data_infracao ? new Date(multa.data_infracao).toLocaleDateString('pt-BR') : 'Não informado'}`)
        addText(`Valor: R$ ${multa.valor_original ? multa.valor_original.toFixed(2) : '0,00'}`)
        addText(`Descrição da Infração: ${multa.descricao_infracao || 'Não informado'}`)
        yPosition += 10
      }

      // Dados do recurso
      addText('DADOS DO RECURSO:', 12, true)
      addText(`Número do Processo: ${recurso.numero_processo || 'Não informado'}`)
      addText(`Tipo de Recurso: ${recurso.tipo_recurso || 'Não informado'}`)
      addText(`Data de Criação: ${recurso.created_at ? new Date(recurso.created_at).toLocaleDateString('pt-BR') : 'Não informado'}`)
      if (recurso.data_protocolo) {
        addText(`Data de Protocolo: ${new Date(recurso.data_protocolo).toLocaleDateString('pt-BR')}`)
      }
      yPosition += 10

      // Fundamentação
      if (recurso.fundamentacao) {
        addText('FUNDAMENTAÇÃO LEGAL E ARGUMENTAÇÃO:', 12, true)
        addText(recurso.fundamentacao)
        yPosition += 10
      }

      // Pedido
      addText('PEDIDO:', 12, true)
      addText('Diante do exposto, requer-se o deferimento do presente recurso, com o consequente cancelamento da autuação em questão, por estar eivada de vícios que a tornam nula de pleno direito.')
      yPosition += 15

      // Local e data
      const hoje = new Date().toLocaleDateString('pt-BR')
      addText(`Local e Data: _________________, ${hoje}`)
      yPosition += 20

      // Assinatura
      addText('_________________________________')
      addText(cliente?.nome || 'Requerente')
      addText('Assinatura do Requerente')

      // Salvar o PDF
      const fileName = `recurso_${recurso.numero_processo || recurso.id}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (error) {
      throw new Error(`Failed to download recurso PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const recursosService = new RecursosService()