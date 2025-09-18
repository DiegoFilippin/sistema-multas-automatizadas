import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Variáveis do Supabase não configuradas!');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

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
    console.log('🔍 === BUSCAR SALDO DE CRÉDITOS ===');
    
    const { ownerType, ownerId } = req.query;
    
    console.log('Owner Type:', ownerType);
    console.log('Owner ID:', ownerId);
    
    if (!ownerId) {
      res.status(400).json({
        success: false,
        error: 'Owner ID é obrigatório'
      });
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
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar créditos'
      });
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
    
    res.status(200).json({
      success: true,
      data: {
        currentBalance,
        transactions: credits || []
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar saldo de créditos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}