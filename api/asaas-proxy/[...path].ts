import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const pathParam = req.query.path
    const asaasPath = Array.isArray(pathParam) ? pathParam.join('/') : (pathParam || '')
    // Escolher ambiente dinamicamente via header x-asaas-env
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

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, access_token, x-asaas-env')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    if (method === 'OPTIONS') {
      res.status(200).end()
      return
    }

    let body: string | undefined = undefined
    const hasBody = method !== 'GET' && method !== 'HEAD'
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

    res.status(response.status)

    const data = await response.text()
    try {
      const jsonData = JSON.parse(data)
      res.json(jsonData)
    } catch {
      res.send(data)
    }
  } catch (error: any) {
    console.error('Erro no proxy Asaas (Vercel catch-all):', error)
    res.status(500).json({
      error: 'Erro no proxy Asaas (Vercel)',
      message: error?.message || 'Erro desconhecido'
    })
  }
}