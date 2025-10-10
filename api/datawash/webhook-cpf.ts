import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, access_token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { cpf } = req.body || {};
    if (!cpf || typeof cpf !== 'string') {
      res.status(400).json({ success: false, error: 'CPF é obrigatório' });
      return;
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      res.status(400).json({ success: false, error: 'CPF deve conter 11 dígitos' });
      return;
    }

    // Suportar ambas variáveis para compatibilidade
    const webhookUrl = process.env.N8N_DATAWASH_WEBHOOK_URL || process.env.N8N_WEBHOOK_CPF_URL;
    if (!webhookUrl) {
      res.status(500).json({ success: false, error: 'Webhook do n8n não configurado (N8N_DATAWASH_WEBHOOK_URL ou N8N_WEBHOOK_CPF_URL)' });
      return;
    }

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpfLimpo }),
        // 10s timeout
        signal: AbortSignal.timeout(10000)
      });
    } catch (err: any) {
      console.error('Erro de rede ao chamar webhook n8n:', err?.message || err);
      res.status(502).json({ success: false, error: 'Falha de rede ao consultar CPF via webhook' });
      return;
    }

    const text = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Retornar conteúdo bruto se não for JSON
      data = { raw: text };
    }

    if (!response.ok) {
      console.error('Erro do webhook n8n:', response.status, data);
      res.status(response.status).json(data || { success: false, error: 'Erro na consulta CPF via webhook' });
      return;
    }

    // Retornar diretamente o que o webhook devolver; o cliente normaliza
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Erro ao processar webhook-cpf:', error?.message || error);
    res.status(500).json({ success: false, error: 'Erro ao consultar CPF via webhook' });
  }
}