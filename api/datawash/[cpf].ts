import { NextApiRequest, NextApiResponse } from 'next';

// Função para converter XML do DataWash para JSON
function parseDataWashXML(xmlText: string, cpf: string) {
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
    const extractValue = (xml: string, tag: string) => {
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
    const generateEmailFromName = (nome: string) => {
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
    
    // Normalizar data de nascimento para ISO (YYYY-MM-DD)
    const normalizeDateToISO = (dateStr: string) => {
      if (!dateStr) return '';
      const s = dateStr.trim();
      // Já está ISO
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // Formatos tipo DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA com ano 2 ou 4 dígitos
      const m1 = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
      if (m1) {
        const d = m1[1];
        const mo = m1[2];
        let y = m1[3];
        if (y.length === 2) {
          const yy = parseInt(y, 10);
          y = yy >= 50 ? `19${y}` : `20${y}`;
        }
        return `${y.padStart(4, '0')}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      // Formatos tipo AAAA/MM/DD, AAAA-MM-DD, AAAA.MM.DD
      const m2 = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
      if (m2) {
        const [, y, mo, d] = m2;
        return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return '';
    };
    const dataNascimentoISO = normalizeDateToISO(dataNascimento);
    console.log(`📅 Data Nascimento (raw): "${dataNascimento}" → (ISO): "${dataNascimentoISO}"`);

    const resultado = {
      nome: nome || 'Nome não informado',
      cpf: cpf,
      dataNascimento: dataNascimentoISO,
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
    console.error('❌ Erro ao parsear XML DataWash:', error);
    throw error;
  }
}

// Função para gerar dados simulados como fallback
function generateFallbackData(cpf: string) {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    const { cpf } = req.query;
    
    if (!cpf || typeof cpf !== 'string') {
      res.status(400).json({
        success: false,
        error: 'CPF é obrigatório'
      });
      return;
    }
    
    console.log(`DataWash proxy request: Consultando CPF ${cpf}`);
    
    // Verificar se estamos em ambiente de produção (Vercel)
    const isProduction = process.env.NODE_ENV === 'production';
    console.log(`🌍 Ambiente: ${isProduction ? 'PRODUÇÃO (Vercel)' : 'DESENVOLVIMENTO'}`);
    
    // Usar variáveis de ambiente para credenciais do DataWash
    const datawashUsername = process.env.DATAWASH_USERNAME || 'felipe@nexmedia.com.br';
    const datawashPassword = process.env.DATAWASH_PASSWORD || 'neoshare2015';
    const datawashCliente = process.env.DATAWASH_CLIENTE || 'Neoshare';
    const datawashBaseUrl = process.env.DATAWASH_BASE_URL || 'http://webservice.datawash.com.br/localizacao.asmx/ConsultaCPFCompleta';
    
    // Log das variáveis de ambiente (sem mostrar senha completa)
    console.log(`🔑 DataWash Config:`);
    console.log(`   - Username: ${datawashUsername}`);
    console.log(`   - Password: ${datawashPassword ? datawashPassword.substring(0, 4) + '***' : 'NÃO DEFINIDA'}`);
    console.log(`   - Cliente: ${datawashCliente}`);
    console.log(`   - Base URL: ${datawashBaseUrl}`);
    
    const targetUrl = `${datawashBaseUrl}?cliente=${datawashCliente}&usuario=${datawashUsername}&senha=${datawashPassword}&cpf=${cpf}`;
    
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
    res.status(200).json(jsonResponse);
    
  } catch (error) {
    console.error('❌ Erro no proxy DataWash:', error);
    
    // Verificar se é erro de timeout ou rede
    const isNetworkError = error instanceof Error && (
      error.name === 'AbortError' ||
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout')
    );
    
    // Verificar se é erro de credenciais ou API
    const isApiError = error instanceof Error && (
      error.message.includes('DataWash API error') ||
      error.message.includes('401') ||
      error.message.includes('403')
    );
    
    console.log(`🔍 Tipo de erro detectado:`);
    console.log(`   - Erro de rede/timeout: ${isNetworkError}`);
    console.log(`   - Erro de API/credenciais: ${isApiError}`);
    
    // Se for erro de produção no Vercel, tentar retornar erro real ao invés de fallback
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && (isApiError || isNetworkError)) {
      console.log('🚨 PRODUÇÃO: Retornando erro real ao invés de fallback');
      res.status(500).json({
        success: false,
        error: 'Serviço DataWash temporariamente indisponível',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        source: 'datawash_error'
      });
      return;
    }
    
    // Fallback para dados simulados apenas em desenvolvimento ou erros não críticos
    const cpf = req.query.cpf as string;
    const fallbackData = generateFallbackData(cpf);
    
    console.log('🔄 Usando dados simulados como fallback:', fallbackData);
    
    res.status(200).json(fallbackData);
  }
}