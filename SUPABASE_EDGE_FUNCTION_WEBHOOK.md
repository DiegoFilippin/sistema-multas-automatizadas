# Supabase Edge Function para Webhook Asaas

## Criar Edge Function

```bash
supabase functions new asaas-webhook
```

## Código da Function

```typescript
// supabase/functions/asaas-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse webhook data
    const webhookData = await req.json()
    const event = webhookData.event
    const payment = webhookData.payment

    console.log('📥 Webhook recebido:', { event, paymentId: payment.id })

    // Processar apenas pagamentos confirmados
    if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
      return new Response(
        JSON.stringify({ message: 'Evento não processado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Identificar tipo de pagamento
    const externalReference = payment.externalReference || ''
    const isRecharge = externalReference.startsWith('prepaid_recharge_')

    if (isRecharge) {
      // PROCESSAR RECARGA
      console.log('💰 Processando recarga...')

      // 1. Buscar recarga pendente
      const { data: recharge, error: rechargeError } = await supabase
        .from('prepaid_recharges')
        .select('*')
        .eq('asaas_payment_id', payment.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (rechargeError) {
        console.error('❌ Erro ao buscar recarga:', rechargeError)
        throw rechargeError
      }

      if (!recharge) {
        console.log('⚠️ Recarga não encontrada ou já processada')
        return new Response(
          JSON.stringify({ message: 'Recarga não encontrada' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      // 2. Calcular saldo atual
      const { data: transactions, error: balanceError } = await supabase
        .from('prepaid_wallet_transactions')
        .select('type, amount')
        .eq('company_id', recharge.company_id)

      if (balanceError) {
        console.error('❌ Erro ao calcular saldo:', balanceError)
        throw balanceError
      }

      const currentBalance = (transactions || []).reduce((sum, t) => {
        return sum + (t.type === 'credit' ? t.amount : -t.amount)
      }, 0)

      console.log('💵 Saldo atual:', currentBalance)

      // 3. Criar transação de crédito
      const { data: transaction, error: transactionError } = await supabase
        .from('prepaid_wallet_transactions')
        .insert({
          company_id: recharge.company_id,
          type: 'credit',
          amount: payment.value,
          balance_before: currentBalance,
          balance_after: currentBalance + payment.value,
          description: `Recarga via PIX - Cobrança ${payment.id}`,
          created_by: recharge.created_by,
          metadata: {
            asaas_payment_id: payment.id,
            recharge_id: recharge.id,
            payment_method: 'pix',
            pix_transaction: payment.pixTransaction,
            confirmed_date: payment.confirmedDate
          }
        })
        .select()
        .single()

      if (transactionError) {
        console.error('❌ Erro ao criar transação:', transactionError)
        throw transactionError
      }

      console.log('✅ Transação criada:', transaction.id)

      // 4. Atualizar status da recarga
      const { error: updateError } = await supabase
        .from('prepaid_recharges')
        .update({
          status: 'paid',
          paid_at: payment.paymentDate || payment.confirmedDate,
          transaction_id: transaction.id
        })
        .eq('id', recharge.id)

      if (updateError) {
        console.error('❌ Erro ao atualizar recarga:', updateError)
        // Não falhar aqui pois saldo já foi creditado
      }

      console.log('✅ Recarga confirmada e saldo creditado!')

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Recarga processada com sucesso',
          transactionId: transaction.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )

    } else {
      // PROCESSAR SERVICE ORDER
      console.log('📋 Processando service order...')

      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          payment_status: 'paid',
          paid_at: payment.paymentDate || payment.confirmedDate
        })
        .eq('asaas_payment_id', payment.id)

      if (updateError) {
        console.error('❌ Erro ao atualizar service order:', updateError)
        throw updateError
      }

      console.log('✅ Service order atualizada!')

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Service order atualizada com sucesso'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

## Deploy

```bash
supabase functions deploy asaas-webhook
```

## URL do Webhook

```
https://ktgynzdzvfcpvbdbtplu.supabase.co/functions/v1/asaas-webhook
```

## Configurar no Asaas

1. Acesse o painel do Asaas
2. Vá em Configurações → Webhooks
3. Adicione a URL acima
4. Selecione eventos:
   - PAYMENT_RECEIVED
   - PAYMENT_CONFIRMED

## Vantagens

✅ Processamento direto no Supabase
✅ Acesso direto ao banco de dados
✅ Logs nativos do Supabase
✅ Não precisa do N8N para recargas
✅ Mais rápido e confiável

## Desvantagens

❌ Precisa configurar e fazer deploy
❌ Menos flexível que N8N para mudanças rápidas
