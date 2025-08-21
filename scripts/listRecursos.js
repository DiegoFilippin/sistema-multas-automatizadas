import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listRecursos() {
  console.log('📋 Listando todos os recursos disponíveis...');
  console.log('=' .repeat(60));
  
  try {
    // Buscar todos os recursos
    const { data: recursos, error } = await supabase
      .from('recursos')
      .select(`
        id,
        tipo_recurso,
        status,
        created_at,
        multas!inner(
          numero_auto,
          placa_veiculo,
          valor_original,
          valor_final,
          codigo_infracao,
          clients!inner(nome)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('❌ Erro ao buscar recursos:', error.message);
      return;
    }
    
    if (!recursos || recursos.length === 0) {
      console.log('❌ Nenhum recurso encontrado');
      return;
    }
    
    console.log(`✅ Encontrados ${recursos.length} recursos:`);
    console.log('');
    
    recursos.forEach((recurso, index) => {
      console.log(`${index + 1}. ID: ${recurso.id}`);
      console.log(`   Tipo: ${recurso.tipo_recurso}`);
      console.log(`   Status: ${recurso.status}`);
      console.log(`   Data: ${new Date(recurso.created_at).toLocaleString('pt-BR')}`);
      console.log(`   Cliente: ${recurso.multas.clients.nome}`);
      console.log(`   Auto: ${recurso.multas.numero_auto}`);
      console.log(`   Placa: ${recurso.multas.placa_veiculo}`);
      console.log(`   Valor: R$ ${(recurso.multas.valor_final || recurso.multas.valor_original).toFixed(2)}`);
      console.log(`   Código: ${recurso.multas.codigo_infracao}`);
      console.log('');
    });
    
    // Buscar especificamente o ID mencionado
    console.log('🔍 Buscando especificamente o ID: 24134a30-2e5a-41dd-8938-c93caaf40772');
    const { data: recursoEspecifico, error: errorEspecifico } = await supabase
      .from('recursos')
      .select('*')
      .eq('id', '24134a30-2e5a-41dd-8938-c93caaf40772');
    
    if (errorEspecifico) {
      console.log('❌ Erro ao buscar ID específico:', errorEspecifico.message);
    } else if (!recursoEspecifico || recursoEspecifico.length === 0) {
      console.log('❌ ID específico não encontrado na base de dados');
    } else {
      console.log('✅ ID específico encontrado:', recursoEspecifico.length, 'registro(s)');
    }
    
  } catch (error) {
    console.error('❌ Erro durante listagem:', error.message);
  }
}

// Executar listagem
listRecursos();