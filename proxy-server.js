import 'dotenv/config';
import http from 'http';
import { URL } from 'url';
import { createClient } from '@supabase/supabase-js';

const PORT = process.env.PORT || 3001;

// Configuração do Supabase - usando SERVICE_ROLE_KEY para operações administrativas
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Configuração Supabase:');
console.log('  URL:', supabaseUrl);
console.log('  Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NÃO DEFINIDA');
console.log('  Usando SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Variáveis do Supabase não configuradas!');
  console.error('  SUPABASE_URL:', supabaseUrl);
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
  console.error('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Função para converter XML do DataWash para JSON
function parseDataWashXML(xmlText, cpf) {
  try {
    console.log('🔍 Analisando XML DataWash...');
    
    // Verificar se há código de erro no XML
    const codigoMatch = xmlText.match(/<Codigo>(\d+)<\/Codigo>/i);
    const mensagemMatch = xmlText.match(/<Mensagem>([^<]+)<\/Mensagem>/i);
    
    if (codigoMatch && mensagemMatch) {
      const codigo = codigoMatch[1];
      const mensagem = mensagemMatch[1];
      
      console.log(`✅ DataWash retornou código ${codigo}: ${mensagem}`);
      
      // Código 0 significa sucesso no DataWash
      if (codigo !== '0' && codigo !== '') {
        console.log(`❌ Erro DataWash (${codigo}): ${mensagem}`);
        throw new Error(`Erro DataWash (${codigo}): ${mensagem}`);
      }
    }
    
    // Verificar se há dados de pessoa no XML
    const temDadosPessoa = xmlText.includes('<nome>') || xmlText.includes('<Nome>') || xmlText.includes('<NOME>') ||
                          xmlText.includes('<logradouro>') || xmlText.includes('<Logradouro>') || xmlText.includes('<LOGRADOURO>') ||
                          xmlText.includes('<DADOS>') || xmlText.includes('<dados>');
    
    if (!temDadosPessoa) {
      console.log('❌ XML não contém dados de pessoa válidos');
      throw new Error('Dados de pessoa não encontrados no XML');
    }
    
    // Extrair dados do XML
    const extractValue = (xml, tag) => {
      const patterns = [
        new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'),
        new RegExp(`<${tag.toLowerCase()}[^>]*>([^<]*)</${tag.toLowerCase()}>`, 'i'),
        new RegExp(`<${tag.toUpperCase()}[^>]*>([^<]*)</${tag.toUpperCase()}>`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = xml.match(pattern);
        if (match && match[1].trim()) {
          return match[1].trim();
        }
      }
      return '';
    };
    
    // Função para gerar email baseado no nome
    const generateEmailFromName = (nome) => {
      if (!nome) return '';
      
      const nomeNormalizado = nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z\s]/g, '') // Remove caracteres especiais
        .trim();
      
      const partes = nomeNormalizado.split(' ').filter(p => p.length > 0);
      
      if (partes.length >= 2) {
        return `${partes[0]}.${partes[partes.length - 1]}@email.com`;
      } else if (partes.length === 1) {
        return `${partes[0]}@email.com`;
      }
      
      return 'usuario@email.com';
    };
    
    const nome = extractValue(xmlText, 'nome');
    const logradouro = extractValue(xmlText, 'logradouro');
    const numero = extractValue(xmlText, 'numero');
    const bairro = extractValue(xmlText, 'bairro');
    const cidade = extractValue(xmlText, 'cidade');
    const estado = extractValue(xmlText, 'estado') || extractValue(xmlText, 'uf');
    const cep = extractValue(xmlText, 'cep');
    const telefone = extractValue(xmlText, 'telefone');
    // Tentar extrair data de nascimento com múltiplas variações
    const dataNascPatterns = [
      'dataNascimento', 'DATA_NASC', 'data_nascimento', 
      'DATANASC', 'DataNascimento', 'data_nasc'
    ];
    
    let dataNascimento = '';
    console.log('🔍 Tentando extrair data de nascimento...');
    for (const pattern of dataNascPatterns) {
      console.log(`🔍 Testando pattern: ${pattern}`);
      dataNascimento = extractValue(xmlText, pattern);
      if (dataNascimento) {
        console.log(`📅 Data nascimento encontrada na tag <${pattern}>: ${dataNascimento}`);
        break;
      } else {
        console.log(`❌ Pattern ${pattern} não encontrado`);
      }
    }
    
    if (!dataNascimento) {
      console.log('⚠️ Nenhuma data de nascimento encontrada no XML');
      // Debug: mostrar parte do XML que contém DATA_NASC
      const dataNascMatch = xmlText.match(/<DATA_NASC[^>]*>([^<]*)<\/DATA_NASC>/i);
      if (dataNascMatch) {
        console.log(`🔍 DEBUG: Encontrei DATA_NASC no XML: ${dataNascMatch[0]}`);
        console.log(`🔍 DEBUG: Valor extraído: ${dataNascMatch[1]}`);
        dataNascimento = dataNascMatch[1].trim();
        console.log(`📅 Data nascimento extraída via debug: ${dataNascimento}`);
      }
    }
    
    // Tentar extrair email com múltiplas variações
    const emailPatterns = [
      'email', 'EMAIL', 'e_mail', 'E_MAIL', 
      'endereco_email', 'ENDERECO_EMAIL',
      'email_contato', 'EMAIL_CONTATO'
    ];
    
    let email = '';
    for (const pattern of emailPatterns) {
      email = extractValue(xmlText, pattern);
      if (email) {
        console.log(`📧 Email encontrado na tag <${pattern}>: ${email}`);
        break;
      }
    }
    
    // Se não encontrou email na API, gerar baseado no nome
    if (!email && nome) {
      email = generateEmailFromName(nome);
      console.log(`📧 Email gerado baseado no nome "${nome}": ${email}`);
    } else if (!email) {
      console.log('⚠️ Nenhum email encontrado e nenhum nome disponível para gerar email');
    } else {
      console.log(`📧 Email extraído da API: ${email}`);
    }
    
    // Verificar se encontrou pelo menos nome ou endereço
    if (!nome && !logradouro) {
      console.log('❌ Dados essenciais não encontrados no XML');
      throw new Error('Dados essenciais não encontrados no XML');
    }
    
    const resultado = {
      nome: nome || 'Nome não informado',
      cpf: cpf,
      dataNascimento: dataNascimento,
      endereco: {
        logradouro: logradouro,
        numero: numero,
        bairro: bairro,
        cidade: cidade,
        estado: estado,
        cep: cep
      },
      telefone: telefone,
      email: email,
      success: true,
      source: 'datawash'
    };
    
    console.log('✅ Dados extraídos com sucesso do DataWash');
    return resultado;
    
  } catch (error) {
    console.error('❌ Erro ao parsear XML DataWash:', error.message);
    throw error;
  }
}

