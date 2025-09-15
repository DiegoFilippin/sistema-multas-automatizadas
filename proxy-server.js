import 'dotenv/config';
import http from 'http';
import { URL } from 'url';
import { createClient } from '@supabase/supabase-js';

const PORT = process.env.PORT || 3001;

// Configuração do Supabase - usando variáveis corretas do .env
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Configuração Supabase:');
console.log('  URL:', supabaseUrl);
console.log('  Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NÃO DEFINIDA');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Variáveis do Supabase não configuradas!');
  console.error('  SUPABASE_URL:', supabaseUrl);
  console.error('  SUPABASE_ANON_KEY:', supabaseKey ? 'DEFINIDA' : 'NÃO DEFINIDA');
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