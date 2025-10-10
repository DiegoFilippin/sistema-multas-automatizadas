import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findRecursosConversao() {
  console.log('🔍 Buscando Recursos de Conversão (Art. 267 CTB)');
  console.log('=' .repeat(80));
  
  try {
    // Buscar recursos recentes
    const { data: recursos, error: recursoError } = await supabase
      .from('recursos')
      .select(`
        id,
        tipo_recurso,
        status,
        created_at,
        numero_processo,
        fundamentacao,
        multas!inner(
          id,
          numero_auto,
          placa_veiculo,
          valor_original,
          valor_final,
          codigo_infracao,
          descricao_infracao,
          clients!inner(
            nome,
            cpf_cnpj
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (recursoError) {
      console.error('❌ Erro ao buscar recursos:', recursoError.message);
      return;
    }
    
    if (!recursos || recursos.length === 0) {
      console.log('❌ Nenhum recurso encontrado');
      return;
    }
    
    console.log(`📋 Encontrados ${recursos.length} recursos recentes:`);
    console.log('');
    
    // Filtrar recursos de conversão
    const recursosConversao = recursos.filter(r => r.tipo_recurso === 'conversao');
    
    console.log('🎯 RECURSOS DE CONVERSÃO (Art. 267):');
    console.log('=' .repeat(50));
    
    if (recursosConversao.length === 0) {
      console.log('❌ Nenhum recurso de conversão encontrado');
    } else {
      recursosConversao.forEach((recurso, index) => {
        const multa = recurso.multas;
        const cliente = multa.clients;
        const valor = multa.valor_original || multa.valor_final || 0;
        const isLeve = valor <= 293.47;
        
        console.log(`\n${index + 1}. 📄 RECURSO DE CONVERSÃO:`);
        console.log(`   ID: ${recurso.id}`);
        console.log(`   Status: ${recurso.status}`);
        console.log(`   Data: ${new Date(recurso.created_at).toLocaleString('pt-BR')}`);
        console.log(`   Cliente: ${cliente.nome}`);
        console.log(`   Auto: ${multa.numero_auto}`);
        console.log(`   Placa: ${multa.placa_veiculo}`);
        console.log(`   Valor: R$ ${valor.toFixed(2)} ${isLeve ? '(LEVE ✅)' : '(NÃO LEVE ❌)'}`);
        console.log(`   Código: ${multa.codigo_infracao}`);
        
        // Verificar elementos do Art. 267 na fundamentação
        const fundamentacao = recurso.fundamentacao || '';
        const temArt267 = fundamentacao.toLowerCase().includes('267');
        const temAdvertencia = fundamentacao.toLowerCase().includes('advertência');
        const temConversao = fundamentacao.toLowerCase().includes('conversão');
        
        console.log(`   Art. 267: ${temArt267 ? '✅' : '❌'}`);
        console.log(`   Advertência: ${temAdvertencia ? '✅' : '❌'}`);
        console.log(`   Conversão: ${temConversao ? '✅' : '❌'}`);
        
        if (fundamentacao.length > 0) {
          console.log(`   Fundamentação (${fundamentacao.length} chars): ${fundamentacao.substring(0, 100)}...`);
        } else {
          console.log(`   Fundamentação: ❌ VAZIA`);
        }
      });
    }
    
    console.log('');
    console.log('📊 TODOS OS RECURSOS POR TIPO:');
    console.log('=' .repeat(50));
    
    const tiposCount = {};
    recursos.forEach(recurso => {
      const tipo = recurso.tipo_recurso || 'indefinido';
      tiposCount[tipo] = (tiposCount[tipo] || 0) + 1;
    });
    
    Object.entries(tiposCount).forEach(([tipo, count]) => {
      console.log(`  ${tipo}: ${count} recursos`);
    });
    
    console.log('');
    console.log('🔍 RECURSOS RECENTES (TODOS):');
    console.log('=' .repeat(50));
    
    recursos.forEach((recurso, index) => {
      const multa = recurso.multas;
      const cliente = multa.clients;
      const valor = multa.valor_original || multa.valor_final || 0;
      
      console.log(`\n${index + 1}. ID: ${recurso.id}`);
      console.log(`   Tipo: ${recurso.tipo_recurso}`);
      console.log(`   Status: ${recurso.status}`);
      console.log(`   Cliente: ${cliente.nome}`);
      console.log(`   Valor: R$ ${valor.toFixed(2)}`);
      console.log(`   Data: ${new Date(recurso.created_at).toLocaleString('pt-BR')}`);
    });
    
    // Buscar especificamente o ID mencionado
    console.log('');
    console.log('🎯 BUSCA ESPECÍFICA DO ID MENCIONADO:');
    console.log('=' .repeat(50));
    
    const idBuscado = '80015a21-97ea-4a3a-a2e6-b7e495df8adc';
    const { data: recursoEspecifico, error: errorEspecifico } = await supabase
      .from('recursos')
      .select('*')
      .eq('id', idBuscado);
    
    if (errorEspecifico) {
      console.log(`❌ Erro ao buscar ID ${idBuscado}:`, errorEspecifico.message);
    } else if (!recursoEspecifico || recursoEspecifico.length === 0) {
      console.log(`❌ Recurso com ID ${idBuscado} não encontrado`);
      console.log('   Possíveis causas:');
      console.log('   - ID incorreto ou com erro de digitação');
      console.log('   - Recurso foi deletado');
      console.log('   - Recurso está em outra base de dados');
    } else {
      console.log(`✅ Recurso encontrado: ${recursoEspecifico[0].tipo_recurso}`);
    }
    
    console.log('');
    console.log('=' .repeat(80));
    console.log('✅ Busca concluída');
    
  } catch (error) {
    console.error('❌ Erro durante busca:', error.message);
  }
}

// Executar busca
findRecursosConversao();