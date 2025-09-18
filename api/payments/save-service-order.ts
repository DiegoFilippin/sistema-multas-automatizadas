import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Variáveis do Supabase não configuradas!');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

// Função para converter data brasileira para ISO
const convertDateToISO = (dateStr: string) => {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://sistema-multas-automatizadas.vercel.app' : 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, access_token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    console.log('💾 === SALVAR DADOS DO WEBHOOK ===');
    console.log('📦 Dados recebidos do webhook:', req.body);
    
    const { 
      webhook_data, 
      customer_id, 
      service_id, 
      company_id,
      valor_cobranca
    } = req.body;
    
    // Validar dados obrigatórios
    if (!webhook_data || !customer_id || !service_id || !company_id) {
      res.status(400).json({ 
        success: false,
        error: 'Dados obrigatórios não fornecidos',
        required: ['webhook_data', 'customer_id', 'service_id', 'company_id']
      });
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
      
      res.status(404).json({ 
        success: false,
        error: 'Cliente não encontrado no banco de dados',
        customer_id: customer_id,
        message: 'O cliente deve ser criado antes de gerar a cobrança'
      });
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
    
    // Preparar dados para inserção na tabela service_orders
    const insertData = {
      client_id: customer_id,
      service_id: service_id,
      company_id: company_id,
      service_type: 'recurso_multa',
      multa_type: req.body.multa_type || webhook_data.multa_type || (['leve', 'media', 'grave', 'gravissima'].includes(service.category) ? service.category : 'grave'),
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
      res.status(500).json({ 
        success: false,
        error: 'Erro ao salvar no banco de dados',
        details: insertError.message
      });
      return;
    }
    
    console.log('✅ Dados salvos no banco com sucesso!');
    console.log('🆔 ID do registro:', insertResult.id);
    
    res.status(200).json({
      success: true,
      message: 'Dados salvos com sucesso',
      service_order_id: insertResult.id,
      payment_id: webhook_data.id
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar salvamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}