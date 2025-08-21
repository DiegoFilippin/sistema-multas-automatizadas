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

async function listAllRecursos() {
  const targetId = '24134a30-2e5a-41dd-8938-c93caaf40772';
  
  console.log('📋 Listando todos os recursos para análise...');
  console.log('🎯 Procurando por:', targetId);
  console.log('=' .repeat(80));
  
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
      .limit(50);
    
    if (error) {
      console.error('❌ Erro ao buscar recursos:', error.message);
      return;
    }
    
    if (!recursos || recursos.length === 0) {
      console.log('❌ Nenhum recurso encontrado');
      return;
    }
    
    console.log(`📊 Total de recursos encontrados: ${recursos.length}`);
    console.log('');
    
    // Verificar se o ID alvo está na lista
    const recursoAlvo = recursos.find(r => r.id === targetId);
    if (recursoAlvo) {
      console.log('🎯 RECURSO ALVO ENCONTRADO!');
      console.log('=' .repeat(40));
      printRecursoDetails(recursoAlvo);
      console.log('');
    } else {
      console.log('❌ Recurso alvo NÃO encontrado na lista dos 50 mais recentes');
      console.log('');
    }
    
    // Agrupar por tipo
    const porTipo = recursos.reduce((acc, recurso) => {
      acc[recurso.tipo_recurso] = (acc[recurso.tipo_recurso] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📈 RECURSOS POR TIPO:');
    Object.entries(porTipo).forEach(([tipo, count]) => {
      console.log(`  • ${tipo}: ${count}`);
    });
    console.log('');
    
    // Mostrar alguns exemplos de cada tipo
    console.log('📋 EXEMPLOS DE RECURSOS:');
    console.log('');
    
    const tiposUnicos = [...new Set(recursos.map(r => r.tipo_recurso))];
    
    tiposUnicos.forEach(tipo => {
      const exemplos = recursos.filter(r => r.tipo_recurso === tipo).slice(0, 3);
      console.log(`🔹 TIPO: ${tipo.toUpperCase()}`);
      exemplos.forEach((recurso, index) => {
        console.log(`  ${index + 1}. ID: ${recurso.id}`);
        console.log(`     Cliente: ${recurso.multas.clients.nome}`);
        console.log(`     Placa: ${recurso.multas.placa_veiculo}`);
        console.log(`     Valor: R$ ${(recurso.multas.valor_original || recurso.multas.valor_final || 0).toFixed(2)}`);
        console.log(`     Data: ${new Date(recurso.created_at).toLocaleDateString('pt-BR')}`);
        console.log('');
      });
    });
    
    // Buscar especificamente por partes do ID
    console.log('🔍 BUSCA POR PARTES DO ID ALVO:');
    const partes = targetId.split('-');
    console.log(`  Partes do ID: ${partes.join(' | ')}`);
    
    for (const parte of partes) {
      if (parte.length >= 4) { // Só buscar partes com pelo menos 4 caracteres
        const recursosComParte = recursos.filter(r => r.id.includes(parte));
        if (recursosComParte.length > 0) {
          console.log(`  ✅ Encontrados ${recursosComParte.length} recursos contendo "${parte}":`);
          recursosComParte.slice(0, 3).forEach(r => {
            console.log(`    - ${r.id}`);
          });
        } else {
          console.log(`  ❌ Nenhum recurso contém "${parte}"`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro durante listagem:', error.message);
  }
  
  console.log('');
  console.log('=' .repeat(80));
  console.log('✅ Listagem concluída');
}

function printRecursoDetails(recurso) {
  console.log(`  ID: ${recurso.id}`);
  console.log(`  Tipo: ${recurso.tipo_recurso}`);
  console.log(`  Status: ${recurso.status}`);
  console.log(`  Cliente: ${recurso.multas.clients.nome}`);
  console.log(`  Placa: ${recurso.multas.placa_veiculo}`);
  console.log(`  Auto: ${recurso.multas.numero_auto}`);
  console.log(`  Valor: R$ ${(recurso.multas.valor_original || recurso.multas.valor_final || 0).toFixed(2)}`);
  console.log(`  Criado: ${new Date(recurso.created_at).toLocaleString('pt-BR')}`);
}

// Executar listagem
listAllRecursos();