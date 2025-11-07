import http from 'http';
import { URL } from 'url';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

const PORT = process.env.PORT || 3001;

// Configuração do Supabase com service_role para acesso completo
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  },
  global: {
    fetch: (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
  }
});

// Cache para configuração do Asaas
let asaasConfig = null;

// Função para gerar QR Code real
async function generateQRCodeBase64(pixPayload) {
  try {
    if (!pixPayload) {
      console.log('⚠️ PIX payload vazio, usando QR code padrão');
      return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }
    
    console.log('🔄 Gerando QR Code para PIX payload:', pixPayload.substring(0, 50) + '...');
    
    const qrCodeDataUrl = await QRCode.toDataURL(pixPayload, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    // Extrair apenas o base64 (remover data:image/png;base64,)
    const base64 = qrCodeDataUrl.split(',')[1];
    console.log('✅ QR Code gerado com sucesso, tamanho:', base64.length, 'caracteres');
    
    return base64;
  } catch (error) {
    console.error('❌ Erro ao gerar QR Code:', error);
    // Retornar QR code padrão em caso de erro
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

// Função para carregar configuração do Asaas
async function loadAsaasConfig() {
  try {
    if (asaasConfig) {
      return asaasConfig;
    }

    console.log('🔧 Carregando configuração do Asaas do banco...');
    
    const { data, error } = await supabase
      .from('asaas_config')
      .select('*')
      .single();

    if (error) {
      console.error('❌ Erro ao carregar configuração do Asaas:', error);
      throw new Error('Configuração do Asaas não encontrada');
    }

    asaasConfig = data;
    console.log('✅ Configuração do Asaas carregada:', {
      environment: data.environment,
      has_sandbox_key: !!data.api_key_sandbox,
      has_production_key: !!data.api_key_production
    });

    return asaasConfig;
  } catch (error) {
    console.error('❌ Erro ao carregar configuração do Asaas:', error);
    throw error;
  }
}

// Função para obter a chave API correta
function getAsaasApiKey(config) {
  if (!config) {
    throw new Error('Configuração do Asaas não carregada');
  }

  const apiKey = config.environment === 'production' 
    ? config.api_key_production 
    : config.api_key_sandbox;

  if (!apiKey) {
    throw new Error(`Chave API não encontrada para ambiente ${config.environment}`);
  }

  return apiKey;
}

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
  if (req.url === '/health' || req.url === '/api/health') {
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

  // Rotas de webhooks do Asaas
  if (req.url && req.url.startsWith('/api/webhooks/asaas')) {
    try {
      console.log('🔔 Webhook Asaas recebido:', req.method, req.url);
      
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            const webhookData = JSON.parse(body);
            console.log('📥 Dados do webhook:', JSON.stringify(webhookData, null, 2));
            
            // Validar estrutura básica do webhook
            if (!webhookData.event || !webhookData.payment) {
              console.error('❌ Webhook inválido: estrutura incorreta');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Estrutura do webhook inválida'
              }));
              return;
            }
            
            const { event, payment } = webhookData;
            const asaasPaymentId = payment.id;
            
            if (!asaasPaymentId) {
              console.error('❌ Webhook inválido: ID do pagamento não encontrado');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'ID do pagamento não encontrado'
              }));
              return;
            }
            
            console.log(`🔄 Processando evento: ${event} para pagamento: ${asaasPaymentId}`);
            
            // Salvar evento do webhook
            const { error: webhookError } = await supabase
              .from('asaas_webhooks')
              .insert({
                event_type: event,
                payment_id: asaasPaymentId,
                webhook_data: webhookData,
                processed: false
              });
            
            if (webhookError) {
              console.error('❌ Erro ao salvar webhook:', webhookError);
            }
            
            // Processar eventos de pagamento
            await processPaymentWebhook(event, asaasPaymentId, payment, webhookData);
            
            async function processPaymentWebhook(event, paymentId, paymentData, webhookData) {
              console.log(`🔄 [WEBHOOK] Processando evento: ${event} para pagamento: ${paymentId}`);
              
              try {
                // Buscar pagamento no banco de dados (tabela payments)
                const { data: existingPayment, error: paymentError } = await supabase
                  .from('payments')
                  .select('*')
                  .eq('asaas_payment_id', paymentId)
                  .single();
                
                // Buscar service_order relacionado ao pagamento
                const { data: serviceOrder, error: serviceOrderError } = await supabase
                  .from('service_orders')
                  .select('*')
                  .eq('asaas_payment_id', paymentId)
                  .single();
                
                if (paymentError && serviceOrderError) {
                  console.log(`⚠️ [WEBHOOK] Pagamento não encontrado em nenhuma tabela: ${paymentId}`);
                  return;
                }
                
                if (existingPayment) {
                  console.log(`📋 [WEBHOOK] Pagamento encontrado na tabela payments: ${existingPayment.id}`);
                }
                
                if (serviceOrder) {
                  console.log(`📋 [WEBHOOK] Service Order encontrado: ${serviceOrder.id}`);
                }
                
                // Processar diferentes tipos de eventos
                switch (event) {
                  case 'PAYMENT_RECEIVED':
                  case 'PAYMENT_CONFIRMED':
                    console.log(`💰 [WEBHOOK] Pagamento confirmado: ${paymentId}`);
                    
                    // Atualizar tabela payments se existir
                    if (existingPayment) {
                      const { error: updateError } = await supabase
                        .from('payments')
                        .update({
                          status: event === 'PAYMENT_RECEIVED' ? 'RECEIVED' : 'CONFIRMED',
                          paid_at: new Date().toISOString(),
                          confirmed_at: new Date().toISOString(),
                          asaas_webhook_data: webhookData,
                          payment_method: paymentData.billingType || 'PIX',
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', existingPayment.id);
                      
                      if (updateError) {
                        console.error('❌ [WEBHOOK] Erro ao atualizar payments:', updateError);
                      } else {
                        console.log(`✅ [WEBHOOK] Payments atualizado para ${event}`);
                      }
                    }
                    
                    // Atualizar service_order se existir
                    if (serviceOrder) {
                      const { error: serviceUpdateError } = await supabase
                        .from('service_orders')
                        .update({
                          status: 'paid',
                          paid_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                          // Salvar dados do webhook diretamente na service_orders
                          qr_code_image: paymentData.pixTransaction?.qrCode?.encodedImage || null,
                          pix_payload: paymentData.pixTransaction?.qrCode?.payload || null,
                          invoice_url: paymentData.invoiceUrl || null,
                          payment_description: paymentData.description || serviceOrder.description || 'Pagamento de serviço',
                          webhook_response: webhookData
                        })
                        .eq('id', serviceOrder.id);
                      
                      if (serviceUpdateError) {
                        console.error('❌ [WEBHOOK] Erro ao atualizar service_order:', serviceUpdateError);
                      } else {
                        console.log(`✅ [WEBHOOK] Service Order ${serviceOrder.id} atualizado com dados do webhook`);
                        console.log(`📊 [WEBHOOK] QR Code salvo: ${paymentData.pixTransaction?.qrCode?.encodedImage ? 'SIM' : 'NÃO'}`);
                        console.log(`📊 [WEBHOOK] Invoice URL: ${paymentData.invoiceUrl || 'N/A'}`);
                        console.log(`📊 [WEBHOOK] Descrição: ${paymentData.description || 'N/A'}`);
                      }
                    }
                    break;
                    
                  case 'PAYMENT_OVERDUE':
                    console.log(`⏰ [WEBHOOK] Pagamento vencido: ${paymentId}`);
                    
                    await supabase
                      .from('payments')
                      .update({
                        status: 'OVERDUE',
                        asaas_webhook_data: webhookData,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', existingPayment.id);
                    break;
                    
                  case 'PAYMENT_DELETED':
                  case 'PAYMENT_REFUNDED':
                    console.log(`🔄 [WEBHOOK] Pagamento cancelado/estornado: ${paymentId}`);
                    
                    await supabase
                      .from('payments')
                      .update({
                        status: event === 'PAYMENT_DELETED' ? 'CANCELLED' : 'REFUNDED',
                        asaas_webhook_data: webhookData,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', existingPayment.id);
                    break;
                    
                  case 'PAYMENT_AWAITING_RISK_ANALYSIS':
                    console.log(`🔍 [WEBHOOK] Pagamento em análise de risco: ${paymentId}`);
                    
                    await supabase
                      .from('payments')
                      .update({
                        status: 'AWAITING_RISK_ANALYSIS',
                        asaas_webhook_data: webhookData,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', existingPayment.id);
                    break;
                    
                  default:
                    console.log(`ℹ️ [WEBHOOK] Evento não processado: ${event}`);
                    
                    // Salvar dados do webhook mesmo para eventos não processados
                    await supabase
                      .from('payments')
                      .update({
                        asaas_webhook_data: webhookData,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', existingPayment.id);
                    break;
                }
                
              } catch (error) {
                console.error(`❌ [WEBHOOK] Erro ao processar evento ${event}:`, error);
                throw error;
              }
            }
            
            // Marcar webhook como processado
            await supabase
              .from('asaas_webhooks')
              .update({
                processed: true,
                processed_at: new Date().toISOString()
              })
              .eq('payment_id', asaasPaymentId)
              .eq('event_type', event);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'Webhook processado com sucesso'
            }));
            
          } catch (error) {
            console.error('❌ Erro ao processar webhook:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro interno ao processar webhook'
            }));
          }
        });
        return;
      }
      
      // Método não permitido
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Método não permitido'
      }));
      
    } catch (error) {
      console.error('❌ Erro na rota de webhook:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      }));
    }
    return;
  }

  // Rotas para gerenciar customers dos despachantes
  if (req.url && req.url.startsWith('/api/users/')) {
    try {
      const urlParts = req.url.split('?');
      const path = urlParts[0];
      const queryString = urlParts[1] || '';
      const queryParams = new URLSearchParams(queryString);
      
      console.log(`👥 Users API request: ${req.method} ${path}`);
      
      // GET /api/users/despachantes-without-customer - Listar despachantes sem asaas_customer_id
      if (path === '/api/users/despachantes-without-customer' && req.method === 'GET') {
        console.log('🔍 Buscando despachantes sem customer Asaas...');
        
        const { data: despachantes, error } = await supabase
          .from('users')
          .select(`
            id,
            name,
            email,
            phone,
            asaas_customer_id,
            created_at,
            user_profiles!inner(
              role
            )
          `)
          .is('asaas_customer_id', null)
          .eq('user_profiles.role', 'user')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ Erro ao buscar despachantes:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Erro ao buscar despachantes: ${error.message}`
          }));
          return;
        }
        
        console.log(`✅ Despachantes sem customer encontrados: ${despachantes?.length || 0}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: despachantes || []
        }));
        return;
      }
      
      // POST /api/users/create-asaas-customer - Criar customer no Asaas para despachante
      if (path === '/api/users/create-asaas-customer' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            const { userId } = JSON.parse(body);
            
            if (!userId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Campo userId é obrigatório'
              }));
              return;
            }
            
            console.log(`👤 Criando customer Asaas para usuário: ${userId}`);
            
            // 1. Buscar dados do usuário
            const { data: user, error: userError } = await supabase
              .from('users')
              .select(`
                id,
                name,
                email,
                phone,
                asaas_customer_id,
                user_profiles!inner(
                  role,
                  company_id,
                  companies(
                    name,
                    cnpj,
                    phone,
                    address,
                    city
                  )
                )
              `)
              .eq('id', userId)
              .single();
            
            if (userError || !user) {
              console.error('❌ Usuário não encontrado:', userError);
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Usuário não encontrado'
              }));
              return;
            }
            
            if (user.asaas_customer_id) {
              console.log('⚠️ Usuário já possui customer Asaas');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Usuário já possui customer Asaas configurado'
              }));
              return;
            }
            
            // 2. Criar customer no Asaas
            const config = await loadAsaasConfig();
            const apiKey = getAsaasApiKey(config);
            const baseUrl = config.environment === 'production' 
              ? 'https://api.asaas.com/v3' 
              : 'https://api-sandbox.asaas.com/v3';
            
            const company = user.user_profiles.companies;
            const customerData = {
              name: user.name,
              email: user.email,
              cpfCnpj: company?.cnpj || '00000000000191', // CNPJ da empresa ou padrão
              mobilePhone: user.phone || company?.phone,
              address: company?.address || 'Endereço não informado',
              addressNumber: '0',
              complement: '',
              province: company?.city || 'Cidade não informada',
              city: company?.city || 'Cidade não informada',
              externalReference: `user_${userId}`
            };
            
            console.log('📤 Criando customer no Asaas:', customerData);
            
            const asaasResponse = await fetch(`${baseUrl}/customers`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'access_token': apiKey
              },
              body: JSON.stringify(customerData)
            });
            
            const asaasResult = await asaasResponse.json();
            
            if (!asaasResponse.ok) {
              console.error('❌ Erro ao criar customer no Asaas:', asaasResult);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: `Erro ao criar customer no Asaas: ${asaasResult.errors?.[0]?.description || 'Erro desconhecido'}`
              }));
              return;
            }
            
            console.log('✅ Customer criado no Asaas:', asaasResult.id);
            
            // 3. Atualizar usuário com asaas_customer_id
            const { error: updateError } = await supabase
              .from('users')
              .update({
                asaas_customer_id: asaasResult.id
              })
              .eq('id', userId);
            
            if (updateError) {
              console.error('❌ Erro ao atualizar usuário:', updateError);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: `Erro ao atualizar usuário: ${updateError.message}`
              }));
              return;
            }
            
            console.log('✅ Usuário atualizado com customer ID');
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              customerId: asaasResult.id,
              data: {
                userId: userId,
                asaasCustomerId: asaasResult.id,
                customerData: asaasResult
              }
            }));
            
          } catch (error) {
            console.error('❌ Erro ao processar criação de customer:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro interno do servidor',
              message: error instanceof Error ? error.message : 'Erro desconhecido'
            }));
          }
        });
        return;
      }
      
      // POST /api/users/sync-all-customers - Sincronizar todos os despachantes sem customer
      if (path === '/api/users/sync-all-customers' && req.method === 'POST') {
        console.log('🔄 Iniciando sincronização em lote de customers...');
        
        // Buscar todos os despachantes sem customer
        const { data: despachantes, error: fetchError } = await supabase
          .from('users')
          .select(`
            id,
            name,
            email,
            phone,
            user_profiles!inner(
              role,
              company_id,
              companies(
                name,
                cnpj,
                phone,
                address,
                city
              )
            )
          `)
          .is('asaas_customer_id', null)
          .eq('user_profiles.role', 'user');
        
        if (fetchError) {
          console.error('❌ Erro ao buscar despachantes:', fetchError);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Erro ao buscar despachantes: ${fetchError.message}`
          }));
          return;
        }
        
        const results = {
          total: despachantes?.length || 0,
          success: 0,
          errors: []
        };
        
        if (!despachantes || despachantes.length === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Nenhum despachante sem customer encontrado',
            data: results
          }));
          return;
        }
        
        console.log(`🔄 Processando ${despachantes.length} despachantes...`);
        
        // Processar cada despachante
        for (const despachante of despachantes) {
          try {
            const config = await loadAsaasConfig();
            const apiKey = getAsaasApiKey(config);
            const baseUrl = config.environment === 'production' 
              ? 'https://api.asaas.com/v3' 
              : 'https://api-sandbox.asaas.com/v3';
            
            const company = despachante.user_profiles.companies;
            const customerData = {
              name: despachante.name,
              email: despachante.email,
              cpfCnpj: company?.cnpj || '00000000000191',
              mobilePhone: despachante.phone || company?.phone,
              address: company?.address || 'Endereço não informado',
              addressNumber: '0',
              complement: '',
              province: company?.city || 'Cidade não informada',
              city: company?.city || 'Cidade não informada',
              externalReference: `user_${despachante.id}`
            };
            
            console.log(`📤 Criando customer para ${despachante.name}...`);
            
            const asaasResponse = await fetch(`${baseUrl}/customers`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'access_token': apiKey
              },
              body: JSON.stringify(customerData)
            });
            
            const asaasResult = await asaasResponse.json();
            
            if (!asaasResponse.ok) {
              const errorMsg = `Erro para ${despachante.name}: ${asaasResult.errors?.[0]?.description || 'Erro desconhecido'}`;
              console.error('❌', errorMsg);
              results.errors.push(errorMsg);
              continue;
            }
            
            // Atualizar usuário com customer ID
            const { error: updateError } = await supabase
              .from('users')
              .update({
                asaas_customer_id: asaasResult.id
              })
              .eq('id', despachante.id);
            
            if (updateError) {
              const errorMsg = `Erro ao atualizar ${despachante.name}: ${updateError.message}`;
              console.error('❌', errorMsg);
              results.errors.push(errorMsg);
              continue;
            }
            
            console.log(`✅ Customer criado para ${despachante.name}: ${asaasResult.id}`);
            results.success++;
            
            // Pequena pausa entre requisições para evitar rate limit
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            const errorMsg = `Erro ao processar ${despachante.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
            console.error('❌', errorMsg);
            results.errors.push(errorMsg);
          }
        }
        
        console.log(`🏁 Sincronização concluída: ${results.success}/${results.total} sucessos`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Sincronização concluída: ${results.success}/${results.total} sucessos`,
          data: results
        }));
        return;
      }
      
      // POST /api/users/create-client-customer - Criar customer no Asaas para cliente
      if (path === '/api/users/create-client-customer' && req.method === 'POST') {
        console.log('🎯 Processando rota create-client-customer');
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            console.log('📥 Body recebido:', body);
            const { clientId } = JSON.parse(body);
            console.log('🆔 Client ID extraído:', clientId);
            
            if (!clientId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Campo clientId é obrigatório'
              }));
              return;
            }
            
            console.log(`👤 Criando customer Asaas para cliente: ${clientId}`);
            
            // 1. Buscar dados do cliente
            const { data: client, error: clientError } = await supabase
              .from('clients')
              .select(`
                id,
                nome,
                email,
                telefone,
                cpf_cnpj,
                endereco,
                cidade,
                estado,
                cep,
                asaas_customer_id,
                company_id
              `)
              .eq('id', clientId)
              .single();
            
            if (clientError || !client) {
              console.error('❌ Cliente não encontrado:', clientError);
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Cliente não encontrado'
              }));
              return;
            }
            
            if (client.asaas_customer_id) {
              console.log('⚠️ Cliente já possui customer Asaas');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Cliente já possui customer Asaas configurado'
              }));
              return;
            }
            
            // 2. Criar customer no Asaas
            const config = await loadAsaasConfig();
            const apiKey = getAsaasApiKey(config);
            const baseUrl = config.environment === 'production' 
              ? 'https://api.asaas.com/v3' 
              : 'https://api-sandbox.asaas.com/v3';
            
            const customerData = {
              name: client.nome,
              email: client.email || `cliente${clientId}@exemplo.com`,
              cpfCnpj: client.cpf_cnpj || '00000000000',
              mobilePhone: client.telefone,
              address: client.endereco || 'Endereço não informado',
              addressNumber: '0',
              complement: '',
              province: client.cidade || 'Cidade não informada',
              city: client.cidade || 'Cidade não informada',
              state: client.estado || 'SP',
              postalCode: client.cep?.replace(/\D/g, '') || '00000000',
              externalReference: `client_${clientId}`
            };
            
            console.log('📤 Criando customer no Asaas:', customerData);
            
            const asaasResponse = await fetch(`${baseUrl}/customers`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'access_token': apiKey
              },
              body: JSON.stringify(customerData)
            });
            
            const asaasResult = await asaasResponse.json();
            
            if (!asaasResponse.ok) {
              console.error('❌ Erro ao criar customer no Asaas:', asaasResult);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: `Erro ao criar customer no Asaas: ${asaasResult.errors?.[0]?.description || 'Erro desconhecido'}`
              }));
              return;
            }
            
            console.log('✅ Customer criado no Asaas:', asaasResult.id);
            
            // 3. Atualizar cliente com asaas_customer_id
            const { error: updateError } = await supabase
              .from('clients')
              .update({
                asaas_customer_id: asaasResult.id
              })
              .eq('id', clientId);
            
            if (updateError) {
              console.error('❌ Erro ao atualizar cliente:', updateError);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: `Erro ao atualizar cliente: ${updateError.message}`
              }));
              return;
            }
            
            console.log('✅ Cliente atualizado com customer ID');
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              data: {
                clientId: clientId,
                asaasCustomerId: asaasResult.id,
                customerData: asaasResult
              }
            }));
            
          } catch (error) {
            console.error('❌ Erro ao processar criação de customer:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro interno do servidor',
              message: error instanceof Error ? error.message : 'Erro desconhecido'
            }));
          }
        });
        return;
      }
      
      // Rota não encontrada
      console.log('❌ Rota de usuário não encontrada:', path);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Rota não encontrada'
      }));
      
    } catch (error) {
      console.error('❌ Erro na API de usuários:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
    return;
  }

  // Rotas de empresas
  if (req.url && req.url.startsWith('/api/companies/')) {
    try {
      const urlParts = req.url.split('?');
      const path = urlParts[0];
      const queryString = urlParts[1] || '';
      const queryParams = new URLSearchParams(queryString);
      
      console.log(`🏢 Companies API request: ${req.method} ${path}`);
      
      // POST /api/companies/create-asaas-customer - Criar customer no Asaas para empresa
      if (path === '/api/companies/create-asaas-customer' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            console.log('📥 Body recebido:', body);
            const { companyId } = JSON.parse(body);
            console.log('🆔 Company ID extraído:', companyId);
            
            if (!companyId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Campo companyId é obrigatório'
              }));
              return;
            }
            
            console.log(`🏢 Criando customer Asaas para empresa: ${companyId}`);
            
            // 1. Buscar dados da empresa
            const { data: company, error: companyError } = await supabase
              .from('companies')
              .select(`
                id,
                nome,
                cnpj,
                email,
                telefone,
                endereco,
                asaas_customer_id,
                company_level
              `)
              .eq('id', companyId)
              .single();
            
            if (companyError || !company) {
              console.error('❌ Empresa não encontrada:', companyError);
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Empresa não encontrada'
              }));
              return;
            }
            
            if (company.asaas_customer_id) {
              console.log('⚠️ Empresa já possui customer Asaas');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Empresa já possui customer Asaas configurado'
              }));
              return;
            }
            
            // 2. Criar customer no Asaas
            const config = await loadAsaasConfig();
            const apiKey = getAsaasApiKey(config);
            const baseUrl = config.environment === 'production' 
              ? 'https://api.asaas.com/v3' 
              : 'https://api-sandbox.asaas.com/v3';
            
            const customerData = {
              name: company.nome,
              email: company.email || `empresa${companyId}@exemplo.com`,
              cpfCnpj: company.cnpj || '00000000000191',
              mobilePhone: company.telefone,
              address: company.endereco || 'Endereço não informado',
              addressNumber: '0',
              complement: '',
              province: 'Cidade não informada',
              city: 'Cidade não informada',
              state: 'SP',
              postalCode: '00000000',
              externalReference: `company_${companyId}`
            };
            
            console.log('📤 Criando customer no Asaas:', customerData);
            
            const asaasResponse = await fetch(`${baseUrl}/customers`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'access_token': apiKey
              },
              body: JSON.stringify(customerData)
            });
            
            const asaasResult = await asaasResponse.json();
            
            if (!asaasResponse.ok) {
              console.error('❌ Erro ao criar customer no Asaas:', asaasResult);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: `Erro ao criar customer no Asaas: ${asaasResult.errors?.[0]?.description || 'Erro desconhecido'}`
              }));
              return;
            }
            
            console.log('✅ Customer criado no Asaas:', asaasResult.id);
            
            // 3. Atualizar empresa com asaas_customer_id
            const { error: updateError } = await supabase
              .from('companies')
              .update({
                asaas_customer_id: asaasResult.id
              })
              .eq('id', companyId);
            
            if (updateError) {
              console.error('❌ Erro ao atualizar empresa:', updateError);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: `Erro ao atualizar empresa: ${updateError.message}`
              }));
              return;
            }
            
            console.log('✅ Empresa atualizada com customer ID');
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              customerId: asaasResult.id,
              data: {
                companyId: companyId,
                asaasCustomerId: asaasResult.id,
                customerData: asaasResult
              }
            }));
            
          } catch (error) {
            console.error('❌ Erro ao processar criação de customer:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro interno do servidor',
              message: error instanceof Error ? error.message : 'Erro desconhecido'
            }));
          }
        });
        return;
      }
      
      // GET /api/companies/:companyId/wallet - Buscar wallet da empresa
      console.log('🔍 Testando rota wallet:', path, 'Match:', path.match(/^\/api\/companies\/[^/]+\/wallet$/));
      if (path.match(/^\/api\/companies\/[^/]+\/wallet$/) && req.method === 'GET') {
        const companyId = path.split('/')[3];
        console.log(`🏢 Buscando wallet da empresa: ${companyId}`);
        
        try {
          // Buscar wallet da empresa (companies.asaas_wallet_id ou asaas_subaccounts.wallet_id)
          const { data: company, error: companyError } = await supabase
             .from('companies')
             .select(`
               id, nome, asaas_wallet_id,
               asaas_subaccounts(
                 wallet_id, asaas_account_id, status
               )
             `)
             .eq('id', companyId)
             .single();
          
          if (companyError) {
            console.error('❌ Erro ao buscar empresa:', companyError);
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Empresa não encontrada'
            }));
            return;
          }
          
          // Determinar qual wallet usar
          let walletId = company.asaas_wallet_id;
          
          // Se não tem wallet na tabela companies, usar da asaas_subaccounts
          if (!walletId && company.asaas_subaccounts && company.asaas_subaccounts.length > 0) {
            walletId = company.asaas_subaccounts[0].wallet_id;
            console.log('✅ Usando wallet da tabela asaas_subaccounts:', walletId);
          }
          
          console.log('🎯 Wallet encontrado:', walletId);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            wallet_id: walletId || '',
            company_id: companyId,
            company_name: company.nome
          }));
          
        } catch (error) {
          console.error('❌ Erro ao buscar wallet da empresa:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor'
          }));
        }
        return;
      }
      
      // Rota não encontrada
      console.log('❌ Rota de empresa não encontrada:', path);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Rota não encontrada'
      }));
      
    } catch (error) {
      console.error('❌ Erro na API de empresas:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
    return;
  }

  // Rotas de créditos
  if (req.url && req.url.startsWith('/api/credits/')) {
    try {
      const urlParts = req.url.split('?');
      const path = urlParts[0];
      const queryString = urlParts[1] || '';
      const queryParams = new URLSearchParams(queryString);
      
      console.log(`🔍 Credits API request: ${req.method} ${path}`);
      
      // GET /api/credits/packages - Buscar pacotes de créditos
      if (path === '/api/credits/packages' && req.method === 'GET') {
        const targetType = queryParams.get('targetType');
        
        if (!targetType || !['client', 'company'].includes(targetType)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Parâmetro targetType é obrigatório (client ou company)'
          }));
          return;
        }
        
        console.log(`📦 Buscando pacotes para: ${targetType}`);
        
        const { data: packages, error } = await supabase
          .from('credit_packages')
          .select('*')
          .eq('target_type', targetType)
          .eq('is_active', true)
          .order('price', { ascending: true });
        
        if (error) {
          console.error('❌ Erro ao buscar pacotes:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Erro ao buscar pacotes: ${error.message}`
          }));
          return;
        }
        
        console.log(`✅ Pacotes encontrados: ${packages?.length || 0}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: packages || []
        }));
        return;
      }
      
      // POST /api/credits/purchase - Criar compra de créditos
      if (path === '/api/credits/purchase' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            const { packageId, customerId, companyId } = JSON.parse(body);
            
            if (!packageId || !customerId || !companyId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Campos packageId, customerId e companyId são obrigatórios'
              }));
              return;
            }
            
            console.log(`💳 Criando compra de créditos: packageId=${packageId}, customerId=${customerId}, companyId=${companyId}`);
            console.log(`🔍 Verificando se customerId (${customerId}) === companyId (${companyId}): ${customerId === companyId}`);
            
            // 1. Buscar pacote de créditos
            const { data: creditPackage, error: packageError } = await supabase
              .from('credit_packages')
              .select('*')
              .eq('id', packageId)
              .eq('is_active', true)
              .single();
            
            if (packageError || !creditPackage) {
              console.error('❌ Pacote não encontrado:', packageError);
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Pacote de créditos não encontrado'
              }));
              return;
            }
            
            // 2. Buscar dados da empresa (despachante)
            const { data: company, error: companyError } = await supabase
              .from('companies')
              .select('*')
              .eq('id', companyId)
              .single();
            
            if (companyError || !company) {
              console.error('❌ Empresa não encontrada:', companyError);
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Empresa não encontrada'
              }));
              return;
            }
            
            if (!company.asaas_customer_id) {
              console.error('❌ Empresa sem customer do Asaas');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Empresa não possui customer do Asaas configurado. Crie o customer na aba Subconta Asaas.'
              }));
              return;
            }
            
            // 3. Calcular valores
            const amount = creditPackage.price;
            const creditAmount = creditPackage.credit_amount;
            const discountPercentage = creditPackage.discount_percentage;
            
            // 4. Criar cobrança PIX no Asaas
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 1);
            
            const config = await loadAsaasConfig();
            const apiKey = getAsaasApiKey(config);
            const baseUrl = config.environment === 'production' 
              ? 'https://api.asaas.com/v3' 
              : 'https://api-sandbox.asaas.com/v3';
            
            const asaasPayload = {
              customer: company.asaas_customer_id,
              billingType: 'PIX',
              value: amount,
              dueDate: dueDate.toISOString().split('T')[0],
              description: `Compra de ${creditAmount} créditos - ${creditPackage.name} (${company.name})`,
              externalReference: `credit_purchase_${Date.now()}`
            };
            
            if (discountPercentage > 0) {
              asaasPayload.discount = {
                value: (amount * discountPercentage) / 100,
                dueDateLimitDays: 0
              };
            }
            
            console.log('📤 Criando cobrança PIX no Asaas:', asaasPayload);
            
            const asaasResponse = await fetch(`${baseUrl}/payments`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'access_token': apiKey
              },
              body: JSON.stringify(asaasPayload)
            });
            
            const asaasData = await asaasResponse.json();
            
            if (!asaasResponse.ok) {
              console.error('❌ Erro ao criar cobrança no Asaas:', asaasData);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Erro ao criar cobrança PIX no Asaas',
                details: asaasData
              }));
              return;
            }
            
            console.log('✅ Cobrança PIX criada no Asaas:', asaasData.id);
            
            // 4.1. Buscar QR Code do PIX
            let pixQrCodeId = '';
            let pixCopyAndPaste = '';
            
            if (asaasData.id && asaasData.billingType === 'PIX') {
              try {
                console.log('🔍 Buscando QR Code PIX para pagamento:', asaasData.id);
                const pixResponse = await fetch(`${baseUrl}/payments/${asaasData.id}/pixQrCode`, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'access_token': apiKey
                  }
                });
                
                if (pixResponse.ok) {
                  const pixData = await pixResponse.json();
                  pixQrCodeId = pixData.encodedImage || '';
                  pixCopyAndPaste = pixData.payload || '';
                  console.log('✅ QR Code PIX obtido com sucesso');
                } else {
                  console.error('❌ Erro ao buscar QR Code PIX:', await pixResponse.text());
                }
              } catch (pixError) {
                console.error('❌ Erro ao buscar QR Code PIX:', pixError);
              }
            }
            
            // 5. Determinar se é compra para cliente ou empresa
            let actualCustomerId = null;
            
            // Se customerId é diferente de companyId, significa que é compra para cliente específico
            if (customerId !== companyId) {
              // Verificar se o cliente existe
              const { data: client, error: clientError } = await supabase
                .from('clients')
                .select('id')
                .eq('id', customerId)
                .single();
              
              if (clientError || !client) {
                console.error('❌ Cliente não encontrado:', clientError);
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: false,
                  error: 'Cliente não encontrado'
                }));
                return;
              }
              
              actualCustomerId = customerId;
              console.log(`💳 Compra para cliente específico: ${customerId}`);
            } else {
              console.log(`💳 Compra para empresa: ${companyId}`);
            }
            
            // 6. Salvar pagamento no banco
            const { data: payment, error: paymentError } = await supabase
              .from('payments')
              .insert({
                asaas_payment_id: asaasData.id,
                customer_id: actualCustomerId, // null para empresas, clientId para clientes
                company_id: companyId,
                amount: amount,
                credit_amount: creditAmount,
                discount_percentage: discountPercentage,
                payment_method: 'PIX',
                status: 'pending',
                pix_qr_code: pixQrCodeId,
                pix_copy_paste: pixCopyAndPaste,
                due_date: dueDate.toISOString().split('T')[0]
              })
              .select()
              .single();
            
            if (paymentError) {
              console.error('❌ Erro ao salvar pagamento:', paymentError);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: `Erro ao salvar pagamento: ${paymentError.message}`
              }));
              return;
            }
            
            console.log('✅ Pagamento salvo no banco:', payment.id);
            
            // 7. Retornar dados do pagamento
            const response = {
              paymentId: payment.id,
              amount: amount,
              creditAmount: creditAmount,
              pixQrCode: pixQrCodeId,
              pixCopyPaste: pixCopyAndPaste,
              dueDate: dueDate.toISOString().split('T')[0],
              status: 'pending'
            };
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              data: response
            }));
            
          } catch (error) {
            console.error('❌ Erro ao processar compra:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro ao processar compra de créditos',
              message: error instanceof Error ? error.message : 'Erro desconhecido'
            }));
          }
        });
        return;
      }
      
      // GET /api/credits/payments/:paymentId - Buscar pagamento específico
      if (path.startsWith('/api/credits/payments/') && req.method === 'GET') {
        const paymentId = path.split('/').pop();
        
        console.log(`🔍 Buscando pagamento: ${paymentId}`);
        
        // 1. Buscar pagamento no banco de dados
        const { data: payment, error } = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .single();
        
        if (error || !payment) {
          console.error('❌ Pagamento não encontrado:', error);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Pagamento não encontrado'
          }));
          return;
        }
        
        // 2. Se o pagamento tem asaas_payment_id, buscar dados atualizados do Asaas
        let asaasPaymentData = null;
        if (payment.asaas_payment_id) {
          try {
            // Carregar configuração do Asaas
            const config = await loadAsaasConfig();
            const apiKey = getAsaasApiKey(config);
            const baseUrl = config.environment === 'production' 
              ? 'https://api.asaas.com/v3' 
              : 'https://api-sandbox.asaas.com/v3';
            
            // Buscar dados do pagamento no Asaas
            const asaasResponse = await fetch(`${baseUrl}/payments/${payment.asaas_payment_id}`, {
              headers: {
                'Content-Type': 'application/json',
                'access_token': apiKey
              }
            });
            
            if (asaasResponse.ok) {
              asaasPaymentData = await asaasResponse.json();
              console.log('✅ Dados do Asaas obtidos com sucesso');
              
              // Buscar QR Code PIX se o pagamento estiver pendente
              if (asaasPaymentData.status === 'PENDING' && asaasPaymentData.billingType === 'PIX') {
                try {
                  const qrCodeResponse = await fetch(`${baseUrl}/payments/${payment.asaas_payment_id}/pixQrCode`, {
                    headers: {
                      'Content-Type': 'application/json',
                      'access_token': apiKey
                    }
                  });
                  
                  if (qrCodeResponse.ok) {
                    const qrCodeData = await qrCodeResponse.json();
                    asaasPaymentData.pixQrCode = qrCodeData;
                    console.log('✅ QR Code PIX obtido com sucesso');
                  }
                } catch (qrError) {
                  console.error('⚠️ Erro ao buscar QR Code PIX:', qrError);
                }
              }
            } else {
              console.error('⚠️ Erro ao buscar dados do Asaas:', asaasResponse.status);
            }
          } catch (asaasError) {
            console.error('⚠️ Erro na integração com Asaas:', asaasError);
          }
        }
        
        // 3. Montar resposta combinando dados do banco e do Asaas
        const responseData = {
          id: payment.id,
          asaas_payment_id: payment.asaas_payment_id,
          amount: payment.amount,
          credit_amount: payment.credit_amount,
          status: payment.status,
          due_date: payment.due_date,
          created_at: payment.created_at,
          confirmed_at: payment.confirmed_at,
          description: payment.description || `Compra de ${payment.credit_amount} créditos`,
          // Dados do Asaas se disponíveis
          pix_copy_paste: asaasPaymentData?.pixCopyAndPaste || payment.pix_copy_paste,
          pix_qr_code: asaasPaymentData?.pixQrCode?.encodedImage || payment.pix_qr_code,
          asaas_status: asaasPaymentData?.status,
          asaas_data: asaasPaymentData
        };
        
        console.log('✅ Detalhes do pagamento retornados com sucesso');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: responseData
        }));
        return;
      }
      
      // GET /api/credits/balance - Buscar saldo de créditos
      if (path === '/api/credits/balance' && req.method === 'GET') {
        const ownerType = queryParams.get('ownerType');
        const ownerId = queryParams.get('ownerId') || queryParams.get('clientId') || queryParams.get('companyId');
        
        console.log(`💰 Buscando saldo de créditos: ownerType=${ownerType}, ownerId=${ownerId}`);
        
        if (!ownerType || !['client', 'company'].includes(ownerType)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Parâmetro ownerType é obrigatório (client ou company)'
          }));
          return;
        }
        
        if (!ownerId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Parâmetro ownerId (ou clientId/companyId) é obrigatório'
          }));
          return;
        }
        
        try {
          // 1. Buscar ou criar conta de créditos
          let { data: creditAccount, error: accountError } = await supabase
            .from('credits')
            .select('*')
            .eq('owner_type', ownerType)
            .eq('owner_id', ownerId)
            .single();
          
          if (accountError && accountError.code === 'PGRST116') {
            // Conta não existe, criar nova
            console.log(`📝 Criando nova conta de créditos para ${ownerType}: ${ownerId}`);
            
            const { data: newAccount, error: createError } = await supabase
              .from('credits')
              .insert({
                owner_type: ownerType,
                owner_id: ownerId,
                balance: 0.00,
                total_purchased: 0.00,
                total_used: 0.00
              })
              .select()
              .single();
            
            if (createError) {
              console.error('❌ Erro ao criar conta de créditos:', createError);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Erro ao criar conta de créditos',
                details: createError
              }));
              return;
            }
            
            creditAccount = newAccount;
            console.log('✅ Nova conta de créditos criada');
          } else if (accountError) {
            console.error('❌ Erro ao buscar conta de créditos:', accountError);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro ao buscar conta de créditos',
              details: accountError
            }));
            return;
          }
          
          console.log(`✅ Saldo de créditos encontrado: ${creditAccount.balance}`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            data: {
              currentBalance: creditAccount.balance || 0,
              totalPurchased: creditAccount.total_purchased || 0,
              totalUsed: creditAccount.total_used || 0,
              ownerId: ownerId,
              ownerType: ownerType
            }
          }));
          return;
          
        } catch (error) {
          console.error('❌ Erro ao processar saldo de créditos:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
          }));
          return;
        }
      }
      
      // GET /api/credits/transactions - Buscar histórico de transações
      if (path === '/api/credits/transactions' && req.method === 'GET') {
        const ownerType = queryParams.get('ownerType');
        const clientId = queryParams.get('clientId');
        const companyId = queryParams.get('companyId');
        const limit = parseInt(queryParams.get('limit') || '50');
        const offset = parseInt(queryParams.get('offset') || '0');
        
        console.log(`🔍 Buscando transações: ownerType=${ownerType}, clientId=${clientId}, companyId=${companyId}`);
        
        if (!ownerType || !['client', 'company'].includes(ownerType)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Parâmetro ownerType é obrigatório (client ou company)'
          }));
          return;
        }
        
        const ownerId = ownerType === 'client' ? clientId : companyId;
        
        if (!ownerId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Parâmetro ${ownerType === 'client' ? 'clientId' : 'companyId'} é obrigatório`
          }));
          return;
        }
        
        try {
          // 1. Buscar ou criar conta de créditos
          let { data: creditAccount, error: accountError } = await supabase
            .from('credits')
            .select('*')
            .eq('owner_type', ownerType)
            .eq('owner_id', ownerId)
            .single();
          
          if (accountError && accountError.code === 'PGRST116') {
            // Conta não existe, criar nova
            const { data: newAccount, error: createError } = await supabase
              .from('credits')
              .insert({
                owner_type: ownerType,
                owner_id: ownerId,
                balance: 0.00,
                total_purchased: 0.00,
                total_used: 0.00
              })
              .select()
              .single();
            
            if (createError) {
              console.error('❌ Erro ao criar conta de créditos:', createError);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Erro ao criar conta de créditos'
              }));
              return;
            }
            
            creditAccount = newAccount;
          } else if (accountError) {
            console.error('❌ Erro ao buscar conta de créditos:', accountError);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro ao buscar conta de créditos'
            }));
            return;
          }
          
          // 2. Buscar transações
          const { data: transactions, error: transactionsError } = await supabase
            .from('credit_transactions')
            .select(`
              *,
              services(name),
              payments(amount, status)
            `)
            .eq('credit_id', creditAccount.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
          
          if (transactionsError) {
            console.error('❌ Erro ao buscar transações:', transactionsError);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro ao buscar transações'
            }));
            return;
          }
          
          console.log(`✅ Transações encontradas: ${transactions?.length || 0}`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            data: transactions || [],
            pagination: {
              limit,
              offset,
              total: transactions?.length || 0
            }
          }));
          return;
          
        } catch (error) {
          console.error('❌ Erro ao processar transações:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor'
          }));
          return;
        }
      }
      
      // Rota não encontrada
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Rota de créditos não encontrada',
        path: path
      }));
      
    } catch (error) {
      console.error('❌ Erro na API de créditos:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
    return;
  }

  // API de Tipos de Multa
  if (req.url && req.url.startsWith('/api/multa-types')) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const path = url.pathname;
      const queryParams = url.searchParams;
      
      // GET /api/multa-types - Listar tipos de multa
      if (path === '/api/multa-types' && req.method === 'GET') {
        console.log('🔍 Buscando tipos de multa');
        
        try {
          const { data: multaTypes, error } = await supabase
            .from('multa_types')
            .select(`
              *,
              services(name, description)
            `)
            .eq('active', true)
            .order('type');
          
          if (error) {
            console.error('❌ Erro ao buscar tipos de multa:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro ao buscar tipos de multa'
            }));
            return;
          }
          
          console.log(`✅ Tipos de multa encontrados: ${multaTypes?.length || 0}`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            data: multaTypes || []
          }));
          return;
          
        } catch (error) {
          console.error('❌ Erro ao processar tipos de multa:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor'
          }));
          return;
        }
      }
      
      // PUT /api/multa-types/:id - Atualizar tipo de multa
      if (path.startsWith('/api/multa-types/') && req.method === 'PUT') {
        const pathParts = path.split('/');
        const multaTypeId = pathParts[3];
        
        if (!multaTypeId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'ID do tipo de multa é obrigatório'
          }));
          return;
        }
        
        console.log(`🔄 Atualizando tipo de multa: ${multaTypeId}`);
        
        // Ler dados do corpo da requisição
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            const updateData = JSON.parse(body);
            
            // Validar dados
            const allowedFields = ['acsm_value', 'icetran_value', 'fixed_value', 'active'];
            const filteredData = {};
            
            for (const field of allowedFields) {
              if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field];
              }
            }
            
            if (Object.keys(filteredData).length === 0) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Nenhum campo válido para atualizar'
              }));
              return;
            }
            
            // Adicionar timestamp de atualização
            filteredData.updated_at = new Date().toISOString();
            
            const { data: updatedType, error } = await supabase
              .from('multa_types')
              .update(filteredData)
              .eq('id', multaTypeId)
              .select()
              .single();
            
            if (error) {
              console.error('❌ Erro ao atualizar tipo de multa:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Erro ao atualizar tipo de multa'
              }));
              return;
            }
            
            console.log('✅ Tipo de multa atualizado com sucesso');
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              data: updatedType
            }));
            
          } catch (parseError) {
            console.error('❌ Erro ao processar dados:', parseError);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Dados inválidos'
            }));
          }
        });
        
        return;
      }
      
      // GET /api/multa-types/pricing - Buscar tipos de multa com preços (deve vir antes da rota genérica)
      if (path === '/api/multa-types/pricing' && req.method === 'GET') {
        try {
          console.log('🏷️ Buscando tipos de multa com preços...');
          
          // Sempre garantir que retornamos JSON válido
          const sendResponse = (success, data, error = null) => {
            const response = {
              success,
              types: data || [],
              ...(error && { error, details: error })
            };
            
            res.writeHead(success ? 200 : 500, { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            });
            res.end(JSON.stringify(response));
          };
          
          // Primeiro, verificar se já existem tipos (incluindo inativos)
          const { data: existingTypes, error: checkError } = await supabase
            .from('multa_types')
            .select('type, active')
            .order('created_at');
          
          if (checkError) {
            console.error('❌ Erro ao verificar tipos existentes:', checkError);
            sendResponse(false, [], 'Erro ao verificar tipos de multa');
            return;
          }
          
          console.log(`🔍 DEBUG - Tipos existentes no banco: ${existingTypes?.length || 0}`);
          if (existingTypes && existingTypes.length > 0) {
            existingTypes.forEach((type, index) => {
              console.log(`   ${index + 1}. Tipo: ${type.type}, Ativo: ${type.active}`);
            });
          }
          
          // Buscar apenas tipos ativos para retornar
          const { data: multaTypes, error } = await supabase
            .from('multa_types')
            .select('*')
            .eq('active', true)
            .order('suggested_price');
          
          if (error) {
            console.error('❌ Erro ao buscar tipos de multa ativos:', error);
            sendResponse(false, [], 'Erro ao buscar tipos de multa');
            return;
          }
          
          // Função auxiliar para determinar ordem de severidade
          const getSeverityOrder = (severity) => {
            const severityMap = {
              'leve': 1,
              'media': 2,
              'grave': 3,
              'gravissima': 4
            };
            return severityMap[severity] || 0;
          };
          
          // Se existir tipos ativos, retornar eles
          if (multaTypes && multaTypes.length > 0) {
            console.log(`✅ Encontrados ${multaTypes.length} tipos de multa ativos`);
            
            // Filtrar duplicatas baseado no tipo (prevenção adicional)
            const uniqueTypes = [];
            const seenTypes = new Set();
            
            multaTypes.forEach(type => {
              const typeKey = type.type || type.id;
              if (!seenTypes.has(typeKey)) {
                seenTypes.add(typeKey);
                uniqueTypes.push(type);
              } else {
                console.log(`⚠️ Duplicata detectada e filtrada: ${typeKey}`);
              }
            });
            
            // Validar e sanitizar dados
            const validTypes = uniqueTypes.map(type => ({
              ...type,
              severity: type.type || type.severity || 'default',
              name: type.name || 'Tipo não definido',
              suggested_price: type.suggested_price || 0,
              cost_price: type.total_price || type.cost_price || 0,
              severity_order: getSeverityOrder(type.type || type.severity)
            }));
            
            console.log(`🏷️ Tipos únicos retornados: ${validTypes.length}`);
            sendResponse(true, validTypes);
            return;
          }
          
          // Se não existir tipos ativos, verificar se devemos criar tipos padrão
          if (existingTypes && existingTypes.length > 0) {
            console.log('ℹ️ Tipos já existem no banco, mas nenhum está ativo');
            console.log('💡 Considere ativar os tipos existentes em vez de criar novos');
            sendResponse(false, [], 'Nenhum tipo de multa ativo encontrado');
            return;
          }
          
          console.log('📝 Criando tipos de multa padrão (primeira vez)...');
          
          const defaultTypes = [
            {
              type: 'leve',
              name: 'Multa Leve',
              severity: 'leve',
              severity_order: 1,
              description: 'Infrações leves de trânsito',
              acsm_value: 8.00,
              icetran_value: 8.00,
              fixed_value: 3.50,
              total_price: 19.50,
              cost_price: 19.50,
              suggested_price: 150.00,
              active: true
            },
            {
              type: 'media',
              name: 'Multa Média',
              severity: 'media',
              severity_order: 2,
              description: 'Infrações médias de trânsito',
              acsm_value: 12.00,
              icetran_value: 12.00,
              fixed_value: 5.00,
              total_price: 29.00,
              cost_price: 29.00,
              suggested_price: 250.00,
              active: true
            },
            {
              type: 'grave',
              name: 'Multa Grave',
              severity: 'grave',
              severity_order: 3,
              description: 'Infrações graves de trânsito',
              acsm_value: 18.00,
              icetran_value: 18.00,
              fixed_value: 7.50,
              total_price: 43.50,
              cost_price: 43.50,
              suggested_price: 350.00,
              active: true
            },
            {
              type: 'gravissima',
              name: 'Multa Gravíssima',
              severity: 'gravissima',
              severity_order: 4,
              description: 'Infrações gravíssimas de trânsito',
              acsm_value: 25.00,
              icetran_value: 25.00,
              fixed_value: 10.00,
              total_price: 60.00,
              cost_price: 60.00,
              suggested_price: 500.00,
              active: true
            }
          ];
          
          // Inserir tipos padrão (sem IDs fixos para evitar conflitos)
          const { data: insertedTypes, error: insertError } = await supabase
            .from('multa_types')
            .insert(defaultTypes)
            .select();
          
          if (insertError) {
            console.error('❌ Erro ao criar tipos padrão:', insertError);
            sendResponse(false, [], 'Erro ao criar tipos de multa padrão');
            return;
          }
          
          console.log('✅ Tipos de multa padrão criados com sucesso');
          console.log(`📊 Total de tipos criados: ${insertedTypes?.length || 0}`);
          sendResponse(true, insertedTypes || []);
          return;
          
        } catch (error) {
          console.error('❌ Erro na API de tipos de multa:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
          }));
        }
        return;
      }

      // GET /api/multa-types/:id - Buscar tipo de multa específico
      if (path.startsWith('/api/multa-types/') && req.method === 'GET') {
        const pathParts = path.split('/');
        const multaTypeId = pathParts[3];
        
        if (!multaTypeId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'ID do tipo de multa é obrigatório'
          }));
          return;
        }
        
        console.log(`🔍 Buscando tipo de multa: ${multaTypeId}`);
        
        try {
          const { data: multaType, error } = await supabase
            .from('multa_types')
            .select(`
              *,
              services(name, description)
            `)
            .eq('id', multaTypeId)
            .single();
          
          if (error || !multaType) {
            console.error('❌ Tipo de multa não encontrado:', error);
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Tipo de multa não encontrado'
            }));
            return;
          }
          
          console.log('✅ Tipo de multa encontrado');
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            data: multaType
          }));
          return;
          
        } catch (error) {
          console.error('❌ Erro ao buscar tipo de multa:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor'
          }));
          return;
        }
      }
      
      // Rota não encontrada
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Rota de tipos de multa não encontrada',
        path: path
      }));
      
    } catch (error) {
      console.error('❌ Erro na API de tipos de multa:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
    return;
  }

  // API de empresas - deve vir antes de payments para não ser interceptada
  if (req.url === '/api/companies/all' && req.method === 'GET') {
    try {
      console.log('🔍 Buscando todas as empresas');
      
      // Buscar todas as empresas
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, nome, cnpj, status')
        .eq('status', 'active')
        .order('nome', { ascending: true });
      
      if (companiesError) {
        console.error('❌ Erro ao buscar empresas:', companiesError);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Erro ao buscar empresas'
        }));
        return;
      }
      
      console.log(`✅ Retornando ${companies?.length || 0} empresas`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        companies: companies || []
      }));
      return;
    } catch (error) {
      console.error('❌ Erro ao buscar empresas:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      }));
    }
    return;
  }

  // API de Pagamentos
  if (req.url && req.url.startsWith('/api/payments/')) {
    try {
      const path = req.url.split('?')[0]; // Remove query params
      const pathParts = path.split('/');
      
      // GET /api/payments/all - Todas cobranças da plataforma (apenas superadmin)
      if (pathParts.length === 4 && pathParts[3] === 'all' && req.method === 'GET') {
        console.log('🔍 Buscando todas as cobranças (superadmin)');
        
        try {
          // Buscar todos os pagamentos
          const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select(`
              *,
              customer:clients(id, nome, cpf_cnpj, email),
              company:companies(id, nome, cnpj)
            `)
            .order('created_at', { ascending: false });
          
          if (paymentsError) {
            console.error('❌ Erro ao buscar pagamentos:', paymentsError);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro ao buscar pagamentos'
            }));
            return;
          }
          
          // Formatar dados para a interface com informações detalhadas
          const formattedPayments = (payments || []).map(payment => {
            // Extrair tipo de multa da descrição se disponível
            const multaTypeMatch = payment.description?.match(/Recurso de Multa - (\w+)/i) || 
                                  payment.description?.match(/Multa (\w+)/i);
            const multaType = multaTypeMatch ? multaTypeMatch[1] : 'Recurso de Multa';
            
            return {
              id: payment.id,
              payment_id: payment.asaas_payment_id || payment.id,
              service_order_id: payment.external_reference || payment.id,
              customer_id: payment.customer_id,
              customer_name: payment.customer?.nome || 'Cliente não identificado',
              customer_name: payment.customer?.nome || 'Cliente não identificado',
              customer_email: payment.customer?.email,
              customer_phone: payment.customer?.telefone,
              customer_cpf_cnpj: payment.customer?.cpf_cnpj,
              company_id: payment.company_id,
              company_name: payment.company?.nome || 'Empresa',
              amount: payment.amount,
              value: payment.amount,
              credit_amount: payment.credit_amount,
              status: payment.status,
              due_date: payment.due_date,
              created_at: payment.created_at,
              confirmed_at: payment.confirmed_at,
              payment_date: payment.confirmed_at,
              description: payment.description || `Recurso de Multa - ${multaType}`,
              multa_type: multaType,
              payment_method: payment.payment_method || 'PIX',
              method: payment.payment_method || 'PIX',
              asaas_payment_id: payment.asaas_payment_id,
              invoice_url: payment.invoice_url,
              payment_url: payment.payment_url,
              qr_code: payment.qr_code,
              pix_qr_code: payment.pix_qr_code,
              pix_copy_paste: payment.pix_copy_paste,
              // Campos adicionais para melhor experiência
              is_overdue: payment.due_date && new Date(payment.due_date) < new Date() && payment.status === 'pending',
              days_until_due: payment.due_date ? Math.ceil((new Date(payment.due_date) - new Date()) / (1000 * 60 * 60 * 24)) : null,
              formatted_amount: new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(payment.amount || 0),
              formatted_created_date: payment.created_at ? new Date(payment.created_at).toLocaleDateString('pt-BR') : null,
              formatted_due_date: payment.due_date ? new Date(payment.due_date).toLocaleDateString('pt-BR') : null
            };
          });
          
          console.log(`✅ Retornando ${formattedPayments.length} cobranças`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            payments: formattedPayments
          }));
          return;
        } catch (error) {
          console.error('❌ Erro ao buscar todas as cobranças:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor'
          }));
          return;
        }
      }
      
      // GET /api/payments/company/:companyId - Cobranças de uma empresa específica
      if (pathParts.length === 5 && pathParts[3] === 'company' && req.method === 'GET') {
        const companyId = pathParts[4];
        console.log(`🔍 [PAYMENTS] Buscando cobranças da empresa: ${companyId}`);
        
        try {
          // Verificar se companyId é válido
          if (!companyId || companyId === 'undefined' || companyId === 'null') {
            console.error('❌ [PAYMENTS] Company ID inválido:', companyId);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Company ID é obrigatório'
            }));
            return;
          }
          
          // Buscar cobranças de serviços (service_orders) sem JOINs
          console.log('🔍 [PAYMENTS] Buscando service_orders...');
          const { data: serviceOrders, error: serviceError } = await supabase
            .from('service_orders')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });
          
          console.log(`📊 [PAYMENTS] Service orders encontrados: ${serviceOrders?.length || 0}`);
          if (serviceError) {
            console.error('❌ [PAYMENTS] Erro ao buscar service_orders:', serviceError);
          }
          
          // Buscar dados de clientes se houver service_orders
          let clientsData = {};
          if (serviceOrders && serviceOrders.length > 0) {
            const clientIds = [...new Set(serviceOrders.map(order => order.client_id).filter(Boolean))];
            if (clientIds.length > 0) {
              console.log(`🔍 [PAYMENTS] Buscando dados de ${clientIds.length} clientes...`);
              const { data: clients, error: clientsError } = await supabase
                .from('clients')
                .select('id, nome, cpf_cnpj, email, telefone')
                .in('id', clientIds);
              
              if (clients && !clientsError) {
                clientsData = clients.reduce((acc, client) => {
                  acc[client.id] = client;
                  return acc;
                }, {});
                console.log(`✅ [PAYMENTS] Dados de clientes carregados: ${clients.length}`);
              }
            }
          }
          
          // Não buscar payments por enquanto, pois a tabela pode não existir
          const creditPayments = [];
          const creditError = null;
          
          console.log('ℹ️ [PAYMENTS] Pulando busca na tabela payments (pode não existir)');
          
          // Verificar erros
          if (serviceError) {
            console.error('❌ [PAYMENTS] Erro ao buscar service_orders:', serviceError);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro ao buscar cobranças no banco de dados',
              details: serviceError.message
            }));
            return;
          }
          
          // Combinar resultados
          const allPayments = [];
          
          // Adicionar cobranças de serviços (service_orders)
          if (serviceOrders && serviceOrders.length > 0) {
            allPayments.push(...serviceOrders.map(order => {
              const client = clientsData[order.client_id] || {};
              return {
                ...order,
                payment_type: 'service', // Identificar como cobrança de serviço
                payment_id: order.asaas_payment_id || order.payment_id || order.id,
                amount: order.amount,
                asaas_payment_id: order.asaas_payment_id,
                pix_qr_code: order.pix_qr_code || order.qr_code_image,
                pix_copy_paste: order.pix_copy_paste || order.pix_payload,
                payment_method: order.payment_method || 'PIX',
                // Adicionar dados do cliente
                client: client
              };
            }));
          }
          
          // Adicionar compras de créditos (payments)
          if (creditPayments && creditPayments.length > 0) {
            allPayments.push(...creditPayments.map(payment => ({
              ...payment,
              payment_type: 'credit', // Identificar como compra de crédito
              payment_id: payment.asaas_payment_id || payment.id,
              amount: payment.amount
            })));
          }
          
          // Ordenar por data de criação (mais recentes primeiro)
          allPayments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          console.log(`📊 [PAYMENTS] Encontrados ${allPayments.length} pagamentos (${serviceOrders?.length || 0} serviços + ${creditPayments?.length || 0} créditos)`);
          
          // Formatar dados para o frontend
          const formattedPayments = (allPayments || []).map(payment => {
            // Determinar tipo de multa baseado no tipo de pagamento e descrição
            let multaType = 'Não identificado';
            
            if (payment.payment_type === 'service') {
               // Para cobranças de serviços, usar multa_type da service_order
               if (payment.multa_type) {
                 const typeMap = {
                   'leve': 'Multa Leve',
                   'media': 'Multa Média', 
                   'grave': 'Multa Grave',
                   'gravissima': 'Multa Gravíssima'
                 };
                 multaType = typeMap[payment.multa_type] || payment.multa_type;
               } else {
                 multaType = payment.description?.match(/Multa (\w+)/i)?.[1] || 'Recurso de Multa';
               }
             } else if (payment.payment_type === 'credit') {
               // Para compras de créditos
               multaType = 'Compra de Créditos';
             }
            
            return {
              // IDs e referências
              payment_id: payment.payment_id || payment.asaas_payment_id || payment.id,
              service_order_id: payment.external_reference,
              internal_id: payment.id,
              
              // Tipo de pagamento
              payment_type: payment.payment_type,
              
              // Dados financeiros
              amount: parseFloat(payment.amount) || 0,
              status: payment.status || 'unknown',
              
              // URLs e códigos
              payment_url: payment.payment_url || payment.invoice_url,
              qr_code: payment.pix_qr_code || payment.qr_code,
              pix_copy_paste: payment.pix_copy_paste,
              pix_qr_code: payment.pix_qr_code,
              invoice_url: payment.invoice_url || payment.bank_slip_url,
              
              // Dados do cliente
              client_id: payment.client_id,
              customer_name: payment.client?.nome || 'Cliente não identificado',
              client_email: payment.client?.email,
              client_phone: payment.client?.telefone,
              customer_name: payment.client?.nome || 'Cliente não identificado', // Compatibilidade
              customer_id: payment.client_id, // Compatibilidade
              
              // Dados do serviço
              multa_type: multaType,
              description: payment.description || `${multaType} - ${payment.payment_type === 'credit' ? 'Compra de Créditos' : 'Cobrança de Serviço'}`,
              resource_type: payment.resource_type,
              
              // Datas
              created_at: payment.created_at,
              due_date: payment.due_date,
              paid_at: payment.paid_at || payment.payment_date,
              confirmed_at: payment.confirmed_at,
              
              // Método de pagamento
              payment_method: payment.payment_method || 'PIX',
              
              // Status para recurso (apenas para cobranças de serviços)
              can_create_recurso: payment.payment_type === 'service' && ['RECEIVED', 'CONFIRMED', 'confirmed'].includes(payment.status),
              recurso_created: false, // TODO: verificar se já existe recurso
              
              // Dados adicionais
              credit_amount: payment.credit_amount,
              net_value: payment.net_value,
              company_id: payment.company_id,
              company_name: payment.company?.nome || 'Empresa'
            };
          });
          
          console.log(`✅ [PAYMENTS] Retornando ${formattedPayments.length} pagamentos formatados`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            payments: formattedPayments,
            total: formattedPayments.length
          }));
          
        } catch (error) {
          console.error('❌ [PAYMENTS] Erro interno:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
          }));
        }
        return;
      }
      
      // POST /api/payments/:paymentId/manual-payment - Baixa manual (superadmin) - DEVE VIR ANTES DO GET
      if (pathParts.length === 5 && pathParts[4] === 'manual-payment' && req.method === 'POST') {
        const paymentId = pathParts[3];
        
        console.log(`💰 Iniciando baixa manual para pagamento: ${paymentId}`);
        
        try {
          // TODO: Verificar se usuário é superadmin (implementar middleware de auth)
          // const userRole = req.user?.role;
          // if (userRole !== 'superadmin') {
          //   return res.status(403).json({ error: 'Acesso negado. Apenas superadmin pode dar baixa manual.' });
          // }
          
          // 1. Buscar dados do pagamento no Supabase (service_orders)
          console.log(`🔍 Buscando pagamento com ID: ${paymentId}`);
          
          // Tentar buscar por asaas_payment_id primeiro
          let payment = null;
          let paymentError = null;
          
          const { data: paymentByAsaasId, error: errorByAsaasId } = await supabase
            .from('service_orders')
            .select('id, asaas_payment_id, status, value, payment_method')
            .eq('asaas_payment_id', paymentId)
            .single();
          
          if (paymentByAsaasId) {
            payment = paymentByAsaasId;
            console.log('✅ Pagamento encontrado por asaas_payment_id');
          } else {
            // Se não encontrou por asaas_payment_id, tentar por ID
            const { data: paymentById, error: errorById } = await supabase
              .from('service_orders')
              .select('id, asaas_payment_id, status, value, payment_method')
              .eq('id', paymentId)
              .single();
            
            if (paymentById) {
              payment = paymentById;
              console.log('✅ Pagamento encontrado por ID');
            } else {
              paymentError = errorById || errorByAsaasId;
            }
          }
          
          if (paymentError || !payment) {
            console.error('❌ Pagamento não encontrado:', paymentError);
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Pagamento não encontrado'
            }));
            return;
          }
          
          if (payment.status === 'paid' || payment.status === 'confirmed') {
            console.log('⚠️ Pagamento já foi confirmado');
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Pagamento já foi confirmado'
            }));
            return;
          }
          
          // 2. Dar baixa no Asaas se houver asaas_payment_id
          let asaasResult = null;
          if (payment.asaas_payment_id) {
            try {
              // Carregar configuração do Asaas
              const config = await loadAsaasConfig();
              const apiKey = getAsaasApiKey(config);
              const baseUrl = config.environment === 'production' 
                ? 'https://api.asaas.com/v3' 
                : 'https://api-sandbox.asaas.com/v3';
              
              console.log(`🔗 Dando baixa no Asaas: ${payment.asaas_payment_id}`);
              
              const asaasResponse = await fetch(
                `${baseUrl}/payments/${payment.asaas_payment_id}/receiveInCash`,
                {
                  method: 'POST',
                  headers: {
                    'access_token': apiKey,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    paymentDate: new Date().toISOString().split('T')[0], // Data atual no formato YYYY-MM-DD
                    value: Math.max(payment.value || 1.00, 1.00) // Garantir valor mínimo de R$ 1,00
                  })
                }
              );
              
              if (!asaasResponse.ok) {
                const errorText = await asaasResponse.text();
                console.error('❌ Erro no Asaas:', asaasResponse.status, errorText);
                
                try {
                  const errorData = JSON.parse(errorText);
                  throw new Error(`Erro no Asaas: ${errorData.errors?.[0]?.description || 'Erro desconhecido'}`);
                } catch (parseError) {
                  throw new Error(`Erro no Asaas: ${asaasResponse.status} - ${errorText}`);
                }
              }
              
              asaasResult = await asaasResponse.json();
              console.log('✅ Baixa realizada no Asaas com sucesso');
              
            } catch (asaasError) {
              console.error('⚠️ Erro ao dar baixa no Asaas (continuando com baixa manual):', asaasError);
              // Para baixa manual, continuamos mesmo se houver erro no Asaas
              // pois é uma ação administrativa que não depende da confirmação do gateway
            }
          }
          
          // 3. Atualizar status no Supabase (service_orders)
          const { error: updateError } = await supabase
            .from('service_orders')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              payment_method: 'CASH',
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.id);
          
          if (updateError) {
            console.error('❌ Erro ao atualizar status no banco:', updateError);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro ao atualizar status no banco',
              message: updateError.message
            }));
            return;
          }
          
          console.log('✅ Baixa manual realizada com sucesso');
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Baixa manual realizada com sucesso',
            payment_id: paymentId,
            asaas_data: asaasResult
          }));
          return;
          
        } catch (error) {
          console.error('❌ Erro ao processar baixa manual:', error);
          console.error('Stack trace:', error.stack);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
            details: error instanceof Error ? error.stack : String(error)
          }));
          return;
        }
      }
      
      // GET /api/payments/:paymentId - Buscar detalhes do pagamento (APENAS SERVICE_ORDERS)
      if (pathParts.length === 4 && req.method === 'GET' && pathParts[3] !== 'all') {
        const paymentId = pathParts[3];
        
        console.log(`🔍 Buscando detalhes do pagamento: ${paymentId}`);
        console.log(`🎯 USANDO APENAS SERVICE_ORDERS (tabela unificada)`);
        
        // Buscar na tabela service_orders (tabela unificada)
        // Primeiro tentar como asaas_payment_id (string), depois como UUID se falhar
        let serviceOrder = null;
        let serviceOrderError = null;
        
        // Tentar buscar por asaas_payment_id primeiro (para IDs como pay_xxx)
        // Usar limit(1) em vez de single() para lidar com registros duplicados
        const { data: serviceOrderByAsaasArray, error: asaasError } = await supabase
          .from('service_orders')
          .select(`
            *,
            client:clients(id, nome, cpf_cnpj, email, telefone),
            service:services(id, name, description, tipo_multa),
            company:companies(id, nome, cnpj)
          `)
          .eq('asaas_payment_id', paymentId)
          .order('created_at', { ascending: false })
          .limit(1);
        
        const serviceOrderByAsaas = serviceOrderByAsaasArray?.[0] || null;
        
        if (serviceOrderByAsaas) {
          serviceOrder = serviceOrderByAsaas;
          console.log('✅ Encontrado por asaas_payment_id:', paymentId);
        } else {
          // Se não encontrou por asaas_payment_id, tentar por UUID
          const { data: serviceOrderByUuid, error: uuidError } = await supabase
            .from('service_orders')
            .select(`
              *,
              client:clients(id, nome, cpf_cnpj, email, telefone),
              service:services(id, name, description, tipo_multa),
              company:companies(id, nome, cnpj)
            `)
            .eq('id', paymentId)
            .single();
          
          if (serviceOrderByUuid) {
            serviceOrder = serviceOrderByUuid;
            console.log('✅ Encontrado por UUID:', paymentId);
          } else {
            serviceOrderError = uuidError || asaasError;
            console.log('❌ Não encontrado nem por asaas_payment_id nem por UUID:', paymentId);
          }
        }
        
        if (serviceOrderError || !serviceOrder) {
          console.error('❌ Cobrança não encontrada em service_orders:', serviceOrderError);
          res.writeHead(404, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Cobrança não encontrada',
            searched_id: paymentId
          }));
          return;
        }
        
        // Montar resposta com TODOS os dados da service_orders (tabela unificada)
        const responseData = {
          // IDs
          id: serviceOrder.id,
          asaas_payment_id: serviceOrder.asaas_payment_id,
          service_order_id: serviceOrder.id,
          
          // DADOS BÁSICOS
          amount: serviceOrder.amount,
          status: serviceOrder.status,
          description: serviceOrder.payment_description || serviceOrder.description || `${serviceOrder.service?.name} - ${serviceOrder.client?.nome}`,
          
          // DADOS PIX (UNIFICADOS)
          pix_qr_code: serviceOrder.pix_qr_code || serviceOrder.qr_code_image,
          qr_code_image: serviceOrder.qr_code_image || serviceOrder.pix_qr_code,
          pix_payload: serviceOrder.pix_payload || serviceOrder.pix_copy_paste,
          pix_copy_paste: serviceOrder.pix_copy_paste || serviceOrder.pix_payload,
          
          // DADOS DE PAGAMENTO (UNIFICADOS)
          payment_method: serviceOrder.payment_method || 'PIX',
          billing_type: serviceOrder.billing_type || 'PIX',
          invoice_url: serviceOrder.invoice_url,
          payment_link: serviceOrder.payment_link || serviceOrder.invoice_url,
          invoice_number: serviceOrder.invoice_number,
          external_reference: serviceOrder.external_reference,
          
          // DATAS (UNIFICADAS)
          created_at: serviceOrder.created_at,
          date_created: serviceOrder.date_created || serviceOrder.created_at,
          due_date: serviceOrder.due_date,
          paid_at: serviceOrder.paid_at,
          confirmed_at: serviceOrder.confirmed_at,
          payment_date: serviceOrder.payment_date,
          client_payment_date: serviceOrder.client_payment_date,
          
          // VALORES (UNIFICADOS)
          net_value: serviceOrder.net_value || serviceOrder.amount,
          original_value: serviceOrder.original_value || serviceOrder.amount,
          credit_amount: serviceOrder.credit_amount || 0,
          discount_percentage: serviceOrder.discount_percentage || 0,
          
          // DADOS DO SERVIÇO
          service_type: serviceOrder.service_type,
          multa_type: serviceOrder.multa_type,
          service_name: serviceOrder.service?.name,
          tipo_multa: serviceOrder.service?.tipo_multa,
          
          // DADOS DO CLIENTE
          client_name: serviceOrder.client?.nome,
          customer_name: serviceOrder.client?.nome,
          customer_id: serviceOrder.customer_id,
          client_id: serviceOrder.client_id,
          
          // DADOS DA EMPRESA
          company_id: serviceOrder.company_id,
          company_name: serviceOrder.company?.nome,
          
          // SPLITS E CONFIGURAÇÕES
          splits_config: serviceOrder.splits_config,
          splits_details: serviceOrder.splits_details,
          
          // WEBHOOK E DADOS COMPLETOS
          webhook_response: serviceOrder.webhook_response,
          asaas_webhook_data: serviceOrder.asaas_webhook_data,
          
          // METADADOS
          source: 'service_orders_unified',
          table_used: 'service_orders',
          has_all_data: true
        };
        
        console.log('✅ Detalhes da cobrança retornados (service_orders unificada):', {
          id: responseData.id,
          asaas_payment_id: responseData.asaas_payment_id,
          hasQrCode: !!responseData.qr_code_image,
          hasPixPayload: !!responseData.pix_payload,
          hasInvoiceUrl: !!responseData.invoice_url,
          client: responseData.client_name,
          amount: responseData.amount,
          status: responseData.status
        });
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end(JSON.stringify({
          success: true,
          payment: responseData
        }));
        return;
      }
      
      // POST /api/payments/:paymentId/manual-payment - Baixa manual (superadmin)
      if (pathParts.length === 5 && pathParts[4] === 'manual-payment' && req.method === 'POST') {
        const paymentId = pathParts[3];
        
        console.log(`💰 Iniciando baixa manual para pagamento: ${paymentId}`);
        
        try {
          // TODO: Verificar se usuário é superadmin (implementar middleware de auth)
          // const userRole = req.user?.role;
          // if (userRole !== 'superadmin') {
          //   return res.status(403).json({ error: 'Acesso negado. Apenas superadmin pode dar baixa manual.' });
          // }
          
          // 1. Buscar dados do pagamento no Supabase
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .select('id, asaas_payment_id, status, amount, credit_amount')
            .eq('id', paymentId)
            .single();
          
          if (paymentError || !payment) {
            console.error('❌ Pagamento não encontrado:', paymentError);
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Pagamento não encontrado'
            }));
            return;
          }
          
          if (payment.status === 'paid') {
            console.log('⚠️ Pagamento já foi confirmado');
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Pagamento já foi confirmado'
            }));
            return;
          }
          
          // 2. Dar baixa no Asaas se houver asaas_payment_id
          let asaasResult = null;
          if (payment.asaas_payment_id) {
            try {
              // Carregar configuração do Asaas
              const config = await loadAsaasConfig();
              const apiKey = getAsaasApiKey(config);
              const baseUrl = config.environment === 'production' 
                ? 'https://api.asaas.com/v3' 
                : 'https://api-sandbox.asaas.com/v3';
              
              console.log(`🔗 Dando baixa no Asaas: ${payment.asaas_payment_id}`);
              
              const asaasResponse = await fetch(
                `${baseUrl}/payments/${payment.asaas_payment_id}/receiveInCash`,
                {
                  method: 'POST',
                  headers: {
                    'access_token': apiKey,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (!asaasResponse.ok) {
                const errorText = await asaasResponse.text();
                console.error('❌ Erro no Asaas:', asaasResponse.status, errorText);
                
                try {
                  const errorData = JSON.parse(errorText);
                  throw new Error(`Erro no Asaas: ${errorData.errors?.[0]?.description || 'Erro desconhecido'}`);
                } catch (parseError) {
                  throw new Error(`Erro no Asaas: ${asaasResponse.status} - ${errorText}`);
                }
              }
              
              asaasResult = await asaasResponse.json();
              console.log('✅ Baixa realizada no Asaas com sucesso');
              
            } catch (asaasError) {
              console.error('❌ Erro ao dar baixa no Asaas:', asaasError);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Erro ao dar baixa no Asaas',
                message: asaasError.message
              }));
              return;
            }
          }
          
          // 3. Atualizar status no Supabase
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'paid',
              confirmed_at: new Date().toISOString(),
              payment_method: 'cash',
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentId);
          
          if (updateError) {
            console.error('❌ Erro ao atualizar status no banco:', updateError);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro ao atualizar status no banco',
              message: updateError.message
            }));
            return;
          }
          
          console.log('✅ Baixa manual realizada com sucesso');
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Baixa manual realizada com sucesso',
            payment_id: paymentId,
            asaas_data: asaasResult
          }));
          return;
          
        } catch (error) {
          console.error('❌ Erro ao processar baixa manual:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
          }));
          return;
        }
      }
      
      // POST /api/payments/create-service-order - Criar cobrança de serviço
      if (pathParts.length === 4 && pathParts[3] === 'create-service-order' && req.method === 'POST') {
        console.log('🚀 === CRIAR COBRANÇA DE SERVIÇO ===');
        
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            const requestData = JSON.parse(body);
            console.log('📥 Body recebido:', requestData);
            
            const { 
              customer_id, 
              service_id, 
              company_id, 
              valor_cobranca 
            } = requestData;
            
            // Validações
            if (!customer_id || !service_id || !company_id || !valor_cobranca) {
              console.error('❌ Dados obrigatórios ausentes');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Dados obrigatórios: customer_id, service_id, company_id, valor_cobranca'
              }));
              return;
            }
            
            console.log('✅ Validações básicas passaram');
            
            // Buscar o serviço
            console.log('🔍 Buscando serviço:', service_id);
            const { data: service, error: serviceError } = await supabase
              .from('services')
              .select(`
                id, name, description, tipo_multa,
                base_price, suggested_price,
                acsm_value, icetran_value, taxa_cobranca,
                active
              `)
              .eq('id', service_id)
              .eq('active', true)
              .single();
            
            if (serviceError || !service) {
              console.error('❌ Serviço não encontrado:', serviceError);
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Serviço não encontrado',
                details: serviceError?.message
              }));
              return;
            }
            
            console.log('✅ Serviço encontrado:', service.name);
            
            // Buscar cliente
            console.log('🔍 Buscando cliente:', customer_id);
            const { data: client, error: clientError } = await supabase
              .from('clients')
              .select('id, nome, cpf_cnpj, email, asaas_customer_id')
              .eq('id', customer_id)
              .single();
            
            if (clientError || !client) {
              console.error('❌ Cliente não encontrado:', clientError);
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Cliente não encontrado',
                details: clientError?.message
              }));
              return;
            }
            
            console.log('✅ Cliente encontrado:', client.nome);
            
            // Calcular splits
            const custoMinimo = (service.acsm_value || 0) + (service.icetran_value || 0) + (service.taxa_cobranca || 3.50);
            const margemDespachante = Math.max(0, valor_cobranca - custoMinimo);
            
            console.log('💰 Cálculos:');
            console.log('- Valor cobrança:', valor_cobranca);
            console.log('- Custo mínimo:', custoMinimo);
            console.log('- Margem despachante:', margemDespachante);
            
            // Validar valor mínimo
            if (valor_cobranca < custoMinimo) {
              console.error('❌ Valor abaixo do mínimo');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: `Valor mínimo deve ser R$ ${custoMinimo.toFixed(2)}`,
                custo_minimo: custoMinimo,
                valor_informado: valor_cobranca
              }));
              return;
            }
            
            // Buscar wallet da empresa (companies.asaas_wallet_id ou asaas_subaccounts.wallet_id)
            console.log('🏢 Buscando wallet da empresa:', company_id);
            const { data: company, error: companyError } = await supabase
              .from('companies')
              .select(`
                id, nome, asaas_wallet_id,
                asaas_subaccounts!inner(
                  wallet_id, asaas_account_id, status
                )
              `)
              .eq('id', company_id)
              .single();
            
            console.log('🔍 Resultado da busca da empresa:', {
              company_found: !!company,
              has_wallet_in_companies: !!company?.asaas_wallet_id,
              has_subaccount: !!company?.asaas_subaccounts,
              subaccount_wallet: company?.asaas_subaccounts?.[0]?.wallet_id,
              error: companyError
            });
            
            // Determinar qual wallet usar (prioridade: companies.asaas_wallet_id, depois asaas_subaccounts.wallet_id)
            let walletId = null;
            
            if (company?.asaas_wallet_id) {
              walletId = company.asaas_wallet_id;
              console.log('✅ Usando wallet da tabela companies:', walletId);
            } else if (company?.asaas_subaccounts?.[0]?.wallet_id) {
              walletId = company.asaas_subaccounts[0].wallet_id;
              console.log('✅ Usando wallet da tabela asaas_subaccounts:', walletId);
            }
            
            if (companyError || !walletId) {
              console.error('❌ Wallet da empresa não encontrado:', {
                companyError,
                company_id,
                company_data: company
              });
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Wallet da empresa não configurado',
                company_id: company_id,
                debug: {
                  has_company_wallet: !!company?.asaas_wallet_id,
                  has_subaccount_wallet: !!company?.asaas_subaccounts?.[0]?.wallet_id,
                  error: companyError?.message
                }
              }));
              return;
            }
            
            console.log('✅ Wallet encontrado:', walletId);
            
            // Criar splits para Asaas
            const splits = [];
            
            // Split ICETRAN
            if (service.icetran_value > 0) {
              // Buscar wallet da ICETRAN
              const { data: icetranCompany } = await supabase
                .from('companies')
                .select('asaas_wallet_id')
                .eq('company_type', 'icetran')
                .single();
              
              const icetranWalletId = icetranCompany?.asaas_wallet_id || 'eb35cde4-d0f2-44d1-83c0-aaa3496f7ed0';
              
              // Só adiciona split da ICETRAN se for diferente do wallet da empresa
              if (icetranWalletId !== walletId) {
                splits.push({
                  walletId: icetranWalletId,
                  fixedValue: service.icetran_value
                });
              }
            }
            
            // Split Despachante (margem) - Adicionar se há margem e wallet diferente
            if (margemDespachante > 0 && walletId !== 'acsm-wallet-principal') {
              splits.push({
                walletId: walletId,
                fixedValue: margemDespachante
              });
              console.log('✅ Split Despachante adicionado:', margemDespachante, 'para wallet:', walletId);
            } else {
              console.log('⚠️ Split Despachante não adicionado - margem:', margemDespachante, 'wallet:', walletId);
            }
            
            console.log('🔍 Verificando splits:', {
              walletEmpresa: walletId,
              margemDespachante: margemDespachante,
              totalSplits: splits.length
            });
            
            console.log('📊 Splits configurados:', splits);
            
            // Enviar para webhook externo
            console.log('🌐 Enviando para webhook externo...');
            
            const webhookData = {
              wallet_icetran: 'eb35cde4-d0f2-44d1-83c0-aaa3496f7ed0',
              wallet_despachante: walletId,
              Customer_cliente: {
                id: client.id,
                nome: client.nome,
                cpf_cnpj: client.cpf_cnpj,
                email: client.email,
                asaas_customer_id: client.asaas_customer_id
              },
              Valor_cobrança: valor_cobranca,
              Idserviço: service_id,
              descricaoserviço: service.name,
              valoracsm: service.acsm_value || 0,
              valoricetran: service.icetran_value || 0,
              taxa: service.taxa_cobranca || 3.50,
              despachante: {
                company_id: company_id,
                nome: company?.nome,
                wallet_id: walletId,
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
              console.error('❌ Erro ao parsear resposta do webhook:', e);
              webhookResult = { error: 'Resposta não é JSON válido', message: e.message };
            }
            
            // VERIFICAR SE WEBHOOK FOI BEM-SUCEDIDO ANTES DE SALVAR
            if (!webhookResponse.ok) {
              console.error('❌ Webhook falhou - NÃO salvando no banco');
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Erro no webhook externo - cobrança não foi criada',
                webhook_error: webhookResult,
                webhook_status: webhookResponse.status
              }));
              return;
            }
            
            console.log('✅ Webhook processado com sucesso:', webhookResult);
            
            // Processar dados completos retornados pelo webhook
            let paymentData = null;
            if (Array.isArray(webhookResult) && webhookResult.length > 0) {
              paymentData = webhookResult[0]; // Pegar o primeiro item do array
            } else if (webhookResult && typeof webhookResult === 'object') {
              paymentData = webhookResult;
            }
            
            // Verificar se temos dados válidos do webhook
            if (!paymentData || !paymentData.id) {
              console.error('❌ Webhook não retornou dados válidos - NÃO salvando no banco');
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Webhook não retornou dados de pagamento válidos',
                webhook_response: webhookResult
              }));
              return;
            }
            
            // Extrair dados do webhook para salvar no banco
            const webhookPaymentData = {
              asaas_payment_id: paymentData.id,
              customer_id: paymentData.customer || client.asaas_customer_id || client.id,
              qr_code_image: paymentData.encodedImage,
              pix_payload: paymentData.payload,
              pix_qr_code: paymentData.encodedImage,
              pix_copy_paste: paymentData.payload,
              webhook_response: webhookResult,
              // Dados completos do webhook
              date_created: paymentData.dateCreated,
              amount: paymentData.value || valor_cobranca,
              billing_type: paymentData.billingType,
              status: paymentData.status,
              due_date: paymentData.dueDate,
              invoice_url: paymentData.invoiceUrl,
              invoice_number: paymentData.invoiceNumber,
              external_reference: paymentData.externalReference,
              payment_description: paymentData.description,
              splits_details: paymentData.split,
              payment_link: paymentData.invoiceUrl
            };
            
            console.log('💾 Salvando no banco APENAS APÓS webhook bem-sucedido...');
            const { data: serviceOrder, error: saveError } = await supabase
              .from('service_orders')
              .insert({
                client_id: customer_id,
                service_id,
                company_id,
                service_type: 'recurso_multa',
                multa_type: (service.tipo_multa || 'leve').toLowerCase(),
                amount: webhookPaymentData.amount,
                status: (webhookPaymentData.status || 'PENDING').toLowerCase() === 'pending' ? 'pending_payment' : 'pending_payment',
                description: `${service.name} - ${client.nome}`,
                // DADOS DO WEBHOOK (ASAAS)
                asaas_payment_id: webhookPaymentData.asaas_payment_id,
                customer_id: webhookPaymentData.customer_id,
                // DADOS PIX DO WEBHOOK
                qr_code_image: webhookPaymentData.qr_code_image,
                pix_payload: webhookPaymentData.pix_payload,
                pix_qr_code: webhookPaymentData.pix_qr_code,
                pix_copy_paste: webhookPaymentData.pix_copy_paste,
                // DADOS DE PAGAMENTO DO WEBHOOK
                invoice_url: webhookPaymentData.invoice_url,
                invoice_number: webhookPaymentData.invoice_number,
                external_reference: webhookPaymentData.external_reference,
                billing_type: webhookPaymentData.billing_type,
                date_created: webhookPaymentData.date_created,
                due_date: webhookPaymentData.due_date,
                payment_description: webhookPaymentData.payment_description,
                payment_link: webhookPaymentData.payment_link,
                // DADOS DE SPLITS
                splits_details: webhookPaymentData.splits_details,
                splits_config: {
                  acsm_value: service.acsm_value,
                  icetran_value: service.icetran_value,
                  taxa_cobranca: service.taxa_cobranca,
                  margem_despachante: margemDespachante,
                  tipo_multa: service.tipo_multa
                },
                // WEBHOOK RESPONSE COMPLETO
                webhook_response: webhookPaymentData.webhook_response,
                asaas_webhook_data: webhookPaymentData.webhook_response,
                // CAMPOS ADICIONAIS UNIFICADOS
                payment_method: 'PIX',
                net_value: webhookPaymentData.amount,
                original_value: valor_cobranca,
                // DADOS COMPLETOS SALVOS EM NOTES
                notes: JSON.stringify({
                  webhook_data: webhookPaymentData.webhook_response,
                  processed_data: webhookPaymentData,
                  saved_at: new Date().toISOString(),
                  flow_type: 'webhook_first_then_save'
                }),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              })
              .select()
              .single();
            
            if (saveError) {
              console.error('❌ Erro ao salvar no banco:', saveError);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'Erro ao salvar cobrança',
                details: saveError.message
              }));
              return;
            }
            
            console.log('✅ Cobrança salva no banco:', serviceOrder.id);
            console.log('🎯 QR Code salvo:', !!webhookPaymentData.qr_code_image);
            console.log('🎯 PIX Payload salvo:', !!webhookPaymentData.pix_payload);
            
            // Resposta de sucesso com dados REAIS do webhook
            res.writeHead(200, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            });
            res.end(JSON.stringify({
              success: true,
              payment: {
                id: serviceOrder.id,
                webhook_id: webhookPaymentData.asaas_payment_id,
                asaas_payment_id: webhookPaymentData.asaas_payment_id,
                amount: webhookPaymentData.amount,
                // QR CODE E PIX DADOS REAIS DO WEBHOOK
                qr_code: webhookPaymentData.qr_code_image,
                pix_code: webhookPaymentData.pix_payload,
                qr_code_image: webhookPaymentData.qr_code_image,
                pix_payload: webhookPaymentData.pix_payload,
                pix_copy_paste: webhookPaymentData.pix_copy_paste,
                // DADOS DO SERVIÇO
                service_name: service.name,
                tipo_multa: service.tipo_multa,
                description: `${service.name} - ${client.nome}`,
                // DADOS DE PAGAMENTO
                invoice_url: webhookPaymentData.invoice_url,
                payment_link: webhookPaymentData.payment_link,
                due_date: webhookPaymentData.due_date,
                billing_type: webhookPaymentData.billing_type,
                status: 'pending_payment',
                // SPLITS
                splits: {
                  acsm: service.acsm_value,
                  icetran: service.icetran_value,
                  taxa: service.taxa_cobranca,
                  despachante: margemDespachante
                },
                // RESPOSTA COMPLETA DO WEBHOOK
                webhook_response: webhookResult,
                // CONFIRMAÇÃO DE DADOS SALVOS
                saved_data: {
                  service_order_id: serviceOrder.id,
                  has_qr_code: !!webhookPaymentData.qr_code_image,
                  has_pix_payload: !!webhookPaymentData.pix_payload,
                  has_invoice_url: !!webhookPaymentData.invoice_url,
                  flow_type: 'webhook_first_then_save'
                }
              }
            }));
            
            console.log('🎉 Cobrança criada com sucesso!');
            
          } catch (error) {
            console.error('💥 ERRO GERAL:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Erro interno do servidor',
              message: error.message
            }));
          }
        });
        return;
      }
      
      // Rota não encontrada
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Rota de pagamentos não encontrada',
        path: path
      }));
      
    } catch (error) {
      console.error('❌ Erro na API de pagamentos:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
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
      
    } catch (error) {
      console.error('❌ Erro na API de pagamentos:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
    return;
  }

// API de Service Orders
if (req.url && req.url.startsWith('/api/service-orders/')) {
    const path = req.url.split('?')[0]; // Remove query params
    
    // POST /api/service-orders/create - Criar pedido de serviço com cobrança
    if (path === '/api/service-orders/create' && req.method === 'POST') {
    console.log('🎯 === API SERVICE ORDERS CREATE ===');
    console.log('Method:', req.method);
    console.log('Path:', path);
    console.log('Headers:', req.headers);
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        console.log('📥 Request body raw:', body);
        
        if (!body || body.trim() === '') {
          console.error('❌ Request body vazio');
          res.writeHead(400, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Request body não pode estar vazio'
          }));
          return;
        }
        
        let requestData;
        try {
          requestData = JSON.parse(body);
          console.log('📋 Parsed request data:', requestData);
        } catch (parseError) {
          console.error('❌ Erro ao parsear request body:', parseError);
          res.writeHead(400, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Request body deve ser um JSON válido'
          }));
          return;
        }
        
        const { 
          service_type, 
          multa_type, 
          multa_type_name,
          amount, // Valor customizado pelo despachante
          suggested_price,
          cost_price,
          client_id, 
          company_id 
        } = requestData;
        
        console.log('🔍 Validando campos obrigatórios:');
        console.log('  - service_type:', service_type);
        console.log('  - multa_type:', multa_type);
        console.log('  - client_id:', client_id);
        console.log('  - company_id:', company_id);
        console.log('  - amount:', amount);
        
        if (!service_type || !multa_type || !client_id || !company_id) {
          console.error('❌ Campos obrigatórios não fornecidos');
          res.writeHead(400, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Campos service_type, multa_type, client_id e company_id são obrigatórios',
            received: { service_type, multa_type, client_id, company_id }
          }));
          return;
        }
        
        // Validação de valor mínimo se fornecido
        if (amount && cost_price && amount < cost_price) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Valor não pode ser menor que o custo mínimo',
            min_amount: cost_price
          }));
          return;
        }
        
        console.log(`🎯 Criando pedido de serviço: ${service_type} - ${multa_type} para cliente ${client_id}`);
        
        // 1. Buscar configuração do serviço e preço
        const { data: service, error: serviceError } = await supabase
          .from('services')
          .select(`
            *,
            multa_types(*)
          `)
          .eq('category', 'recurso_multa')
          .eq('is_active', true)
          .single();
        
        if (serviceError || !service) {
          console.error('❌ Serviço não encontrado:', serviceError);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Serviço de recurso de multa não encontrado'
          }));
          return;
        }
        
        // 2. Buscar preço baseado no tipo de multa para o serviço específico
        const { data: multaTypeConfig, error: multaError } = await supabase
          .from('multa_types')
          .select('*')
          .eq('service_id', service.id)
          .eq('type', multa_type)
          .eq('active', true)
          .single();
        
        if (multaError || !multaTypeConfig) {
          console.error('❌ Tipo de multa não encontrado:', multaError);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Tipo de multa '${multa_type}' não encontrado`
          }));
          return;
        }
        
        // Usar valor customizado se fornecido, senão usar preço total do tipo
        const finalAmount = amount || multaTypeConfig.total_price || 50.00;
        
        console.log('💰 CONFIGURAÇÃO DO TIPO DE MULTA:');
        console.log('  - Tipo:', multaTypeConfig.type);
        console.log('  - Nome:', multaTypeConfig.name);
        console.log('  - Custo ACSM:', multaTypeConfig.acsm_value);
        console.log('  - Custo ICETRAN:', multaTypeConfig.icetran_value);
        console.log('  - Taxa fixa:', multaTypeConfig.fixed_value);
        console.log('  - Custo mínimo total:', multaTypeConfig.total_price);
        console.log('  - Valor final cobrado:', finalAmount);
        
        // 3. Buscar dados do cliente
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', client_id)
          .single();
        
        if (clientError || !client) {
          console.error('❌ Cliente não encontrado:', clientError);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Cliente não encontrado'
          }));
          return;
        }
        
        // 4. Buscar dados da empresa
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', company_id)
          .single();
        
        if (companyError || !company) {
          console.error('❌ Empresa não encontrada:', companyError);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Empresa não encontrada'
          }));
          return;
        }
        
        // 5. Criar pedido de serviço
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias para expirar
        
        const { data: serviceOrder, error: orderError } = await supabase
          .from('service_orders')
          .insert({
            client_id,
            company_id,
            service_id: service.id,
            service_type,
            multa_type,
            amount: finalAmount, // Usar valor final (customizado ou sugerido)
            status: 'pending_payment',
            expires_at: expiresAt.toISOString(),
            description: `Recurso de Multa - ${(multa_type_name || multaTypeConfig.name).toUpperCase()} - ${client.nome}`
          })
          .select()
          .single();
        
        if (orderError) {
          console.error('❌ Erro ao criar pedido de serviço:', orderError);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro ao criar pedido de serviço',
            details: orderError
          }));
          return;
        }
        
        console.log('✅ Pedido de serviço criado:', serviceOrder.id);
        
        // 6. Criar cobrança PIX no Asaas - SEMPRE usar API key da ACSM (superadmin)
        const config = await loadAsaasConfig();
        const apiKey = getAsaasApiKey(config); // API key da ACSM
        const baseUrl = config.environment === 'production' 
          ? 'https://api.asaas.com/v3' 
          : 'https://api-sandbox.asaas.com/v3';
        
        console.log('🔑 Usando API key da ACSM (superadmin) para criar cobrança');
        console.log('🏢 Cobrança será criada na conta principal da ACSM com splits para terceiros');
        
        // Verificar se cliente tem customer_id no Asaas
        let asaasCustomerId = client.asaas_customer_id;
        
        if (!asaasCustomerId) {
          // Criar customer no Asaas para o cliente
          console.log('🆕 Criando customer no Asaas para cliente:', client.nome);
          
          const customerPayload = {
            name: client.nome,
            cpfCnpj: client.cpf_cnpj,
            email: client.email || `${client.cpf_cnpj}@cliente.com`,
            phone: client.telefone || '',
            address: client.endereco || '',
            addressNumber: '0',
            complement: '',
            province: client.cidade || '',
            city: client.cidade || '',
            state: client.estado || '',
            postalCode: client.cep || ''
          };
          
          const customerResponse = await fetch(`${baseUrl}/customers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'access_token': apiKey
            },
            body: JSON.stringify(customerPayload)
          });
          
          const customerData = await customerResponse.json();
          
          if (!customerResponse.ok) {
            console.error('❌ Erro ao criar customer no Asaas:', customerData);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Erro ao criar customer no Asaas',
              details: customerData
            }));
            return;
          }
          
          asaasCustomerId = customerData.id;
          
          // Atualizar cliente com customer_id
          await supabase
            .from('clients')
            .update({ asaas_customer_id: asaasCustomerId })
            .eq('id', client_id);
          
          console.log('✅ Customer criado no Asaas:', asaasCustomerId);
        }
        
        // 7. Calcular split baseado no custo mínimo
        const custoACSM = multaTypeConfig.acsm_value || 8.00;
        const custoICETRAN = multaTypeConfig.icetran_value || 8.00;
        const taxaFixa = multaTypeConfig.fixed_value || 3.50;
        const custoMinimo = custoACSM + custoICETRAN + taxaFixa;
        
        console.log('💰 CÁLCULO DO SPLIT:');
        console.log('  - Custo ACSM:', custoACSM);
        console.log('  - Custo ICETRAN:', custoICETRAN);
        console.log('  - Taxa fixa:', taxaFixa);
        console.log('  - Custo mínimo total:', custoMinimo);
        console.log('  - Valor cobrado do cliente:', finalAmount);
        
        // Calcular splits - Cobrança via ACSM com splits apenas para terceiros (ICETRAN + Despachante)
        let splits = [];
        
        if (finalAmount > custoMinimo) {
          // Caso normal: cliente paga mais que o custo mínimo
          const valorDespachante = finalAmount - custoMinimo;
          const valorACSM = custoACSM + taxaFixa;
          const valorICETRAN = custoICETRAN;
          
          console.log('📊 DIVISÃO DO SPLIT (Cobrança via ACSM):');
          console.log('  - ICETRAN:', valorICETRAN);
          console.log('  - Despachante:', valorDespachante);
          console.log('  - ACSM (fica automaticamente):', valorACSM);
          
          // 1. Split para ICETRAN - buscar do serviço selecionado
          if (valorICETRAN > 0) {
            let icetranWallet = null;
            
            // Buscar empresa ICETRAN do serviço selecionado
            if (service.icetran_company_id) {
              const { data: icetranFromService } = await supabase
                .from('companies')
                .select('asaas_wallet_id, nome')
                .eq('id', service.icetran_company_id)
                .single();
              
              icetranWallet = icetranFromService?.asaas_wallet_id;
              console.log('🏢 ICETRAN do serviço:', icetranFromService?.nome, 'Wallet:', icetranWallet);
            }
            
            // Fallback: buscar empresa ICETRAN padrão
            if (!icetranWallet) {
              const { data: icetranDefault } = await supabase
                .from('companies')
                .select('asaas_wallet_id, nome')
                .eq('company_type', 'icetran')
                .eq('status', 'ativo')
                .single();
              
              icetranWallet = icetranDefault?.asaas_wallet_id || 'eb35cde4-d0f2-44d1-83c0-aaa3496f7ed0';
              console.log('🏢 ICETRAN padrão:', icetranDefault?.nome, 'Wallet:', icetranWallet);
            }
            
            // Verificar se o wallet da ICETRAN é diferente da conta principal (ACSM)
            if (icetranWallet && icetranWallet !== 'acsm-wallet-principal') {
              splits.push({
                walletId: icetranWallet,
                fixedValue: valorICETRAN
              });
              console.log('✅ Split ICETRAN adicionado:', valorICETRAN, 'para wallet:', icetranWallet);
            } else {
              console.log('⚠️ Wallet ICETRAN igual ao da ACSM - valor fica com ACSM');
            }
          }
          
          // 2. Split para Despachante
          console.log('🔍 DEBUG Split Despachante:');
          console.log('  - valorDespachante:', valorDespachante);
          console.log('  - company_id:', company_id);
          
          if (valorDespachante > 0) {
            // Buscar wallet do despachante (empresa atual)
            const { data: despachanteWallet, error: companyError } = await supabase
              .from('companies')
              .select('asaas_wallet_id')
              .eq('id', company_id)
              .single();
            
            console.log('  - Busca na tabela companies:', { data: despachanteWallet, error: companyError });
            
            // Se não tem wallet na tabela companies, buscar na asaas_subaccounts
            let walletDespachante = despachanteWallet?.asaas_wallet_id;
            
            if (!walletDespachante) {
              const { data: subaccount, error: subaccountError } = await supabase
                .from('asaas_subaccounts')
                .select('wallet_id')
                .eq('company_id', company_id)
                .single();
              
              console.log('  - Busca na tabela asaas_subaccounts:', { data: subaccount, error: subaccountError });
              walletDespachante = subaccount?.wallet_id;
            }
            
            console.log('  - walletDespachante encontrado:', walletDespachante);
            console.log('  - É diferente de acsm-wallet-principal?', walletDespachante !== 'acsm-wallet-principal');
            
            // Verificar se o wallet do despachante é diferente da conta principal (ACSM)
            if (walletDespachante && walletDespachante !== 'acsm-wallet-principal') {
              splits.push({
                walletId: walletDespachante,
                fixedValue: valorDespachante
              });
              console.log('✅ Split Despachante adicionado:', valorDespachante, 'para wallet:', walletDespachante);
            } else {
              console.log('⚠️ Wallet do despachante igual ao da ACSM ou não encontrado - valor fica com ACSM');
              console.log('  - Motivo: walletDespachante =', walletDespachante);
            }
          } else {
            console.log('⚠️ valorDespachante é 0 ou negativo - não há split para despachante');
          }
          
        } else {
          // Caso especial: cliente paga exatamente o custo mínimo
          const valorACSM = custoACSM + taxaFixa;
          const valorICETRAN = custoICETRAN;
          
          console.log('⚠️ COBRANÇA NO CUSTO MÍNIMO (Cobrança via ACSM):');
          console.log('  - ICETRAN:', valorICETRAN);
          console.log('  - ACSM (fica automaticamente):', valorACSM);
          console.log('  - Despachante: R$ 0,00');
          
          // Split apenas para ICETRAN - buscar do serviço selecionado
          if (valorICETRAN > 0) {
            let icetranWallet = null;
            
            // Buscar empresa ICETRAN do serviço selecionado
            if (service.icetran_company_id) {
              const { data: icetranFromService } = await supabase
                .from('companies')
                .select('asaas_wallet_id, nome')
                .eq('id', service.icetran_company_id)
                .single();
              
              icetranWallet = icetranFromService?.asaas_wallet_id;
              console.log('🏢 ICETRAN do serviço:', icetranFromService?.nome, 'Wallet:', icetranWallet);
            }
            
            // Fallback: buscar empresa ICETRAN padrão
            if (!icetranWallet) {
              const { data: icetranDefault } = await supabase
                .from('companies')
                .select('asaas_wallet_id, nome')
                .eq('company_type', 'icetran')
                .eq('status', 'ativo')
                .single();
              
              icetranWallet = icetranDefault?.asaas_wallet_id || '7f9702c1-08da-43c9-b0d3-122130b41ee8';
              console.log('🏢 ICETRAN padrão:', icetranDefault?.nome, 'Wallet:', icetranWallet);
            }
            
            // Verificar se o wallet da ICETRAN é diferente da conta principal (ACSM)
            if (icetranWallet && icetranWallet !== 'acsm-wallet-principal') {
              splits.push({
                walletId: icetranWallet,
                fixedValue: valorICETRAN
              });
              console.log('✅ Split ICETRAN adicionado:', valorICETRAN, 'para wallet:', icetranWallet);
            } else {
              console.log('⚠️ Wallet ICETRAN igual ao da ACSM - valor fica com ACSM');
            }
          }
        }
        
        // 8. Criar cobrança PIX com split
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1); // Vence em 24h
        
        const asaasPayload = {
          customer: asaasCustomerId,
          billingType: 'PIX',
          value: finalAmount, // Usar valor final (customizado ou sugerido)
          dueDate: dueDate.toISOString().split('T')[0],
          description: `Recurso de Multa - ${(multa_type_name || multaTypeConfig.name).toUpperCase()} - ${client.nome}`,
          externalReference: serviceOrder.id
        };
        
        // Adicionar splits ao pagamento (cobrança sempre via ACSM)
        if (splits.length > 0) {
          asaasPayload.split = splits;
          console.log('✅ Splits adicionados ao pagamento:', splits);
          console.log('💰 Cobrança será feita via ACSM com splits para terceiros');
        } else {
          console.log('ℹ️ Nenhum split configurado - ACSM recebe 100%');
        }
        
        console.log('📤 Criando cobrança PIX no Asaas:', asaasPayload);
        
        const asaasResponse = await fetch(`${baseUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': apiKey
          },
          body: JSON.stringify(asaasPayload)
        });
        
        const asaasData = await asaasResponse.json();
        
        if (!asaasResponse.ok) {
          console.error('❌ Erro ao criar cobrança no Asaas:', asaasData);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro ao criar cobrança PIX no Asaas',
            details: asaasData
          }));
          return;
        }
        
        console.log('✅ Cobrança PIX criada no Asaas:', asaasData.id);
        
        // 9. Buscar QR Code do PIX
        let pixQrCode = '';
        let pixCopyAndPaste = '';
        
        try {
          const pixResponse = await fetch(`${baseUrl}/payments/${asaasData.id}/pixQrCode`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'access_token': apiKey
            }
          });
          
          if (pixResponse.ok) {
            const pixData = await pixResponse.json();
            pixQrCode = pixData.encodedImage || '';
            pixCopyAndPaste = pixData.payload || '';
            console.log('✅ QR Code PIX obtido com sucesso');
          }
        } catch (pixError) {
          console.error('❌ Erro ao buscar QR Code PIX:', pixError);
        }
        
        // 10. Primeiro criar registro na tabela payments
        console.log('💾 Salvando pagamento na tabela payments...');
        const { data: paymentRecord, error: paymentError } = await supabase
          .from('payments')
          .insert({
            asaas_payment_id: asaasData.id,
            customer_id: client_id,
            company_id: company_id,
            amount: finalAmount,
            credit_amount: 0, // Para service orders, não há créditos
            status: 'pending',
            payment_method: 'PIX',
            pix_qr_code: pixQrCode,
            pix_copy_paste: pixCopyAndPaste,
            due_date: dueDate.toISOString().split('T')[0]
          })
          .select()
          .single();
        
        if (paymentError) {
          console.error('❌ Erro ao salvar pagamento:', paymentError);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro ao salvar pagamento no banco de dados',
            details: paymentError
          }));
          return;
        }
        
        console.log('✅ Pagamento salvo com UUID:', paymentRecord.id);
        
        // 11. Agora atualizar service_order com o UUID do pagamento E SINCRONIZAR DADOS PIX
        console.log('💾 Atualizando service_order com payment_id e dados PIX...');
        const { error: updateError } = await supabase
          .from('service_orders')
          .update({ 
            payment_id: paymentRecord.id, // Usar UUID da tabela payments
            asaas_payment_id: asaasData.id, // ID do Asaas
            qr_code_image: pixQrCode, // Sincronizar QR code
            pix_payload: pixCopyAndPaste, // Sincronizar PIX payload
            invoice_url: asaasData.invoiceUrl, // URL da fatura
            billing_type: 'PIX', // Tipo de cobrança
            due_date: dueDate.toISOString().split('T')[0] // Data de vencimento
          })
          .eq('id', serviceOrder.id);
        
        if (updateError) {
          console.error('❌ Erro ao atualizar service_order:', updateError);
          // Não retornar erro aqui pois o pagamento já foi criado
          console.log('⚠️ Pagamento criado mas service_order não foi atualizado');
        } else {
          console.log('✅ Service_order atualizado com payment_id e dados PIX sincronizados:', paymentRecord.id);
        }
        
        // 12. Salvar informações do split no banco
        if (splits.length > 0) {
          console.log('💾 Salvando splits no banco de dados...');
          
          for (const split of splits) {
            try {
              await supabase
                .from('payment_splits')
                .insert({
                  payment_id: paymentRecord.id, // Usar UUID da tabela payments
                  asaas_payment_id: asaasData.id, // Manter referência do Asaas
                  recipient_type: 'icetran',
                  wallet_id: split.walletId,
                  split_amount: split.fixedValue,
                  status: 'pending',
                  created_at: new Date().toISOString()
                });
              
              console.log(`✅ Split salvo: R$ ${split.fixedValue} para wallet ${split.walletId}`);
            } catch (splitError) {
              console.error('❌ Erro ao salvar split:', splitError);
            }
          }
        }
        
        const responseData = {
          success: true,
          service_order_id: serviceOrder.id,
          payment_id: paymentRecord.id, // UUID da tabela payments
          asaas_payment_id: asaasData.id, // ID do Asaas
          payment_url: asaasData.invoiceUrl,
          qr_code: pixQrCode,
          pix_copy_paste: pixCopyAndPaste,
          amount: finalAmount,
          due_date: dueDate.toISOString(),
          customer_name: client.nome,
          multa_type: multa_type
        };
        
        console.log('✅ Resposta de sucesso:', responseData);
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end(JSON.stringify(responseData));
        
      } catch (error) {
        console.error('❌ Erro ao criar pedido de serviço:', error);
        console.error('❌ Stack trace:', error.stack);
        
        const errorResponse = {
          success: false,
          error: 'Erro interno do servidor',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString()
        };
        
        console.log('❌ Resposta de erro:', errorResponse);
        
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end(JSON.stringify(errorResponse));
      }
    });
    return;
  }

  // GET /api/service-orders/active - Listar serviços ativos do cliente
  if (path === '/api/service-orders/active' && req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const clientId = url.searchParams.get('client_id');
      
      if (!clientId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'client_id é obrigatório'
        }));
        return;
      }
      
      console.log(`📋 Buscando serviços ativos para cliente: ${clientId}`);
      
      // Buscar serviços ativos do cliente
      const { data: services, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          client:clients(id, nome, cpf_cnpj, email),
          service:services(id, name, description)
        `)
        .eq('client_id', clientId)
        .in('status', ['paid', 'processing', 'completed'])
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar serviços ativos:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Erro ao buscar serviços ativos',
          details: error
        }));
        return;
      }
      
      console.log(`✅ Encontrados ${services?.length || 0} serviços ativos`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        services: services || []
      }));
      
    } catch (error) {
      console.error('❌ Erro na API de serviços ativos:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
    }
    return;
  }
  
  // Rota não encontrada na seção service-orders
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    error: 'Rota de service-orders não encontrada',
    path: path
  }));
  return;
}

  // API de Force Sync
  if (req.url && req.url.startsWith('/api/force-sync/')) {
    const path = req.url.split('?')[0]; // Remove query params
    
    // POST /api/force-sync/:paymentId - Sincronização forçada de cobrança específica
    if (path.match(/^\/api\/force-sync\/[^/]+$/) && req.method === 'POST') {
      console.log('🔄 === SINCRONIZAÇÃO FORÇADA ===');
      console.log('Method:', req.method);
      console.log('Path:', path);
      
      const paymentId = path.split('/').pop();
      console.log('Payment ID:', paymentId);
      
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          let requestData = {};
          if (body) {
            requestData = JSON.parse(body);
          }
          
          const { companyId } = requestData;
          
          if (!companyId) {
            res.writeHead(400, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({
              success: false,
              error: 'Company ID é obrigatório'
            }));
            return;
          }
          
          console.log('Company ID:', companyId);
          console.log('Timestamp:', new Date().toISOString());
          
          // Buscar configuração do Asaas
          const { data: asaasConfig, error: configError } = await supabase
            .from('asaas_subaccounts')
            .select('api_key, wallet_id, asaas_account_id')
            .eq('company_id', companyId)
            .single();
          
          if (configError || !asaasConfig?.api_key) {
            console.error('❌ Configuração do Asaas não encontrada:', configError);
            res.writeHead(404, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({
              success: false,
              error: 'Configuração do Asaas não encontrada'
            }));
            return;
          }
          
          console.log('✅ Configuração encontrada para empresa:', companyId);
          
          // Buscar cobrança específica no Asaas
          const response = await fetch(`https://sandbox.asaas.com/api/v3/payments/${paymentId}`, {
            headers: {
              'access_token': asaasConfig.api_key,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📡 Status da resposta Asaas:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Cobrança não encontrada no Asaas:', response.status, errorText);
            res.writeHead(404, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({
              success: false,
              error: `Cobrança não encontrada no Asaas (${response.status})`
            }));
            return;
          }
          
          const asaasPayment = await response.json();
          console.log('✅ Cobrança encontrada no Asaas:', asaasPayment.id);
          
          // Mapear status do Asaas
          const mapAsaasStatus = (asaasStatus) => {
            const statusMap = {
              'PENDING': 'pending',
              'RECEIVED': 'paid',
              'CONFIRMED': 'paid',
              'OVERDUE': 'overdue',
              'REFUNDED': 'refunded',
              'RECEIVED_IN_CASH': 'paid',
              'REFUND_REQUESTED': 'refund_requested',
              'REFUND_IN_PROGRESS': 'refund_in_progress',
              'CHARGEBACK_REQUESTED': 'chargeback_requested',
              'CHARGEBACK_DISPUTE': 'chargeback_dispute',
              'AWAITING_CHARGEBACK_REVERSAL': 'awaiting_chargeback_reversal',
              'DUNNING_REQUESTED': 'dunning_requested',
              'DUNNING_RECEIVED': 'dunning_received',
              'AWAITING_RISK_ANALYSIS': 'awaiting_risk_analysis'
            };
            return statusMap[asaasStatus] || 'pending';
          };
          
          // Extrair tipo de multa da descrição
          const extractMultaType = (description) => {
            if (!description) return 'Multa Leve';
            const desc = description.toLowerCase();
            if (desc.includes('grave')) return 'Multa Grave';
            if (desc.includes('gravíssima')) return 'Multa Gravíssima';
            if (desc.includes('média')) return 'Multa Média';
            return 'Multa Leve';
          };
          
          // Sincronizar cobrança
          console.log('💾 Sincronizando cobrança:', asaasPayment.id);
          
          // Primeiro verificar se já existe na tabela payments
          const { data: existingPayment } = await supabase
            .from('payments')
            .select('id')
            .eq('asaas_payment_id', asaasPayment.id)
            .single();
          
          let paymentRecord;
          
          if (existingPayment) {
            console.log('✅ Pagamento já existe na tabela payments:', existingPayment.id);
            paymentRecord = existingPayment;
          } else {
            // Criar novo registro na tabela payments
            console.log('💾 Criando novo registro na tabela payments...');
            const { data: newPayment, error: paymentError } = await supabase
              .from('payments')
              .insert({
                asaas_payment_id: asaasPayment.id,
                customer_id: null, // Será preenchido se encontrarmos o cliente
                company_id: companyId,
                amount: asaasPayment.value,
                credit_amount: 0,
                status: mapAsaasStatus(asaasPayment.status),
                payment_method: 'PIX',
                pix_qr_code: asaasPayment.pixTransaction?.qrCode?.encodedImage,
                pix_copy_paste: asaasPayment.pixTransaction?.qrCode?.payload,
                due_date: asaasPayment.dueDate,
                confirmed_at: asaasPayment.paymentDate ? new Date(asaasPayment.paymentDate).toISOString() : null
              })
              .select()
              .single();
            
            if (paymentError) {
              console.error('❌ Erro ao criar pagamento:', paymentError);
              res.writeHead(500, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'http://localhost:5173'
              });
              res.end(JSON.stringify({
                success: false,
                error: 'Erro ao criar pagamento: ' + paymentError.message
              }));
              return;
            }
            
            paymentRecord = newPayment;
            console.log('✅ Pagamento criado com UUID:', paymentRecord.id);
          }
          
          // Agora criar/atualizar na tabela service_orders
          const serviceOrderData = {
            payment_id: paymentRecord.id, // Usar UUID da tabela payments
            company_id: companyId,
            client_id: null, // Será preenchido se encontrarmos o cliente
            service_id: null, // Será preenchido se encontrarmos o serviço
            service_type: 'recurso_multa',
            multa_type: extractMultaType(asaasPayment.description).toLowerCase().replace(' ', '_'),
            amount: asaasPayment.value,
            status: mapAsaasStatus(asaasPayment.status) === 'paid' ? 'paid' : 'pending_payment',
            description: asaasPayment.description,
            created_at: asaasPayment.dateCreated,
            paid_at: asaasPayment.paymentDate,
            synced_from_asaas: true
          };
          
          console.log('📋 Dados para salvar na service_orders:', {
            payment_id: serviceOrderData.payment_id,
            company_id: serviceOrderData.company_id,
            amount: serviceOrderData.amount,
            status: serviceOrderData.status,
            multa_type: serviceOrderData.multa_type
          });
          
          // Verificar se já existe service_order com este payment_id
          const { data: existingOrder } = await supabase
            .from('service_orders')
            .select('id')
            .eq('payment_id', paymentRecord.id)
            .single();
          
          let saved;
          if (existingOrder) {
            // Atualizar existente
            const { data: updated, error } = await supabase
              .from('service_orders')
              .update(serviceOrderData)
              .eq('id', existingOrder.id)
              .select()
              .single();
            
            if (error) {
              console.error('❌ Erro ao atualizar service_order:', error);
            } else {
              saved = updated;
              console.log('✅ Service_order atualizado:', saved.id);
            }
          } else {
            // Criar novo (precisa de client_id e service_id válidos)
            // Por enquanto, vamos tentar encontrar um serviço padrão
            const { data: defaultService } = await supabase
              .from('services')
              .select('id')
              .eq('category', 'recurso_multa')
              .eq('is_active', true)
              .limit(1)
              .single();
            
            if (defaultService) {
              serviceOrderData.service_id = defaultService.id;
              
              // Tentar encontrar cliente pelo nome ou criar um genérico
              const clientName = asaasPayment.customer?.name || 'Cliente não identificado';
              let clientId = null;
              
              if (asaasPayment.customer?.cpfCnpj) {
                const { data: existingClient } = await supabase
                  .from('clients')
                  .select('id')
                  .eq('cpf_cnpj', asaasPayment.customer.cpfCnpj)
                  .eq('company_id', companyId)
                  .single();
                
                if (existingClient) {
                  clientId = existingClient.id;
                } else {
                  // Criar cliente temporário
                  const { data: newClient } = await supabase
                    .from('clients')
                    .insert({
                      company_id: companyId,
                      nome: clientName,
                      cpf_cnpj: asaasPayment.customer.cpfCnpj,
                      email: asaasPayment.customer.email || '',
                      telefone: asaasPayment.customer.phone || '',
                      synced_from_asaas: true
                    })
                    .select('id')
                    .single();
                  
                  if (newClient) {
                    clientId = newClient.id;
                    console.log('✅ Cliente criado:', clientId);
                  }
                }
              }
              
              if (clientId) {
                serviceOrderData.client_id = clientId;
                
                const { data: created, error } = await supabase
                  .from('service_orders')
                  .insert(serviceOrderData)
                  .select()
                  .single();
                
                if (error) {
                  console.error('❌ Erro ao criar service_order:', error);
                } else {
                  saved = created;
                  console.log('✅ Service_order criado:', saved.id);
                }
              } else {
                console.log('⚠️ Não foi possível criar service_order: cliente não encontrado');
              }
            } else {
              console.log('⚠️ Não foi possível criar service_order: serviço padrão não encontrado');
            }
          }
          
          const error = !saved ? { message: 'Não foi possível sincronizar service_order' } : null;
          
          if (error) {
            console.error('❌ Erro ao salvar:', error);
            res.writeHead(500, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            });
            res.end(JSON.stringify({
              success: false,
              error: error.message
            }));
            return;
          }
          
          console.log('✅ Cobrança sincronizada com sucesso:', saved.id);
          
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: true,
            message: 'Cobrança sincronizada com sucesso',
            payment: saved
          }));
          
        } catch (error) {
          console.error('💥 Erro na sincronização forçada:', error);
          res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: error.message
          }));
        }
      });
      return;
    }
    
    // GET /api/force-sync/test/:companyId - Testar conexão com Asaas
    if (path.match(/^\/api\/force-sync\/test\/[^/]+$/) && req.method === 'GET') {
      console.log('🧪 === TESTE DE CONEXÃO ASAAS ===');
      
      const companyId = path.split('/').pop();
      console.log('Company ID:', companyId);
      
      try {
        // Buscar configuração do Asaas
        const { data: asaasConfig, error: configError } = await supabase
          .from('asaas_subaccounts')
          .select('api_key, wallet_id, asaas_account_id')
          .eq('company_id', companyId)
          .single();
        
        if (configError || !asaasConfig?.api_key) {
          res.writeHead(404, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Configuração do Asaas não encontrada',
            details: configError
          }));
          return;
        }
        
        // Testar conexão listando cobranças
        const response = await fetch('https://sandbox.asaas.com/api/v3/payments?limit=5', {
          headers: {
            'access_token': asaasConfig.api_key,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: true,
            message: 'Conexão com Asaas funcionando',
            config: {
              wallet_id: asaasConfig.wallet_id,
              account_id: asaasConfig.asaas_account_id,
              api_key_preview: asaasConfig.api_key.substring(0, 20) + '...'
            },
            asaas_data: {
              total_payments: result.totalCount,
              payments_in_page: result.data?.length || 0
            }
          }));
        } else {
          const errorText = await response.text();
          res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Erro na conexão com Asaas',
            details: errorText
          }));
        }
      } catch (error) {
        console.error('💥 Erro no teste:', error);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
      return;
    }
    
    // POST /api/force-sync/sync-all/:companyId - Sincronização massiva de todas as cobranças
    if (path.match(/^\/api\/force-sync\/sync-all\/[^/]+$/) && req.method === 'POST') {
      console.log('🔄 === SINCRONIZAÇÃO MASSIVA ===');
      
      const companyId = path.split('/').pop();
      console.log('Company ID:', companyId);
      
      try {
        // Buscar configuração do Asaas
        const { data: asaasConfig, error: configError } = await supabase
          .from('asaas_subaccounts')
          .select('api_key, wallet_id, asaas_account_id')
          .eq('company_id', companyId)
          .single();
        
        if (configError || !asaasConfig?.api_key) {
          console.error('❌ Configuração do Asaas não encontrada:', configError);
          res.writeHead(404, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Configuração do Asaas não encontrada'
          }));
          return;
        }
        
        console.log('✅ Configuração encontrada para empresa:', companyId);
        
        // Buscar TODAS as cobranças do Asaas (com paginação)
        let allPayments = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;
        
        while (hasMore) {
          const response = await fetch(`https://sandbox.asaas.com/api/v3/payments?limit=${limit}&offset=${offset}`, {
            headers: {
              'access_token': asaasConfig.api_key,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro ao buscar cobranças do Asaas:', response.status, errorText);
            break;
          }
          
          const asaasData = await response.json();
          console.log(`📡 Página ${Math.floor(offset/limit) + 1}: ${asaasData.data?.length || 0} cobranças`);
          
          if (asaasData.data && asaasData.data.length > 0) {
            allPayments = allPayments.concat(asaasData.data);
            offset += limit;
            
            // Se retornou menos que o limit, não há mais páginas
            if (asaasData.data.length < limit) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
        
        console.log(`📊 Total de cobranças encontradas no Asaas: ${allPayments.length}`);
        
        let syncedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Mapear status do Asaas
        const mapAsaasStatus = (asaasStatus) => {
          const statusMap = {
            'PENDING': 'pending',
            'RECEIVED': 'paid',
            'CONFIRMED': 'paid',
            'OVERDUE': 'overdue',
            'REFUNDED': 'refunded',
            'RECEIVED_IN_CASH': 'paid',
            'REFUND_REQUESTED': 'refund_requested',
            'REFUND_IN_PROGRESS': 'refund_in_progress',
            'CHARGEBACK_REQUESTED': 'chargeback_requested',
            'CHARGEBACK_DISPUTE': 'chargeback_dispute',
            'AWAITING_CHARGEBACK_REVERSAL': 'awaiting_chargeback_reversal',
            'DUNNING_REQUESTED': 'dunning_requested',
            'DUNNING_RECEIVED': 'dunning_received',
            'AWAITING_RISK_ANALYSIS': 'awaiting_risk_analysis'
          };
          return statusMap[asaasStatus] || 'pending';
        };
        
        // Extrair tipo de multa da descrição
        const extractMultaType = (description) => {
          if (!description) return 'leve';
          const desc = description.toLowerCase();
          if (desc.includes('gravíssima')) return 'gravissima';
          if (desc.includes('grave')) return 'grave';
          if (desc.includes('média')) return 'media';
          return 'leve';
        };
        
        // Buscar serviço padrão
        const { data: defaultService } = await supabase
          .from('services')
          .select('id')
          .eq('category', 'recurso_multa')
          .eq('is_active', true)
          .limit(1)
          .single();
        
        if (!defaultService) {
          res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          });
          res.end(JSON.stringify({
            success: false,
            error: 'Serviço padrão de recurso de multa não encontrado'
          }));
          return;
        }
        
        // Sincronizar cada cobrança
        for (const payment of allPayments) {
          try {
            console.log(`🔄 Processando cobrança ${payment.id}...`);
            
            // Verificar se já existe na tabela payments
            const { data: existingPayment } = await supabase
              .from('payments')
              .select('id')
              .eq('asaas_payment_id', payment.id)
              .single();
            
            let paymentRecord;
            let isNew = false;
            
            if (existingPayment) {
              paymentRecord = existingPayment;
              console.log(`  ✅ Pagamento já existe: ${paymentRecord.id}`);
            } else {
              // Criar novo registro na tabela payments
              const { data: newPayment, error: paymentError } = await supabase
                .from('payments')
                .insert({
                  asaas_payment_id: payment.id,
                  customer_id: null,
                  company_id: companyId,
                  amount: payment.value,
                  credit_amount: 0,
                  status: mapAsaasStatus(payment.status),
                  payment_method: 'PIX',
                  pix_qr_code: payment.pixTransaction?.qrCode?.encodedImage,
                  pix_copy_paste: payment.pixTransaction?.qrCode?.payload,
                  due_date: payment.dueDate,
                  confirmed_at: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : null
                })
                .select()
                .single();
              
              if (paymentError) {
                console.error(`  ❌ Erro ao criar pagamento ${payment.id}:`, paymentError.message);
                errors.push({ paymentId: payment.id, error: paymentError.message });
                errorCount++;
                continue;
              }
              
              paymentRecord = newPayment;
              isNew = true;
              console.log(`  ✅ Pagamento criado: ${paymentRecord.id}`);
            }
            
            // Verificar se já existe service_order
            const { data: existingOrder } = await supabase
              .from('service_orders')
              .select('id')
              .eq('payment_id', paymentRecord.id)
              .single();
            
            if (!existingOrder) {
              // Tentar encontrar ou criar cliente
              let clientId = null;
              
              if (payment.customer?.cpfCnpj) {
                const { data: existingClient } = await supabase
                  .from('clients')
                  .select('id')
                  .eq('cpf_cnpj', payment.customer.cpfCnpj)
                  .eq('company_id', companyId)
                  .single();
                
                if (existingClient) {
                  clientId = existingClient.id;
                } else {
                  // Criar cliente
                  const { data: newClient } = await supabase
                    .from('clients')
                    .insert({
                      company_id: companyId,
                      nome: payment.customer.name || 'Cliente não identificado',
                      cpf_cnpj: payment.customer.cpfCnpj,
                      email: payment.customer.email || '',
                      telefone: payment.customer.phone || '',
                      synced_from_asaas: true
                    })
                    .select('id')
                    .single();
                  
                  if (newClient) {
                    clientId = newClient.id;
                    console.log(`  ✅ Cliente criado: ${clientId}`);
                  }
                }
              }
              
              if (clientId) {
                // Criar service_order
                const { data: created, error: orderError } = await supabase
                  .from('service_orders')
                  .insert({
                    payment_id: paymentRecord.id,
                    company_id: companyId,
                    client_id: clientId,
                    service_id: defaultService.id,
                    service_type: 'recurso_multa',
                    multa_type: extractMultaType(payment.description),
                    amount: payment.value,
                    status: mapAsaasStatus(payment.status) === 'paid' ? 'paid' : 'pending_payment',
                    description: payment.description,
                    created_at: payment.dateCreated,
                    paid_at: payment.paymentDate,
                    synced_from_asaas: true
                  })
                  .select()
                  .single();
                
                if (orderError) {
                  console.error(`  ❌ Erro ao criar service_order para ${payment.id}:`, orderError.message);
                  errors.push({ paymentId: payment.id, error: orderError.message });
                  errorCount++;
                } else {
                  if (isNew) {
                    syncedCount++;
                  } else {
                    updatedCount++;
                  }
                  console.log(`  ✅ Service_order criado: ${created.id}`);
                }
              } else {
                console.log(`  ⚠️ Cliente não encontrado para cobrança ${payment.id}`);
                errors.push({ paymentId: payment.id, error: 'Cliente não encontrado' });
                errorCount++;
              }
            } else {
              console.log(`  ✅ Service_order já existe: ${existingOrder.id}`);
              if (isNew) {
                syncedCount++;
              } else {
                updatedCount++;
              }
            }
            
          } catch (error) {
            console.error(`  ❌ Erro ao processar cobrança ${payment.id}:`, error.message);
            errors.push({ paymentId: payment.id, error: error.message });
            errorCount++;
          }
        }
        
        console.log('📊 RESULTADO DA SINCRONIZAÇÃO:');
        console.log(`  - Total no Asaas: ${allPayments.length}`);
        console.log(`  - Novos sincronizados: ${syncedCount}`);
        console.log(`  - Atualizados: ${updatedCount}`);
        console.log(`  - Erros: ${errorCount}`);
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: true,
          message: 'Sincronização massiva concluída',
          asaas_total: allPayments.length,
          synced_count: syncedCount,
          updated_count: updatedCount,
          error_count: errorCount,
          errors: errors.slice(0, 10) // Mostrar apenas os primeiros 10 erros
        }));
        
      } catch (error) {
        console.error('💥 Erro na sincronização massiva:', error);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
      return;
    }
    
    // Rota não encontrada na seção force-sync
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Rota de force-sync não encontrada',
      path: path
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
      // Carregar configuração do Asaas
      const config = await loadAsaasConfig();
      
      // Verificar se há uma API key específica no header da requisição
      let apiKey;
      if (req.headers['access_token'] && req.headers['access_token'] !== 'TESTE') {
        // Usar API key específica da subconta
        apiKey = req.headers['access_token'];
        console.log(`🔑 Usando API Key da subconta: ${apiKey.substring(0, 15)}...`);
      } else {
        // Usar API key master do banco
        apiKey = getAsaasApiKey(config);
        console.log(`🔑 Usando API Key master: ${apiKey.substring(0, 10)}...`);
      }
      
      // Extrair a parte da URL após /api/asaas-proxy/
      const asaasPath = req.url.replace('/api/asaas-proxy/', '');
      
      // Determinar URL base baseada no ambiente
      const baseUrl = config.environment === 'production' 
        ? 'https://api.asaas.com/v3' 
        : 'https://api-sandbox.asaas.com/v3';
      
      const targetUrl = `${baseUrl}/${asaasPath}`;
      
      console.log(`🔗 Proxy request: ${req.method} ${targetUrl}`);
      console.log(`🔑 Usando ambiente: ${config.environment}`);
      
      // Configurar headers para a requisição
      const headers = {
        'Content-Type': 'application/json',
        'access_token': apiKey // Usar a chave selecionada
      };
      
      // Não repassar headers de autorização do frontend, usar apenas a chave do banco
      // if (req.headers.authorization) {
      //   headers['Authorization'] = req.headers.authorization;
      // }
      // 
      // if (req.headers['access_token']) {
      //   headers['access_token'] = req.headers['access_token'];
      // }
      
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