// Função para gerar dados simulados como fallback
function generateFallbackData(cpf) {
  const nomes = [
    'João Silva Santos', 'Maria Oliveira Costa', 'Pedro Souza Lima',
    'Ana Paula Ferreira', 'Carlos Eduardo Alves', 'Fernanda Rodrigues',
    'Ricardo Pereira', 'Juliana Martins', 'Roberto Carlos', 'Patricia Lima'
  ];
  
  const logradouros = [
    'Rua das Flores', 'Av. Paulista', 'Rua Augusta', 'Rua Oscar Freire',
    'Av. Faria Lima', 'Rua Teodoro Sampaio', 'Rua Consolação', 'Av. Rebouças'
  ];
  
  const bairros = [
    'Centro', 'Bela Vista', 'Consolação', 'Jardins',
    'Itaim Bibi', 'Pinheiros', 'Vila Olímpia', 'Moema'
  ];
  
  // Usar CPF como seed para dados consistentes
  const seed = parseInt(cpf?.substring(0, 3) || '123');
  const nomeIndex = seed % nomes.length;
  const logradouroIndex = seed % logradouros.length;
  const bairroIndex = seed % bairros.length;
  
  return {
    nome: nomes[nomeIndex],
    cpf: cpf || '00000000000',
    dataNascimento: `19${80 + (seed % 30)}-${String((seed % 12) + 1).padStart(2, '0')}-${String((seed % 28) + 1).padStart(2, '0')}`,
    endereco: {
      logradouro: logradouros[logradouroIndex],
      numero: String((seed % 999) + 1),
      complemento: seed % 3 === 0 ? `Apto ${(seed % 99) + 1}` : '',
      bairro: bairros[bairroIndex],
      cidade: 'São Paulo',
      estado: 'SP',
      cep: `${String(seed).padStart(5, '0')}-${String(seed * 2).substring(0, 3)}`
    },
    telefone: `(11) 9${String(seed).padStart(4, '0')}-${String(seed * 2).substring(0, 4)}`,
    email: `${nomes[nomeIndex].toLowerCase().replace(/\s+/g, '.')}@email.com`,
    success: true,
    source: 'fallback',
    warning: 'Dados simulados - API DataWash indisponível'
  };
}

