import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Criar cliente Supabase diretamente aqui
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, access_token, x-asaas-env');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('📥 Requisição recebida:', req.method, req.url);

  try {
    // Verificar se Supabase está configurado
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase não configurado');
      return res.status(500).json({ 
        error: 'Configuração do servidor incompleta',
        details: 'Supabase não configurado'
      });
    }
    if (req.method === 'POST') {
      console.log('📝 Processando criação de pré-cadastro');
      
      // Criar pré-cadastro
      const {
        nome,
        email,
        telefone,
        data_nascimento,
        cnpj,
        razao_social,
        nome_fantasia,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        cep,
        observacoes
      } = req.body;

      console.log('📋 Dados recebidos:', { nome, email, telefone, cnpj, razao_social });

      // Validações básicas
      if (!nome || !email || !telefone || !cnpj || !razao_social) {
        console.log('❌ Validação falhou - campos obrigatórios faltando');
        return res.status(400).json({ 
          error: 'Campos obrigatórios: nome, email, telefone, cnpj, razao_social' 
        });
      }

      console.log('💾 Salvando no banco de dados...');
      
      // Salvar no banco de dados
      const { data: precadastro, error: dbError } = await supabase
        .from('precadastros')
        .insert({
          nome,
          email,
          telefone,
          data_nascimento,
          cnpj,
          razao_social,
          nome_fantasia,
          endereco,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          cep,
          observacoes,
          status: 'pendente',
          webhook_enviado: false
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Erro ao salvar pré-cadastro:', dbError);
        return res.status(500).json({ 
          error: 'Erro ao salvar pré-cadastro no banco de dados',
          message: dbError.message,
          details: dbError.details || dbError.hint
        });
      }

      console.log('✅ Pré-cadastro salvo com sucesso:', precadastro?.id);

      // Tentar enviar webhook (não bloquear se falhar)
      try {
        const webhookUrl = process.env.WEBHOOK_PRECADASTRO_URL;
        if (webhookUrl) {
          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(precadastro)
          });

          const webhookSuccess = webhookResponse.ok;
          const webhookResponseText = await webhookResponse.text();

          // Atualizar status do webhook no banco
          await supabase
            .from('precadastros')
            .update({
              webhook_enviado: webhookSuccess,
              webhook_response: webhookResponseText,
              updated_at: new Date().toISOString()
            })
            .eq('id', precadastro.id);
        }
      } catch (webhookError) {
        console.error('Erro ao enviar webhook:', webhookError);
        // Não falhar a requisição se o webhook falhar
      }

      return res.status(201).json({ 
        success: true, 
        message: 'Pré-cadastro realizado com sucesso!',
        precadastro 
      });

    } else if (req.method === 'GET') {
      // Listar pré-cadastros (requer autenticação)
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      const { data: precadastros, error } = await supabase
        .from('precadastros')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar pré-cadastros:', error);
        return res.status(500).json({ error: 'Erro ao buscar pré-cadastros' });
      }

      return res.json({ precadastros });

    } else {
      return res.status(405).json({ error: 'Método não permitido' });
    }

  } catch (error: any) {
    console.error('❌ Erro no endpoint de pré-cadastros:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error?.message || 'Erro desconhecido',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
