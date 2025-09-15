import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AsaasWebhookEvent {
  event: string
  dateCreated: string
  payment: {
    object: string
    id: string
    dateCreated: string
    customer: string
    paymentLink?: string
    value: number
    netValue: number
    originalValue?: number
    interestValue?: number
    description: string
    billingType: string
    pixTransaction?: string
    status: string
    dueDate: string
    originalDueDate: string
    paymentDate?: string
    clientPaymentDate?: string
    installmentNumber?: number
    invoiceUrl: string
    invoiceNumber: string
    externalReference?: string
    discount?: {
      value: number
      limitDate?: string
      dueDateLimitDays: number
      type: string
    }
    fine?: {
      value: number
      type: string
    }
    interest?: {
      value: number
      type: string
    }
    deleted: boolean
    postalService: boolean
    anticipated: boolean
    anticipable: boolean
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse webhook payload
    const webhookEvent: AsaasWebhookEvent = await req.json()
    
    console.log(`🔔 Webhook recebido: ${webhookEvent.event} para pagamento ${webhookEvent.payment.id}`)
    console.log(`📊 Status do pagamento: ${webhookEvent.payment.status}`)
    console.log(`💰 Valor: R$ ${webhookEvent.payment.value}`)

    // Buscar pagamento no banco de dados
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('asaas_payment_id', webhookEvent.payment.id)
      .single()

    if (paymentError || !payment) {
      console.error(`❌ Pagamento não encontrado: ${webhookEvent.payment.id}`, paymentError)
      return new Response(
        JSON.stringify({ error: 'Pagamento não encontrado' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`✅ Pagamento encontrado: ${payment.id}`)

    // Processar diferentes tipos de eventos
    switch (webhookEvent.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        await processPaymentConfirmation(supabase, payment, webhookEvent)
        break

      case 'PAYMENT_UPDATED':
        await processPaymentUpdate(supabase, payment, webhookEvent)
        break

      case 'PAYMENT_DELETED':
      case 'PAYMENT_CANCELLED':
        await processPaymentCancellation(supabase, payment, webhookEvent)
        break

      default:
        console.log(`⚠️ Evento não tratado: ${webhookEvent.event}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado com sucesso' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Processar confirmação de pagamento
async function processPaymentConfirmation(supabase: any, payment: any, webhookEvent: AsaasWebhookEvent) {
  try {
    console.log(`💳 Processando confirmação de pagamento: ${payment.id}`)

    // Verificar se já foi processado
    if (payment.status === 'confirmed') {
      console.log(`⚠️ Pagamento já foi confirmado: ${payment.id}`)
      return
    }

    // Atualizar status do pagamento
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        asaas_webhook_data: webhookEvent
      })
      .eq('id', payment.id)

    if (updateError) {
      throw new Error(`Erro ao atualizar pagamento: ${updateError.message}`)
    }

    console.log(`✅ Status do pagamento atualizado para 'confirmed'`)

    // Adicionar créditos à conta (se for compra de créditos)
    if (payment.credit_amount && payment.credit_amount > 0) {
      await addCreditsToAccount(supabase, payment)
    }

    // Liberar serviços de recurso de multa (se for pagamento de serviço)
    await activateServiceOrders(supabase, payment, webhookEvent)

    console.log(`🎉 Pagamento processado com sucesso: ${payment.id}`)

  } catch (error) {
    console.error('❌ Erro ao processar confirmação:', error)
    throw error
  }
}

// Processar atualização de pagamento
async function processPaymentUpdate(supabase: any, payment: any, webhookEvent: AsaasWebhookEvent) {
  try {
    console.log(`🔄 Processando atualização de pagamento: ${payment.id}`)

    // Atualizar dados do webhook
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        asaas_webhook_data: webhookEvent,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id)

    if (updateError) {
      throw new Error(`Erro ao atualizar pagamento: ${updateError.message}`)
    }

    console.log(`✅ Pagamento atualizado: ${payment.id}`)

  } catch (error) {
    console.error('❌ Erro ao processar atualização:', error)
    throw error
  }
}

// Processar cancelamento de pagamento
async function processPaymentCancellation(supabase: any, payment: any, webhookEvent: AsaasWebhookEvent) {
  try {
    console.log(`❌ Processando cancelamento de pagamento: ${payment.id}`)

    // Atualizar status do pagamento
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        asaas_webhook_data: webhookEvent
      })
      .eq('id', payment.id)

    if (updateError) {
      throw new Error(`Erro ao cancelar pagamento: ${updateError.message}`)
    }

    console.log(`✅ Pagamento cancelado: ${payment.id}`)

  } catch (error) {
    console.error('❌ Erro ao processar cancelamento:', error)
    throw error
  }
}

// Adicionar créditos à conta
async function addCreditsToAccount(supabase: any, payment: any) {
  try {
    console.log(`💰 Adicionando ${payment.credit_amount} créditos`)

    // Determinar tipo de proprietário e ID
    const ownerType = payment.customer_id ? 'client' : 'company'
    const ownerId = payment.customer_id || payment.company_id

    console.log(`👤 Tipo: ${ownerType}, ID: ${ownerId}`)

    // Buscar saldo atual
    const { data: currentCredit, error: creditError } = await supabase
      .from('credits')
      .select('balance')
      .eq('owner_type', ownerType)
      .eq('owner_id', ownerId)
      .single()

    let currentBalance = 0
    if (!creditError && currentCredit) {
      currentBalance = currentCredit.balance
    }

    const newBalance = currentBalance + payment.credit_amount

    console.log(`📊 Saldo atual: ${currentBalance}, Novo saldo: ${newBalance}`)

    // Atualizar ou inserir créditos
    const { error: upsertError } = await supabase
      .from('credits')
      .upsert({
        owner_type: ownerType,
        owner_id: ownerId,
        balance: newBalance,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'owner_type,owner_id'
      })

    if (upsertError) {
      throw new Error(`Erro ao atualizar créditos: ${upsertError.message}`)
    }

    // Registrar transação
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        owner_type: ownerType,
        owner_id: ownerId,
        transaction_type: 'purchase',
        amount: payment.credit_amount,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: `Compra confirmada - ${payment.credit_amount} créditos`,
        payment_id: payment.id,
        created_at: new Date().toISOString()
      })

    if (transactionError) {
      throw new Error(`Erro ao registrar transação: ${transactionError.message}`)
    }

    console.log(`✅ Créditos adicionados com sucesso: ${payment.credit_amount} para ${ownerType} ${ownerId}`)

  } catch (error) {
    console.error('❌ Erro ao adicionar créditos:', error)
    throw error
  }
}

// Ativar pedidos de serviço após confirmação de pagamento
async function activateServiceOrders(supabase: any, payment: any, webhookEvent: AsaasWebhookEvent) {
  try {
    console.log(`🎯 Verificando pedidos de serviço para pagamento: ${payment.asaas_payment_id}`)

    // Buscar pedidos de serviço relacionados ao pagamento
    const { data: serviceOrders, error: serviceError } = await supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(id, nome, email),
        service:services(id, name)
      `)
      .eq('payment_id', payment.asaas_payment_id)
      .eq('status', 'pending_payment')

    if (serviceError) {
      console.error('❌ Erro ao buscar pedidos de serviço:', serviceError)
      return
    }

    if (!serviceOrders || serviceOrders.length === 0) {
      console.log('ℹ️ Nenhum pedido de serviço encontrado para este pagamento')
      return
    }

    console.log(`📋 Encontrados ${serviceOrders.length} pedidos de serviço para ativar`)

    // Ativar cada pedido de serviço
    for (const serviceOrder of serviceOrders) {
      try {
        console.log(`🔓 Ativando serviço: ${serviceOrder.id} - ${serviceOrder.service_type}`)

        // Atualizar status para 'paid' - libera o serviço
        const { error: updateError } = await supabase
          .from('service_orders')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', serviceOrder.id)

        if (updateError) {
          console.error(`❌ Erro ao ativar serviço ${serviceOrder.id}:`, updateError)
          continue
        }

        console.log(`✅ Serviço ativado: ${serviceOrder.id}`)

        // Enviar notificação para o cliente (se tiver email)
        if (serviceOrder.client?.email) {
          await sendServiceActivationNotification(supabase, serviceOrder)
        }

      } catch (error) {
        console.error(`❌ Erro ao processar serviço ${serviceOrder.id}:`, error)
      }
    }

    console.log(`🎉 Processamento de serviços concluído para pagamento: ${payment.asaas_payment_id}`)

  } catch (error) {
    console.error('❌ Erro ao ativar pedidos de serviço:', error)
    // Não fazer throw aqui para não interromper o processamento do webhook
  }
}

// Enviar notificação de ativação de serviço
async function sendServiceActivationNotification(supabase: any, serviceOrder: any) {
  try {
    console.log(`📧 Enviando notificação para: ${serviceOrder.client.email}`)

    // Registrar log da notificação (implementação básica)
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        action: 'service_activated',
        description: `Serviço de ${serviceOrder.service_type} ativado para cliente ${serviceOrder.client.nome}`,
        metadata: {
          service_order_id: serviceOrder.id,
          client_email: serviceOrder.client.email,
          service_type: serviceOrder.service_type,
          multa_type: serviceOrder.multa_type
        },
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('❌ Erro ao registrar log de notificação:', logError)
    }

    // TODO: Implementar envio de email real
    // Por enquanto, apenas registramos o log
    console.log(`✅ Notificação registrada para ${serviceOrder.client.email}`)

  } catch (error) {
    console.error('❌ Erro ao enviar notificação:', error)
  }
}