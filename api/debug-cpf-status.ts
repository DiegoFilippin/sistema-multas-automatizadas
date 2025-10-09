import type { NextApiRequest, NextApiResponse } from 'next'

interface DebugStatus {
  timestamp: string
  environment: string
  variables: {
    datawash: {
      username: boolean
      password: boolean
      cliente: boolean
      baseUrl: boolean
    }
    n8n: {
      webhookUrl: boolean
    }
  }
  endpoints: {
    datawashDirect: {
      status: string
      message: string
      testUrl: string
    }
    webhook: {
      status: string
      message: string
      testUrl: string
    }
  }
  recommendations: string[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const isProduction = process.env.NODE_ENV === 'production'
    const baseUrl = isProduction 
      ? `https://${req.headers.host}` 
      : 'http://localhost:3000'

    // Verificar variáveis de ambiente
    const datawashUsername = !!process.env.DATAWASH_USERNAME
    const datawashPassword = !!process.env.DATAWASH_PASSWORD
    const datawashCliente = !!process.env.DATAWASH_CLIENTE
    const datawashBaseUrl = !!process.env.DATAWASH_BASE_URL
    const n8nWebhookUrl = !!(process.env.N8N_DATAWASH_WEBHOOK_URL || process.env.N8N_WEBHOOK_CPF_URL)
    // Novo: permitir desativar teste direto (modo webhook-only por padrão)
    const enableDirect = process.env.ENABLE_DATAWASH_DIRECT === 'true'

    // Testar endpoints
    const testCpf = '11144477735'
    let datawashDirectStatus = 'unknown'
    let datawashDirectMessage = 'Não testado'
    let webhookStatus = 'unknown'
    let webhookMessage = 'Não testado'

    // Testar API DataWash direta
    if (enableDirect) {
      try {
        const datawashResponse = await fetch(`${baseUrl}/api/datawash/${testCpf}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (datawashResponse.ok) {
          datawashDirectStatus = 'working'
          datawashDirectMessage = 'API DataWash direta está funcionando'
        } else {
          datawashDirectStatus = 'error'
          datawashDirectMessage = `Erro ${datawashResponse.status}: ${datawashResponse.statusText}`
        }
      } catch (error) {
        datawashDirectStatus = 'error'
        datawashDirectMessage = `Erro de rede: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    } else {
      datawashDirectStatus = 'skipped'
      datawashDirectMessage = 'Teste da API direta desativado (modo webhook-only)'
    }

    // Testar webhook n8n
    try {
      const webhookResponse = await fetch(`${baseUrl}/api/datawash/webhook-cpf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cpf: testCpf })
      })

      if (webhookResponse.ok) {
        webhookStatus = 'working'
        webhookMessage = 'Webhook n8n está funcionando'
      } else {
        webhookStatus = 'error'
        webhookMessage = `Erro ${webhookResponse.status}: ${webhookResponse.statusText}`
      }
    } catch (error) {
      webhookStatus = 'error'
      webhookMessage = `Erro de rede: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }

    // Gerar recomendações
    const recommendations: string[] = []

    // Só recomendar DataWash direto se estiver habilitado
    if (enableDirect && (!datawashUsername || !datawashPassword || !datawashCliente || !datawashBaseUrl)) {
      recommendations.push('Configure as variáveis DATAWASH_USERNAME, DATAWASH_PASSWORD, DATAWASH_CLIENTE e DATAWASH_BASE_URL no Vercel')
    }

    if (!n8nWebhookUrl) {
      recommendations.push('Configure N8N_DATAWASH_WEBHOOK_URL ou N8N_WEBHOOK_CPF_URL no Vercel')
    }

    if (enableDirect && datawashDirectStatus === 'error') {
      recommendations.push('Verifique as credenciais do DataWash - API direta está falhando')
    }

    if (webhookStatus === 'error') {
      recommendations.push('Verifique a URL do webhook n8n - webhook está falhando')
    }

    if (recommendations.length === 0) {
      recommendations.push('Todas as configurações estão corretas! O CPF autofill deve funcionar.')
    }

    const status: DebugStatus = {
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development',
      variables: {
        datawash: {
          username: datawashUsername,
          password: datawashPassword,
          cliente: datawashCliente,
          baseUrl: datawashBaseUrl
        },
        n8n: {
          webhookUrl: n8nWebhookUrl
        }
      },
      endpoints: {
        datawashDirect: {
          status: datawashDirectStatus,
          message: datawashDirectMessage,
          testUrl: `${baseUrl}/api/datawash/${testCpf}`
        },
        webhook: {
          status: webhookStatus,
          message: webhookMessage,
          testUrl: `${baseUrl}/api/datawash/webhook-cpf`
        }
      },
      recommendations
    }

    res.status(200).json(status)
  } catch (error) {
    console.error('Erro ao verificar status:', error)
    res.status(500).json({ 
      error: 'Erro ao verificar status do CPF autofill',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
}