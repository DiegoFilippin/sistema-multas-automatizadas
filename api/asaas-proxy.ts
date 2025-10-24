type VercelReq = {
  url?: string
  headers: Record<string, string | string[] | undefined>
  method?: string
  body?: unknown
}

type VercelRes = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => VercelRes
  json: (data: unknown) => void
  end: () => void
}

export default async function handler(req: VercelReq, res: VercelRes) {
  try {
    const url = req.url || ''
    const asaasPath = url.replace(/^\/api\/asaas-proxy\/?/, '')
    const envHeader = (req.headers['x-asaas-env'] || 'production') as string
    const isProduction = envHeader === 'production'
    const baseApi = isProduction ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3'
    const targetUrl = `${baseApi}/${asaasPath}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const authHeader = req.headers['authorization']
    if (typeof authHeader === 'string') {
      headers['Authorization'] = authHeader
    }

    const accessToken = req.headers['access_token']
    if (typeof accessToken === 'string') {
      headers['access_token'] = accessToken
    }

    const method = req.method || 'GET'
    const hasBody = method !== 'GET' && method !== 'HEAD'
    let body: string | undefined

    if (hasBody) {
      if (req.body && typeof req.body === 'object') {
        body = JSON.stringify(req.body)
      } else if (typeof req.body === 'string') {
        body = req.body
      }
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    })

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, access_token, x-asaas-env')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    if (method === 'OPTIONS') {
      res.status(200).end()
      return
    }

    res.status(response.status)

    const contentType = response.headers.get('content-type') || ''
    const data = await response.text()
    if (contentType.includes('application/json')) {
      try {
        const jsonData = JSON.parse(data)
        res.json(jsonData)
      } catch {
        res.json({ error: 'invalid_json', raw: data })
      }
    } else {
      res.json({
        error: 'non_json_response',
        status: response.status,
        contentType,
        body: data?.slice(0, 500) || null
      })
    }
  } catch (error: unknown) {
    console.error('Erro no proxy Asaas (Vercel):', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    res.status(500).json({
      error: 'Erro no proxy Asaas (Vercel)',
      message
    })
  }
}