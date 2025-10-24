import { logger } from '@/utils/logger'

const log = logger.scope('services/n8nWebhook')

export interface N8nCreateCustomerPayload {
  cpf: string
  nome: string
  email: string
}

export interface N8nCreateCustomerResult {
  success: boolean
  customerId?: string
  message?: string
  raw?: unknown
}

function isEmail(value: string | undefined): boolean {
  if (!value) return false
  return /.+@.+\..+/.test(value)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

class N8nWebhookService {
  private readonly endpoint = 'https://webhookn8n.synsoft.com.br/webhook/9c04dc9c-ba5d-4a3f-a5f6-33fd667a9302'

  async createCustomer(payload: N8nCreateCustomerPayload): Promise<N8nCreateCustomerResult> {
    // Validação básica
    const cpf = (payload.cpf || '').replace(/\D/g, '')
    const nome = (payload.nome || '').trim()
    const email = (payload.email || '').trim()

    if (!cpf || cpf.length < 11) {
      return { success: false, message: 'CPF inválido ou ausente' }
    }
    if (!nome) {
      return { success: false, message: 'Nome do cliente é obrigatório' }
    }
    if (!isEmail(email)) {
      return { success: false, message: 'Email inválido ou ausente' }
    }

    const body = JSON.stringify({ cpf, nome, email })
    const headers = { 'Content-Type': 'application/json' }

    const maxAttempts = 3
    const baseDelay = 1000 // 1s
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetchWithTimeout(this.endpoint, { method: 'POST', headers, body }, 30_000)
        const text = await response.text()

        if (!response.ok) {
          let apiMsg = ''
          try {
            const json = JSON.parse(text)
            apiMsg = typeof json?.message === 'string' ? json.message : JSON.stringify(json)
          } catch {
            apiMsg = text.slice(0, 200)
          }
          throw new Error(`HTTP ${response.status} ${response.statusText}${apiMsg ? ` - ${apiMsg}` : ''}`)
        }

        let parsed: unknown = null
        try {
          parsed = JSON.parse(text)
        } catch {
          parsed = { raw: text }
        }

        const obj = parsed as Record<string, unknown>

        // Alguns fluxos n8n retornam o objeto do Asaas como string em "response"
        let nested: unknown = undefined
        const resp = obj['response']
        if (typeof resp === 'string') {
          try {
            nested = JSON.parse(resp)
          } catch {
            nested = resp
          }
        } else if (resp && typeof resp === 'object') {
          nested = resp as Record<string, unknown>
        }

        const sourceA = obj
        const sourceB = (nested ?? {}) as Record<string, unknown>

        const cidA1 = sourceA['customerId']
        const cidA2 = sourceA['customer_id']
        const cidA3 = sourceA['id']
        const cidB1 = sourceB['customerId']
        const cidB2 = sourceB['customer_id']
        const cidB3 = sourceB['id']
        const customerId: string | undefined =
          typeof cidA1 === 'string' ? cidA1 :
          typeof cidA2 === 'string' ? (cidA2 as string) :
          typeof cidA3 === 'string' ? (cidA3 as string) :
          typeof cidB1 === 'string' ? cidB1 :
          typeof cidB2 === 'string' ? (cidB2 as string) :
          typeof cidB3 === 'string' ? (cidB3 as string) :
          undefined

        const mA1 = sourceA['message']
        const mA2 = sourceA['msg']
        const mA3 = sourceA['status']
        const mB1 = sourceB['message']
        const mB2 = sourceB['msg']
        const mB3 = sourceB['status']
        const message: string | undefined =
          typeof mA1 === 'string' ? mA1 :
          typeof mA2 === 'string' ? (mA2 as string) :
          typeof mA3 === 'string' ? (mA3 as string) :
          typeof mB1 === 'string' ? mB1 :
          typeof mB2 === 'string' ? (mB2 as string) :
          typeof mB3 === 'string' ? (mB3 as string) :
          undefined

        const result: N8nCreateCustomerResult = {
          success: true,
          customerId,
          message,
          raw: parsed
        }

        log.info('n8n create customer ok', { customerId, message })
        return result
      } catch (err) {
        lastError = err
        const msg = toMessage(err)
        log.warn(`Tentativa ${attempt}/${maxAttempts} falhou: ${msg}`)
        // Retry em falhas transitórias
        if (attempt < maxAttempts) {
          const backoff = baseDelay * Math.pow(2, attempt - 1)
          await sleep(backoff)
          continue
        }
      }
    }

    const finalMsg = `Falha ao criar customer via webhook n8n: ${toMessage(lastError)}`
    log.error(finalMsg)
    return { success: false, message: finalMsg }
  }
}

export const n8nWebhookService = new N8nWebhookService()
export default n8nWebhookService