import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/prisma';
import routes from './api/routes';
// import { logActivity } from './middleware/auth.js'; // Comentado temporariamente

const app = express();
const PORT = process.env.PORT || 3001;
const dbEnabled = !!process.env.DATABASE_URL;

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'access_token', 'x-asaas-env'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requisições por IP por janela
  message: {
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Middlewares gerais
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de log de atividades
// app.use('/api/', logActivity); // Comentado temporariamente

// Proxy para API do Asaas (resolver CORS)
app.use('/api/asaas-proxy', async (req, res) => {
  try {
    const asaasUrl = req.url.startsWith('/') ? req.url.slice(1) : req.url;

    // Escolher ambiente dinamicamente via header x-asaas-env
    const envHeader = (req.headers['x-asaas-env'] || 'production').toString();
    const isProduction = envHeader === 'production';
    const baseApi = isProduction ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
    const targetUrl = `${baseApi}/${asaasUrl}`;
    
    // Configurar headers para a requisição
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Repassar headers de autenticação se existirem
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }
    
    if (req.headers['access_token']) {
      headers['access_token'] = req.headers['access_token'] as string;
    }

    // Fazer requisição para API do Asaas
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    
    // Configurar headers CORS (origem dinâmica) e tratar preflight
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, access_token, x-asaas-env');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    };
    
    // Repassar status code
    res.status(response.status);
    
    // Repassar response
    const contentType = response.headers.get('content-type') || '';
    const data = await response.text();
    if (contentType.includes('application/json')) {
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch (err) {
        res.json({ error: 'invalid_json', raw: data });
      }
    } else {
      res.json({
        error: 'non_json_response',
        status: response.status,
        contentType,
        body: data?.slice(0, 500) || null
      });
    }
    
  } catch (error) {
    console.error('Erro no proxy Asaas:', error);
    res.status(500).json({
      error: 'Erro no proxy Asaas',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rotas da API
app.use('/api', routes);

// Rota de health check
app.get('/health', async (req, res) => {
  try {
    if (dbEnabled) {
      await prisma.$queryRaw`SELECT 1`;
    }
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbEnabled ? 'connected' : 'disabled',
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    });
  }
});

// Middleware de tratamento de erros
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', err);
  
  // Erro de validação do Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Conflito: dados duplicados',
      details: err.meta,
    });
  }
  
  // Erro de registro não encontrado do Prisma
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Registro não encontrado',
      details: err.meta,
    });
  }
  
  // Erro de JSON malformado
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'JSON inválido',
    });
  }
  
  // Erro genérico
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method,
  });
});

// Função para inicializar o servidor
const startServer = async () => {
  try {
    if (dbEnabled) {
      // Conectar ao banco de dados
      await prisma.$connect();
      console.log('✅ Conectado ao banco de dados');
      // Verificar se as tabelas existem
      try {
        await prisma.user.findFirst();
        console.log('✅ Tabelas do banco verificadas');
      } catch (error) {
        console.log('⚠️  Executando migrações do banco...');
      }
    } else {
      console.warn('⚠️ DATABASE_URL não definido. Iniciando servidor sem conexão ao Prisma.');
    }
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Modo de desenvolvimento ativo');
      }
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
};

// Tratamento de sinais de encerramento
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando servidor...');
  if (dbEnabled) await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Encerrando servidor...');
  if (dbEnabled) await prisma.$disconnect();
  process.exit(0);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  process.exit(1);
});

// Inicializar servidor sempre em dev (ESM)
startServer();

export default app;