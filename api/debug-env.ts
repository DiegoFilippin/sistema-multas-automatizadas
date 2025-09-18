import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://sistema-multas-automatizadas.vercel.app' : 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, access_token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    // Verificar ambiente
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Verificar variáveis de ambiente do DataWash
    const datawashConfig = {
      username: process.env.DATAWASH_USERNAME,
      password: process.env.DATAWASH_PASSWORD ? process.env.DATAWASH_PASSWORD.substring(0, 4) + '***' : undefined,
      cliente: process.env.DATAWASH_CLIENTE,
      baseUrl: process.env.DATAWASH_BASE_URL
    };
    
    // Verificar outras variáveis importantes
    const otherEnvVars = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      SUPABASE_URL: process.env.SUPABASE_URL ? 'DEFINIDA' : 'NÃO DEFINIDA',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA'
    };
    
    // Contar quantas variáveis estão definidas
    const datawashVarsCount = Object.values(datawashConfig).filter(v => v !== undefined).length;
    const totalDatawashVars = Object.keys(datawashConfig).length;
    
    const response = {
      success: true,
      environment: {
        isProduction,
        platform: isProduction ? 'Vercel' : 'Local'
      },
      datawash: {
        config: datawashConfig,
        varsDefinidas: `${datawashVarsCount}/${totalDatawashVars}`,
        allVarsDefined: datawashVarsCount === totalDatawashVars
      },
      other: otherEnvVars,
      timestamp: new Date().toISOString()
    };
    
    console.log('🔍 Debug Environment Variables:', JSON.stringify(response, null, 2));
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Erro no debug de variáveis de ambiente:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}