const server = http.createServer(async (req, res) => {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, access_token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Asaas & DataWash Proxy Server',
      datawash: {
        endpoint: 'http://webservice.datawash.com.br/localizacao.asmx/ConsultaCPFCompleta',
        method: 'GET with query params',
        fallback: 'Dados simulados em caso de erro'
      }
    }));
    return;
  }

  // Proxy para API do DataWash
  if (req.url && req.url.startsWith('/api/datawash/')) {
    try {
      // Extrair CPF da URL: /api/datawash/cpf/12345678901
      const urlParts = req.url.split('/');
      const cpf = urlParts[urlParts.length - 1];
      
      console.log(`DataWash proxy request: Consultando CPF ${cpf}`);
      
      // Usar HTTP em vez de HTTPS para evitar erro de certificado SSL
      // Configuração exata do n8n que funciona
      const targetUrl = `http://webservice.datawash.com.br/localizacao.asmx/ConsultaCPFCompleta?cliente=Neoshare&usuario=felipe@nexmedia.com.br&senha=neoshare2015&cpf=${cpf}`;
      
      console.log(`🌐 URL DataWash: ${targetUrl}`);
      
      // Fazer requisição GET para o webservice DataWash
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Sistema-Multas-Automatizadas/1.0',
        },
        // Timeout de 10 segundos
        signal: AbortSignal.timeout(10000)
      });
      
      console.log(`DataWash response: ${response.status}`);
      
      // Ler resposta como texto (XML)
      const responseText = await response.text();
      
      if (!response.ok) {
        console.log('❌ Resposta de erro da API DataWash:');
        console.log('Status:', response.status);
        console.log('Response:', responseText);
        throw new Error(`DataWash API error: ${response.status}`);
      }
      
      console.log('✅ Resposta de sucesso da API DataWash:');
      console.log('Response XML:', responseText.substring(0, 500) + '...');
      
      // Converter XML para JSON
      const jsonResponse = parseDataWashXML(responseText, cpf);
      
      // Log antes de enviar resposta
      console.log('📄 JSON convertido (antes do envio):', JSON.stringify(jsonResponse, null, 2));
      
      // Retornar JSON
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(jsonResponse));
      
    } catch (error) {
      console.error('❌ Erro no proxy DataWash:', error);
      
      // Fallback para dados simulados em caso de erro
      const cpf = req.url.split('/').pop();
      const fallbackData = generateFallbackData(cpf);
      
      console.log('🔄 Usando dados simulados como fallback:', fallbackData);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fallbackData));
    }
    return;
  }

  // Proxy para API do Asaas
  if (req.url && req.url.startsWith('/api/asaas-proxy/')) {
    try {
      // Extrair a parte da URL após /api/asaas-proxy/
      const asaasPath = req.url.replace('/api/asaas-proxy/', '');
      const targetUrl = `https://api-sandbox.asaas.com/v3/${asaasPath}`;
      
      console.log(`Proxy request: ${req.method} ${targetUrl}`);
      
      // Configurar headers para a requisição
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Repassar header de autorização se existir
      if (req.headers.authorization) {
        headers['Authorization'] = req.headers.authorization;
      }
      
      if (req.headers['access_token']) {
        headers['access_token'] = req.headers['access_token'];
      }
      
      // Coletar body da requisição se existir
      let body = '';
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        req.on('data', chunk => {
          body += chunk.toString();
        });
        await new Promise(resolve => req.on('end', resolve));
      }
      
      // Log detalhado dos dados sendo enviados
      if (body) {
        console.log('📤 Dados enviados para Asaas:');
        console.log('Headers:', JSON.stringify(headers, null, 2));
        console.log('Body:', body);
        try {
          const parsedBody = JSON.parse(body);
          console.log('Body parseado:', JSON.stringify(parsedBody, null, 2));
        } catch (e) {
          console.log('Body não é JSON válido');
        }
      }
      
      // Fazer requisição para API do Asaas
      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: body || undefined,
      });
      
      console.log(`Asaas response: ${response.status}`);
      
      // Log da resposta da API
      const responseText = await response.text();
      if (!response.ok) {
        console.log('❌ Resposta de erro da API Asaas:');
        console.log('Status:', response.status);
        console.log('Response:', responseText);
        try {
          const parsedResponse = JSON.parse(responseText);
          console.log('Response parseado:', JSON.stringify(parsedResponse, null, 2));
        } catch (e) {
          console.log('Response não é JSON válido');
        }
      }
      
      // Repassar status code
      res.writeHead(response.status, { 'Content-Type': 'application/json' });
      
      // Repassar response
      res.end(responseText);
      
    } catch (error) {
      console.error('Erro no proxy Asaas:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Erro no proxy Asaas',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
    return;
  }

  // API de Créditos
  if (req.url && req.url.startsWith('/api/credits')) {
    const path = req.url.split('?')[0];
    const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
    
    // GET /api/credits/balance - Buscar saldo de créditos
    if (path === '/api/credits/balance' && req.method === 'GET') {
      console.log('🔍 === BUSCAR SALDO DE CRÉDITOS ===');
      console.log('Method:', req.method);
      console.log('Path:', path);
      
      const ownerType = urlParams.get('ownerType');
      const ownerId = urlParams.get('ownerId');
      
      console.log('Owner Type:', ownerType);
      console.log('Owner ID:', ownerId);
      
      try {
        if (!ownerId) {
          res.writeHead(400, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Owner ID é obrigatório'
          }));
          return;
        }
        
        // Buscar saldo na tabela credits
        const { data: credits, error } = await supabase
          .from('credits')
          .select('*')
          .eq('owner_type', ownerType || 'company')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Erro ao buscar créditos:', error);
          res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro ao buscar créditos'
          }));
          return;
        }
        
        // Calcular saldo atual
        let currentBalance = 0;
        if (credits && credits.length > 0) {
          currentBalance = credits.reduce((total, credit) => {
            return total + (credit.amount || 0);
          }, 0);
        }
        
        console.log(`✅ Saldo encontrado: ${currentBalance} créditos`);
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: true,
          data: {
            currentBalance,
            transactions: credits || []
          }
        }));
        
      } catch (error) {
        console.error('❌ Erro ao buscar saldo de créditos:', error);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: false,
          error: 'Erro interno do servidor'
        }));
      }
      return;
    }
  }
  
  // API de Pagamentos
  if (req.url && req.url.startsWith('/api/payments')) {
    const path = req.url.split('?')[0]; // Remove query params
    
    // GET /api/payments - Listar cobranças (rota principal)
    if (path === '/api/payments' && req.method === 'GET') {
      console.log('🔍 === LISTAR COBRANÇAS ===');
      console.log('Method:', req.method);
      console.log('Path:', path);
      
      try {
        // Buscar todas as cobranças das diferentes tabelas
        
        // 1. Service Orders (recursos de multa)
        const { data: serviceOrders, error: serviceOrdersError } = await supabase
          .from('service_orders')
          .select(`
            *,
            client:clients(id, nome, cpf_cnpj, email),
            company:companies(id, nome, cnpj),
            service:services(id, name)
          `)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (serviceOrdersError) {
          console.error('Erro ao buscar service_orders:', serviceOrdersError);
        }
        
        // 2. Payments (créditos)
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            *,
            customer:clients(id, nome, cpf_cnpj, email),
            company:companies(id, nome, cnpj)
          `)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (paymentsError) {
          console.error('Erro ao buscar payments:', paymentsError);
        }
        
        // 3. Asaas Payments
        const { data: asaasPayments, error: asaasError } = await supabase
          .from('asaas_payments')
          .select(`
            *,
            client:clients(id, nome, cpf_cnpj, email),
            company:companies(id, nome, cnpj)
          `)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (asaasError) {
          console.error('Erro ao buscar asaas_payments:', asaasError);
        }
        
        // Combinar e formatar os dados
        let allPayments = [
          // Service Orders (recursos de multa)
          ...(serviceOrders || []).map(order => ({
            id: order.id,
            payment_id: order.asaas_payment_id || order.id,
            client_name: order.client?.nome || order.client_name || order.customer_name || 'Cliente',
            customer_name: order.client?.nome || order.client_name || order.customer_name || 'Cliente',
            company_name: order.company?.nome || 'Empresa',
            amount: order.amount,
            status: order.status,
            created_at: order.created_at,
            paid_at: order.paid_at,
            due_date: order.due_date,
            description: order.description || `${order.service?.name || 'Recurso de Multa'} - ${order.client?.nome || 'Cliente'}`,
            payment_method: order.billing_type || 'PIX',
            asaas_payment_id: order.asaas_payment_id,
            invoice_url: order.invoice_url,
            pix_qr_code: order.qr_code_image || order.qr_code,
            pix_copy_paste: order.pix_payload || order.pix_copy_paste,
            multa_type: order.multa_type || 'Recurso de Multa',
            source: 'service_order'
          })),
          
          // Payments (créditos)
          ...(payments || []).map(payment => ({
            id: payment.id,
            payment_id: payment.id,
            client_name: payment.customer?.nome || 'Cliente',
            customer_name: payment.customer?.nome || 'Cliente',
            company_name: payment.company?.nome || 'Empresa',
            amount: payment.amount,
            status: payment.status,
            created_at: payment.created_at,
            paid_at: payment.confirmed_at,
            due_date: payment.due_date,
            description: `Compra de ${payment.credit_amount || 0} créditos`,
            payment_method: payment.payment_method || 'PIX',
            asaas_payment_id: payment.asaas_payment_id,
            invoice_url: payment.invoice_url,
            pix_qr_code: payment.pix_qr_code,
            pix_copy_paste: payment.pix_copy_paste,
            source: 'credits'
          })),
          
          // Asaas Payments
          ...(asaasPayments || []).map(payment => ({
            id: payment.id,
            payment_id: payment.id,
            client_name: payment.client?.nome || 'Cliente',
            customer_name: payment.client?.nome || 'Cliente',
            company_name: payment.company?.nome || 'Empresa',
            amount: payment.amount,
            status: payment.status,
            created_at: payment.created_at,
            paid_at: payment.payment_date,
            due_date: payment.due_date,
            description: payment.description,
            payment_method: payment.payment_method || 'PIX',
            asaas_payment_id: payment.id,
            invoice_url: payment.invoice_url,
            pix_qr_code: payment.pix_qr_code,
            pix_copy_paste: payment.pix_copy_paste,
            source: 'asaas'
          }))
        ];
        
        // Remover duplicatas baseado no payment_id
        const seen = new Set();
        allPayments = allPayments.filter(payment => {
          const id = payment.payment_id || payment.id;
          if (seen.has(id)) {
            return false;
          }
          seen.add(id);
          return true;
        });
        
        // Ordenar por data de criação
        allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        console.log(`✅ Total encontrado: ${allPayments.length} cobranças`);
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: true,
          payments: allPayments,
          total: allPayments.length,
          pagination: {
            page: 1,
            limit: 50,
            total: allPayments.length,
            totalPages: Math.ceil(allPayments.length / 50)
          }
        }));
        
      } catch (error) {
        console.error('❌ Erro ao listar cobranças:', error);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: false,
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        }));
      }
      return;
    }
    
    // GET /api/payments/all - Listar todas as cobranças (superadmin)
    if (path === '/api/payments/all' && req.method === 'GET') {
      console.log('🔍 === LISTAR TODAS AS COBRANÇAS (SUPERADMIN) ===');
      console.log('Method:', req.method);
      console.log('Path:', path);
      
      // Reutilizar a mesma lógica da rota principal
      try {
        // Buscar todas as cobranças das diferentes tabelas (sem filtro de empresa)
        
        // 1. Service Orders (recursos de multa)
        const { data: serviceOrders, error: serviceOrdersError } = await supabase
          .from('service_orders')
          .select(`
            *,
            client:clients(id, nome, cpf_cnpj, email),
            company:companies(id, nome, cnpj),
            service:services(id, name)
          `)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (serviceOrdersError) {
          console.error('Erro ao buscar service_orders:', serviceOrdersError);
        }
        
        // 2. Payments (créditos)
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            *,
            customer:clients(id, nome, cpf_cnpj, email),
            company:companies(id, nome, cnpj)
          `)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (paymentsError) {
          console.error('Erro ao buscar payments:', paymentsError);
        }
        
        // 3. Asaas Payments
        const { data: asaasPayments, error: asaasError } = await supabase
          .from('asaas_payments')
          .select(`
            *,
            client:clients(id, nome, cpf_cnpj, email),
            company:companies(id, nome, cnpj)
          `)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (asaasError) {
          console.error('Erro ao buscar asaas_payments:', asaasError);
        }
        
        // Combinar e formatar os dados (mesma lógica da rota principal)
        let allPayments = [
          // Service Orders (recursos de multa)
          ...(serviceOrders || []).map(order => ({
            id: order.id,
            payment_id: order.asaas_payment_id || order.id,
            client_name: order.client?.nome || order.client_name || order.customer_name || 'Cliente',
            customer_name: order.client?.nome || order.client_name || order.customer_name || 'Cliente',
            company_name: order.company?.nome || 'Empresa',
            company_id: order.company_id,
            amount: order.amount,
            status: order.status,
            created_at: order.created_at,
            paid_at: order.paid_at,
            due_date: order.due_date,
            description: order.description || `${order.service?.name || 'Recurso de Multa'} - ${order.client?.nome || 'Cliente'}`,
            payment_method: order.billing_type || 'PIX',
            asaas_payment_id: order.asaas_payment_id,
            invoice_url: order.invoice_url,
            pix_qr_code: order.qr_code_image || order.qr_code,
            pix_copy_paste: order.pix_payload || order.pix_copy_paste,
            multa_type: order.multa_type || 'Recurso de Multa',
            source: 'service_order'
          })),
          
          // Payments (créditos)
          ...(payments || []).map(payment => ({
            id: payment.id,
            payment_id: payment.id,
            client_name: payment.customer?.nome || 'Cliente',
            customer_name: payment.customer?.nome || 'Cliente',
            company_name: payment.company?.nome || 'Empresa',
            company_id: payment.company_id,
            amount: payment.amount,
            status: payment.status,
            created_at: payment.created_at,
            paid_at: payment.confirmed_at,
            due_date: payment.due_date,
            description: `Compra de ${payment.credit_amount || 0} créditos`,
            payment_method: payment.payment_method || 'PIX',
            asaas_payment_id: payment.asaas_payment_id,
            invoice_url: payment.invoice_url,
            pix_qr_code: payment.pix_qr_code,
            pix_copy_paste: payment.pix_copy_paste,
            source: 'credits'
          })),
          
          // Asaas Payments
          ...(asaasPayments || []).map(payment => ({
            id: payment.id,
            payment_id: payment.id,
            client_name: payment.client?.nome || 'Cliente',
            customer_name: payment.client?.nome || 'Cliente',
            company_name: payment.company?.nome || 'Empresa',
            company_id: payment.company_id,
            amount: payment.amount,
            status: payment.status,
            created_at: payment.created_at,
            paid_at: payment.payment_date,
            due_date: payment.due_date,
            description: payment.description,
            payment_method: payment.payment_method || 'PIX',
            asaas_payment_id: payment.id,
            invoice_url: payment.invoice_url,
            pix_qr_code: payment.pix_qr_code,
            pix_copy_paste: payment.pix_copy_paste,
            source: 'asaas'
          }))
        ];
        
        // Remover duplicatas baseado no payment_id
        const seen = new Set();
        allPayments = allPayments.filter(payment => {
          const id = payment.payment_id || payment.id;
          if (seen.has(id)) {
            return false;
          }
          seen.add(id);
          return true;
        });
        
        // Ordenar por data de criação
        allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        console.log(`✅ Total encontrado (todas as empresas): ${allPayments.length} cobranças`);
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: true,
          payments: allPayments,
          total: allPayments.length,
          pagination: {
            page: 1,
            limit: 100,
            total: allPayments.length,
            totalPages: Math.ceil(allPayments.length / 100)
          }
        }));
        
      } catch (error) {
        console.error('❌ Erro ao listar todas as cobranças:', error);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: false,
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        }));
      }
      return;
    }
    
    // GET /api/payments/company/:companyId - Listar cobranças de uma empresa específica
    if (path.match(/^\/api\/payments\/company\/[^\/]+$/) && req.method === 'GET') {
      console.log('🔍 === LISTAR COBRANÇAS DA EMPRESA ===');
      console.log('Method:', req.method);
      console.log('Path:', path);
      
      const companyId = path.split('/')[4]; // Extrair company ID da URL
      console.log('Company ID:', companyId);
      
      try {
        // Buscar cobranças filtradas por empresa
        
        // 1. Service Orders (recursos de multa)
        const { data: serviceOrders, error: serviceOrdersError } = await supabase
          .from('service_orders')
          .select(`
            *,
            client:clients(id, nome, cpf_cnpj, email),
            company:companies(id, nome, cnpj),
            service:services(id, name)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (serviceOrdersError) {
          console.error('Erro ao buscar service_orders:', serviceOrdersError);
        }
        
        // 2. Payments (créditos)
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            *,
            customer:clients(id, nome, cpf_cnpj, email),
            company:companies(id, nome, cnpj)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (paymentsError) {
          console.error('Erro ao buscar payments:', paymentsError);
        }
        
        // 3. Asaas Payments
        const { data: asaasPayments, error: asaasError } = await supabase
          .from('asaas_payments')
          .select(`
            *,
            client:clients(id, nome, cpf_cnpj, email),
            company:companies(id, nome, cnpj)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (asaasError) {
          console.error('Erro ao buscar asaas_payments:', asaasError);
        }
        
        // Combinar e formatar os dados (mesma lógica das outras rotas)
        let allPayments = [
          // Service Orders (recursos de multa)
          ...(serviceOrders || []).map(order => ({
            id: order.id,
            payment_id: order.asaas_payment_id || order.id,
            client_name: order.client?.nome || order.client_name || order.customer_name || 'Cliente',
            customer_name: order.client?.nome || order.client_name || order.customer_name || 'Cliente',
            company_name: order.company?.nome || 'Empresa',
            company_id: order.company_id,
            amount: order.amount,
            status: order.status,
            created_at: order.created_at,
            paid_at: order.paid_at,
            due_date: order.due_date,
            description: order.description || `${order.service?.name || 'Recurso de Multa'} - ${order.client?.nome || 'Cliente'}`,
            payment_method: order.billing_type || 'PIX',
            asaas_payment_id: order.asaas_payment_id,
            invoice_url: order.invoice_url,
            pix_qr_code: order.qr_code_image || order.qr_code,
            pix_copy_paste: order.pix_payload || order.pix_copy_paste,
            multa_type: order.multa_type || 'Recurso de Multa',
            source: 'service_order'
          })),
          
          // Payments (créditos)
          ...(payments || []).map(payment => ({
            id: payment.id,
            payment_id: payment.id,
            client_name: payment.customer?.nome || 'Cliente',
            customer_name: payment.customer?.nome || 'Cliente',
            company_name: payment.company?.nome || 'Empresa',
            company_id: payment.company_id,
            amount: payment.amount,
            status: payment.status,
            created_at: payment.created_at,
            paid_at: payment.confirmed_at,
            due_date: payment.due_date,
            description: `Compra de ${payment.credit_amount || 0} créditos`,
            payment_method: payment.payment_method || 'PIX',
            asaas_payment_id: payment.asaas_payment_id,
            invoice_url: payment.invoice_url,
            pix_qr_code: payment.pix_qr_code,
            pix_copy_paste: payment.pix_copy_paste,
            source: 'credits'
          })),
          
          // Asaas Payments
          ...(asaasPayments || []).map(payment => ({
            id: payment.id,
            payment_id: payment.id,
            client_name: payment.client?.nome || 'Cliente',
            customer_name: payment.client?.nome || 'Cliente',
            company_name: payment.company?.nome || 'Empresa',
            company_id: payment.company_id,
            amount: payment.amount,
            status: payment.status,
            created_at: payment.created_at,
            paid_at: payment.payment_date,
            due_date: payment.due_date,
            description: payment.description,
            payment_method: payment.payment_method || 'PIX',
            asaas_payment_id: payment.id,
            invoice_url: payment.invoice_url,
            pix_qr_code: payment.pix_qr_code,
            pix_copy_paste: payment.pix_copy_paste,
            source: 'asaas'
          }))
        ];
        
        // Remover duplicatas baseado no payment_id
        const seen = new Set();
        allPayments = allPayments.filter(payment => {
          const id = payment.payment_id || payment.id;
          if (seen.has(id)) {
            return false;
          }
          seen.add(id);
          return true;
        });
        
        // Ordenar por data de criação
        allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        console.log(`✅ Total encontrado para empresa ${companyId}: ${allPayments.length} cobranças`);
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: true,
          payments: allPayments,
          total: allPayments.length,
          pagination: {
            page: 1,
            limit: 50,
            total: allPayments.length,
            totalPages: Math.ceil(allPayments.length / 50)
          }
        }));
        
      } catch (error) {
        console.error('❌ Erro ao listar cobranças da empresa:', error);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: false,
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        }));
      }
      return;
    }
    
    // GET /api/payments/:paymentId - Buscar detalhes de uma cobrança específica
    if (path.match(/^\/api\/payments\/[^\/]+$/) && req.method === 'GET' && !path.includes('/recurso')) {
      console.log('🔍 === BUSCAR DETALHES DA COBRANÇA ===');
      console.log('Method:', req.method);
      console.log('Path:', path);
      
      const paymentId = path.split('/')[3]; // Extrair payment ID da URL
      console.log('Payment ID:', paymentId);
      
      try {
        let paymentData = null;
        
        // 1. Tentar buscar em service_orders primeiro
        const { data: serviceOrder, error: serviceError } = await supabase
          .from('service_orders')
          .select(`
            *,
            client:clients(*),
            company:companies(*)
          `)
          .eq('asaas_payment_id', paymentId)
          .single();
        
        if (serviceOrder && !serviceError) {
          console.log('✅ Cobrança encontrada em service_orders');
          paymentData = {
            id: serviceOrder.id,
            payment_id: serviceOrder.asaas_payment_id,
            asaas_payment_id: serviceOrder.asaas_payment_id,
            client_name: serviceOrder.client?.nome || 'Cliente',
            customer_name: serviceOrder.client?.nome || 'Cliente',
            company_name: serviceOrder.company?.nome || 'Empresa',
            company_id: serviceOrder.company_id,
            amount: serviceOrder.amount,
            status: serviceOrder.status,
            created_at: serviceOrder.created_at,
            paid_at: serviceOrder.payment_date,
            due_date: serviceOrder.due_date,
            description: serviceOrder.description,
            payment_method: serviceOrder.payment_method || 'PIX',
            pix_qr_code: serviceOrder.pix_qr_code,
            pix_code: serviceOrder.pix_code,
            qr_code_image: serviceOrder.qr_code_image,
            pix_copy_paste: serviceOrder.pix_copy_paste,
            pix_payload: serviceOrder.pix_payload,
            encodedImage: serviceOrder.encodedImage,
            invoice_url: serviceOrder.invoice_url,
            bank_slip_url: serviceOrder.bank_slip_url,
            source: 'service_orders'
          };
        } else {
          // 2. Tentar buscar em payments
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .select(`
              *,
              company:companies(*)
            `)
            .eq('asaas_payment_id', paymentId)
            .single();
          
          if (payment && !paymentError) {
            console.log('✅ Cobrança encontrada em payments');
            paymentData = {
              id: payment.id,
              payment_id: payment.asaas_payment_id,
              asaas_payment_id: payment.asaas_payment_id,
              client_name: 'Cliente',
              customer_name: 'Cliente',
              company_name: payment.company?.nome || 'Empresa',
              company_id: payment.company_id,
              amount: payment.amount,
              status: payment.status,
              created_at: payment.created_at,
              paid_at: payment.payment_date,
              due_date: payment.due_date,
              description: payment.description || `Compra de ${payment.credit_amount || 0} créditos`,
              payment_method: payment.payment_method || 'PIX',
              pix_qr_code: payment.pix_qr_code,
              pix_code: payment.pix_code,
              qr_code_image: payment.qr_code_image,
              pix_copy_paste: payment.pix_copy_paste,
              pix_payload: payment.pix_payload,
              encodedImage: payment.encodedImage,
              invoice_url: payment.invoice_url,
              bank_slip_url: payment.bank_slip_url,
              source: 'payments'
            };
          } else {
            // 3. Tentar buscar em asaas_payments
            const { data: asaasPayment, error: asaasError } = await supabase
              .from('asaas_payments')
              .select(`
                *,
                client:clients(*),
                company:companies(*)
              `)
              .eq('id', paymentId)
              .single();
            
            if (asaasPayment && !asaasError) {
              console.log('✅ Cobrança encontrada em asaas_payments');
              paymentData = {
                id: asaasPayment.id,
                payment_id: asaasPayment.id,
                asaas_payment_id: asaasPayment.id,
                client_name: asaasPayment.client?.nome || 'Cliente',
                customer_name: asaasPayment.client?.nome || 'Cliente',
                company_name: asaasPayment.company?.nome || 'Empresa',
                company_id: asaasPayment.company_id,
                amount: asaasPayment.amount,
                status: asaasPayment.status,
                created_at: asaasPayment.created_at,
                paid_at: asaasPayment.payment_date,
                due_date: asaasPayment.due_date,
                description: asaasPayment.description,
                payment_method: asaasPayment.payment_method || 'PIX',
                pix_qr_code: asaasPayment.pix_qr_code,
                pix_code: asaasPayment.pix_code,
                qr_code_image: asaasPayment.qr_code_image,
                pix_copy_paste: asaasPayment.pix_copy_paste,
                pix_payload: asaasPayment.pix_payload,
                encodedImage: asaasPayment.encodedImage,
                invoice_url: asaasPayment.invoice_url,
                bank_slip_url: asaasPayment.bank_slip_url,
                source: 'asaas_payments'
              };
            }
          }
        }
        
        if (!paymentData) {
          console.log('❌ Cobrança não encontrada em nenhuma tabela');
          res.writeHead(404, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Cobrança não encontrada'
          }));
          return;
        }
        
        console.log('✅ Detalhes da cobrança encontrados:', paymentData.source);
        console.log('  - QR Code disponível:', !!paymentData.pix_qr_code);
        console.log('  - PIX Code disponível:', !!paymentData.pix_code);
        console.log('  - QR Code Image disponível:', !!paymentData.qr_code_image);
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: true,
          payment: paymentData
        }));
        
      } catch (error) {
        console.error('❌ Erro ao buscar detalhes da cobrança:', error);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: false,
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        }));
      }
      return;
    }
    
    // GET /api/payments/:paymentId/recurso - Verificar status do recurso
    if (path.match(/^\/api\/payments\/[^\/]+\/recurso$/) && req.method === 'GET') {
      console.log('🔍 === VERIFICAR STATUS DO RECURSO ===');
      console.log('Method:', req.method);
      console.log('Path:', path);
      
      const paymentId = path.split('/')[3]; // Extrair payment ID da URL
      console.log('Payment ID:', paymentId);
      
      try {
        // Buscar o pagamento pelo asaas_payment_id
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('id, status')
          .eq('asaas_payment_id', paymentId)
          .single();
        
        if (paymentError || !payment) {
          console.log('❌ Pagamento não encontrado:', paymentError);
          res.writeHead(404, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Pagamento não encontrado'
          }));
          return;
        }
        
        console.log('✅ Pagamento encontrado:', payment.id, 'Status:', payment.status);
        
        // Verificar se existe recurso para este pagamento
        const { data: serviceOrder, error: serviceError } = await supabase
          .from('service_orders')
          .select('id, status, created_at')
          .eq('payment_id', payment.id)
          .eq('service_type', 'recurso_multa')
          .single();
        
        if (serviceError && serviceError.code !== 'PGRST116') {
          console.error('❌ Erro ao buscar recurso:', serviceError);
          res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro ao verificar recurso'
          }));
          return;
        }
        
        if (!serviceOrder) {
          console.log('ℹ️ Nenhum recurso encontrado para este pagamento');
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: true,
            hasRecurso: false,
            paymentStatus: payment.status,
            message: 'Nenhum recurso encontrado para este pagamento'
          }));
          return;
        }
        
        console.log('✅ Recurso encontrado:', serviceOrder.id, 'Status:', serviceOrder.status);
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: true,
          hasRecurso: true,
          paymentStatus: payment.status,
          recurso: {
            id: serviceOrder.id,
            status: serviceOrder.status,
            created_at: serviceOrder.created_at
          }
        }));
        
      } catch (error) {
        console.error('❌ Erro na verificação do recurso:', error);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: false,
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        }));
      }
      return;
    }
    
    // POST /api/payments/save-service-order - Salvar dados do webhook no banco local
    if (path === '/api/payments/save-service-order' && req.method === 'POST') {
      console.log('💾 === SALVAR DADOS DO WEBHOOK ===');
      console.log('Method:', req.method);
      console.log('Path:', path);
      
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          const requestData = JSON.parse(body);
          console.log('📦 Dados recebidos do webhook:', requestData);
          
          const { 
            webhook_data, 
            customer_id, 
            service_id, 
            company_id,
            valor_cobranca
          } = requestData;
          
          // Validar dados obrigatórios
          if (!webhook_data || !customer_id || !service_id || !company_id) {
            res.writeHead(400, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({ 
              success: false,
              error: 'Dados obrigatórios não fornecidos',
              required: ['webhook_data', 'customer_id', 'service_id', 'company_id']
            }));
            return;
          }
          
          // Buscar dados do cliente
          console.log('🔍 Buscando cliente com ID:', customer_id);
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('id, nome, cpf_cnpj, email')
            .eq('id', customer_id)
            .single();
          
          let client = null;
          if (clientError) {
            console.error('❌ Erro ao buscar cliente:', clientError);
            console.log('⚠️ Cliente não encontrado, criando cliente genérico');
          } else if (clientData) {
            client = clientData;
            console.log('✅ Cliente encontrado:', client.nome, 'ID:', client.id);
          } else {
            console.log('⚠️ Cliente não encontrado, criando cliente genérico');
          }
          
          // Se cliente não foi encontrado, retornar erro
          if (!client) {
            console.error('❌ ERRO CRÍTICO: Cliente não encontrado no banco de dados!');
            console.error('  - customer_id fornecido:', customer_id);
            console.error('  - Este cliente deve existir no banco antes de criar a cobrança');
            
            res.writeHead(404, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({ 
              success: false,
              error: 'Cliente não encontrado no banco de dados',
              customer_id: customer_id,
              message: 'O cliente deve ser criado antes de gerar a cobrança'
            }));
            return;
          }
          
          // Buscar dados do serviço
          console.log('🔍 Buscando serviço com ID:', service_id);
          const { data: serviceData, error: serviceError } = await supabase
            .from('services')
            .select('name, category')
            .eq('id', service_id);
          
          let service = null;
          if (serviceError) {
            console.error('❌ Erro ao buscar serviço:', serviceError);
          } else if (!serviceData || serviceData.length === 0) {
            console.log('⚠️ Serviço não encontrado, criando serviço genérico');
          } else {
            service = serviceData[0];
            console.log('✅ Serviço encontrado:', service.name);
          }
          
          // Se serviço não foi encontrado, criar um novo serviço
          if (!service) {
            console.log('📝 Serviço não encontrado, criando novo serviço...');
            
            const newServiceData = {
              id: service_id, // Usar o ID fornecido
              name: 'Recurso de Multa - Grave',
              category: 'grave',
              tipo_multa: 'grave',
              suggested_price: 90,
              acsm_value: 20,
              icetran_value: 30,
              taxa_cobranca: 5,
              active: true,
              company_id: company_id,
              pricing_type: 'fixed', // Campo obrigatório
              description: 'Serviço criado automaticamente para salvamento de cobrança'
            };
            
            const { data: newService, error: createServiceError } = await supabase
              .from('services')
              .insert(newServiceData)
              .select()
              .single();
            
            if (createServiceError) {
              console.error('❌ Erro ao criar serviço:', createServiceError);
              // Usar dados genéricos se falhar
              service = {
                name: 'Recurso de Multa',
                category: 'grave'
              };
            } else {
              service = newService;
              console.log('✅ Serviço criado automaticamente:', service.name);
            }
          }
          
          // Função para converter data brasileira para ISO
          const convertDateToISO = (dateStr) => {
            if (!dateStr) return null;
            
            // Se já está em formato ISO, retornar como está
            if (dateStr.includes('T') || dateStr.includes('Z')) {
              return dateStr;
            }
            
            // Se está em formato brasileiro (DD/MM/YYYY), converter
            if (dateStr.includes('/')) {
              const [day, month, year] = dateStr.split('/');
              return new Date(`${year}-${month}-${day}`).toISOString();
            }
            
            // Caso contrário, tentar criar data válida
            return new Date(dateStr).toISOString();
          };
          
          // Preparar dados para inserção na tabela service_orders
          const insertData = {
            client_id: customer_id,
            service_id: service_id,
            company_id: company_id,
            service_type: 'recurso_multa',
            multa_type: requestData.multa_type || webhook_data.multa_type || (['leve', 'media', 'grave', 'gravissima'].includes(service.category) ? service.category : 'grave'),
            amount: webhook_data.value || valor_cobranca,
            status: webhook_data.status === 'PENDING' ? 'pending_payment' : 'paid',
            description: webhook_data.description || `${service.name} - ${client.nome}`,
            asaas_payment_id: webhook_data.id,
            customer_id: customer_id, // Usar customer_id que existe na tabela
            // Dados PIX do webhook (campos corretos do Asaas)
            qr_code_image: webhook_data.encodedImage,
            pix_payload: webhook_data.payload,
            invoice_url: webhook_data.invoiceUrl,
            invoice_number: webhook_data.invoiceNumber,
            external_reference: webhook_data.externalReference,
            billing_type: webhook_data.billingType || 'PIX',
            date_created: webhook_data.dateCreated,
            due_date: convertDateToISO(webhook_data.dueDate), // CONVERTER DATA BRASILEIRA
            payment_description: webhook_data.description,
            splits_details: webhook_data.split ? JSON.stringify(webhook_data.split) : null,
            // Dados adicionais
            payment_method: 'PIX',
            webhook_response: webhook_data
          };
          
          console.log('\n📋 MAPEAMENTO DOS CAMPOS DO WEBHOOK:');
          console.log('  - ID Asaas:', webhook_data.id);
          console.log('  - Valor:', webhook_data.value);
          console.log('  - Status:', webhook_data.status);
          console.log('  - QR Code (encodedImage):', webhook_data.encodedImage ? 'PRESENTE (' + webhook_data.encodedImage.length + ' chars)' : 'AUSENTE');
          console.log('  - PIX Payload:', webhook_data.payload ? 'PRESENTE (' + webhook_data.payload.length + ' chars)' : 'AUSENTE');
          console.log('  - Invoice URL:', webhook_data.invoiceUrl ? 'PRESENTE' : 'AUSENTE');
          console.log('  - Description:', webhook_data.description ? 'PRESENTE' : 'AUSENTE');
          console.log('  - Splits:', webhook_data.split ? webhook_data.split.length + ' splits' : 'NENHUM');
          
          console.log('📦 Dados preparados para inserção:');
          console.log(JSON.stringify(insertData, null, 2));
          
          // Inserir na tabela service_orders
          const { data: insertResult, error: insertError } = await supabase
            .from('service_orders')
            .insert(insertData)
            .select()
            .single();
          
          if (insertError) {
            console.error('❌ Erro ao inserir no banco:', insertError);
            res.writeHead(500, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({ 
              success: false,
              error: 'Erro ao salvar no banco de dados',
              details: insertError.message
            }));
            return;
          }
          
          console.log('✅ Dados salvos no banco com sucesso!');
          console.log('🆔 ID do registro:', insertResult.id);
          
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: true,
            message: 'Dados salvos com sucesso',
            service_order_id: insertResult.id,
            payment_id: webhook_data.id
          }));
          
        } catch (error) {
          console.error('❌ Erro ao processar salvamento:', error);
          res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
          }));
        }
      });
      return;
    }
    
    // POST /api/payments/create-service-order - Criar cobrança de serviço
    if (path === '/api/payments/create-service-order' && req.method === 'POST') {
      console.log('🔍 === CRIAR COBRANÇA DE SERVIÇO ===');
      console.log('Method:', req.method);
      console.log('Path:', path);
      
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          const requestData = JSON.parse(body);
          console.log('📦 Dados recebidos:', requestData);
          
          const { 
            customer_id, 
            service_id, 
            company_id,
            valor_cobranca
          } = requestData;
          
          // Validar dados obrigatórios
          if (!customer_id || !service_id || !company_id || !valor_cobranca) {
            res.writeHead(400, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({ 
              success: false,
              error: 'Dados obrigatórios não fornecidos',
              required: ['customer_id', 'service_id', 'company_id', 'valor_cobranca']
            }));
            return;
          }
          
          // 1. Buscar configurações do serviço
          const { data: service, error: serviceError } = await supabase
            .from('services')
            .select(`
              id, name, category,
              acsm_value, icetran_value, taxa_cobranca
            `)
            .eq('id', service_id)
            .single();
          
          if (serviceError || !service) {
            console.error('❌ Serviço não encontrado:', serviceError);
            res.writeHead(404, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({ 
              success: false,
              error: 'Serviço não encontrado',
              details: serviceError?.message 
            }));
            return;
          }
          
          console.log('✅ Configurações do serviço:', service);
          
          // 2. Buscar wallet da empresa (despachante)
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('asaas_wallet_id, nome')
            .eq('id', company_id)
            .single();
          
          if (companyError || !company?.asaas_wallet_id) {
            console.error('❌ Wallet da empresa não configurado:', companyError);
            res.writeHead(400, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({ 
              success: false,
              error: 'Wallet da empresa não configurado. Configure o wallet no painel administrativo.',
              details: companyError?.message
            }));
            return;
          }
          
          console.log('✅ Empresa encontrada:', company.nome, 'Wallet:', company.asaas_wallet_id);
          
          // 3. Calcular splits dinamicamente
          const custoMinimo = (service.acsm_value || 0) + (service.icetran_value || 0) + (service.taxa_cobranca || 3.50);
          const margemDespachante = Math.max(0, valor_cobranca - custoMinimo);
          
          console.log('💰 Cálculo de splits:');
          console.log('  - Valor da cobrança:', valor_cobranca);
          console.log('  - ACSM:', service.acsm_value);
          console.log('  - ICETRAN:', service.icetran_value);
          console.log('  - Taxa:', service.taxa_cobranca);
          console.log('  - Custo mínimo:', custoMinimo);
          console.log('  - Margem despachante:', margemDespachante);
          
          // Validar se o valor é suficiente
          if (valor_cobranca < custoMinimo) {
            res.writeHead(400, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({
              success: false,
              error: `Valor mínimo deve ser R$ ${custoMinimo.toFixed(2)}`,
              custo_minimo: custoMinimo,
              detalhes: {
                acsm: service.acsm_value,
                icetran: service.icetran_value,
                taxa: service.taxa_cobranca
              }
            }));
            return;
          }
          
          // 4. Buscar cliente no Asaas
          const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('asaas_customer_id, nome, cpf_cnpj, email')
            .eq('id', customer_id)
            .single();
          
          if (clientError || !client?.asaas_customer_id) {
            console.error('❌ Cliente não encontrado:', clientError);
            res.writeHead(404, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({ 
              success: false,
              error: 'Cliente não encontrado ou sem ID do Asaas',
              details: clientError?.message 
            }));
            return;
          }
          
          console.log('✅ Cliente encontrado:', client.nome);
          
          // 5. Enviar para webhook externo
          console.log('🌐 Enviando para webhook externo...');
          
          const webhookData = {
            wallet_icetran: 'eb35cde4-d0f2-44d1-83c0-aaa3496f7ed0',
            wallet_despachante: company.asaas_wallet_id,
            Customer_cliente: {
              id: customer_id,
              nome: client.nome,
              cpf_cnpj: client.cpf_cnpj,
              email: client.email,
              asaas_customer_id: client.asaas_customer_id
            },
            Valor_cobrança: valor_cobranca,
            Idserviço: service_id,
            descricaoserviço: service.name,
            multa_type: requestData.multa_type || service.category || 'leve',
            valoracsm: service.acsm_value || 0,
            valoricetran: service.icetran_value || 0,
            taxa: service.taxa_cobranca || 3.50,
            despachante: {
              company_id: company_id,
              nome: company.nome,
              wallet_id: company.asaas_wallet_id,
              margem: margemDespachante
            }
          };
          
          console.log('📤 Dados para webhook:', webhookData);
          
          const webhookResponse = await fetch('https://webhookn8n.synsoft.com.br/webhook/d37fac6e-9379-4bca-b015-9c56b104cae1', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(webhookData)
          });
          
          let webhookResult;
          try {
            webhookResult = await webhookResponse.json();
          } catch (e) {
            webhookResult = { message: 'Resposta não é JSON válido' };
          }
          
          if (!webhookResponse.ok) {
            console.error('❌ Erro no webhook:', webhookResult);
            res.writeHead(500, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({
              success: false,
              error: `Erro ao processar cobrança via webhook: ${webhookResponse.status}`,
              details: webhookResult
            }));
            return;
          }
          
          console.log('✅ Webhook processado com sucesso:', webhookResult);
          
          // Extrair dados PIX da resposta do webhook
          let qrCodeImage = null;
          let pixPayload = null;
          let invoiceUrl = null;
          let asaasPaymentId = null;
          
          if (webhookResult) {
            qrCodeImage = webhookResult.qr_code_image || webhookResult.qr_code || webhookResult.encodedImage;
            pixPayload = webhookResult.pix_payload || webhookResult.pix_code || webhookResult.payload;
            invoiceUrl = webhookResult.invoice_url || webhookResult.invoiceUrl;
            asaasPaymentId = webhookResult.payment_id || webhookResult.id || webhookResult.asaas_payment_id;
            
            if (webhookResult.payment) {
              const payment = webhookResult.payment;
              qrCodeImage = qrCodeImage || payment.qr_code_image || payment.qr_code;
              pixPayload = pixPayload || payment.pix_payload || payment.pix_code;
              invoiceUrl = invoiceUrl || payment.invoice_url || payment.invoiceUrl;
              asaasPaymentId = asaasPaymentId || payment.id;
            }
          }
          
          console.log('🎉 Cobrança criada com sucesso!');
          console.log('  - Payment ID:', asaasPaymentId);
          console.log('  - QR Code disponível:', !!qrCodeImage);
          console.log('  - PIX Code disponível:', !!pixPayload);
          
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: true,
            payment: {
              id: asaasPaymentId,
              webhook_id: asaasPaymentId,
              amount: valor_cobranca,
              description: `${service.name} - ${client.nome}`,
              qr_code: qrCodeImage,
              pix_code: pixPayload,
              invoice_url: invoiceUrl,
              webhook_response: webhookResult,
              due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias
            }
          }));
          
        } catch (error) {
          console.error('❌ Erro ao criar cobrança:', error);
          res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
          }));
        }
      });
      return;
    }
    
    // Rota não encontrada na seção payments
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Rota de pagamentos não encontrada',
      path: path
    }));
    return;
  }

  // Rota não encontrada
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Rota não encontrada',
    path: req.url
  }));
});

server.listen(PORT, () => {
  console.log(`🚀 Proxy server rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Asaas Proxy: http://localhost:${PORT}/api/asaas-proxy`);
  console.log(`🔍 DataWash Proxy: http://localhost:${PORT}/api/datawash`);
});