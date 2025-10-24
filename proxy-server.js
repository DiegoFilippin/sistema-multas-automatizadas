import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'access_token', 'x-asaas-env'],
}));
app.use(express.json());

// Proxy dinâmico para API do Asaas
app.use('/api/asaas-proxy', async (req, res) => {
  try {
    const asaasUrl = req.url.startsWith('/') ? req.url.slice(1) : req.url;
    const envHeader = (req.headers['x-asaas-env'] || 'production').toString();
    const isProduction = envHeader === 'production';
    const baseApi = isProduction ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
    const targetUrl = `${baseApi}/${asaasUrl}`;

    const headers = { 'Content-Type': 'application/json' };
    const auth = req.headers.authorization;
    const accessToken = req.headers['access_token'];
    if (typeof auth === 'string') headers['Authorization'] = auth;
    if (typeof accessToken === 'string') headers['access_token'] = accessToken;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, access_token, x-asaas-env');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    res.status(response.status);
    const contentType = response.headers.get('content-type') || '';
    const data = await response.text();

    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(data);
        res.json(json);
      } catch (err) {
        res.json({ error: 'invalid_json', raw: data });
      }
    } else {
      // Forçar resposta JSON padronizada para erros não-JSON
      res.json({
        error: 'non_json_response',
        status: response.status,
        contentType,
        body: data?.slice(0, 500) || null
      });
    }
  } catch (error) {
    console.error('Erro no proxy Asaas (dev):', error);
    res.status(500).json({ error: 'Erro no proxy Asaas (dev)', message: error?.message || 'Erro desconhecido' });
  }
});

// Basic subaccount API endpoints for testing
app.get('/api/subaccounts', (req, res) => {
  res.json({ 
    message: 'Subaccounts API endpoint working',
    timestamp: new Date().toISOString(),
    test: true
  });
});

app.get('/api/subaccounts/:id/credentials-history', (req, res) => {
  res.json({
    message: 'Credentials history endpoint working',
    subaccountId: req.params.id,
    history: [],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/subaccounts/:id/manual-config', (req, res) => {
  res.json({
    message: 'Manual config endpoint working',
    subaccountId: req.params.id,
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/subaccounts/:id/test-connection', (req, res) => {
  res.json({
    message: 'Test connection endpoint working',
    subaccountId: req.params.id,
    success: true,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Dev Asaas proxy server listening on http://localhost:${PORT}`);
});