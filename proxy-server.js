import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;

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