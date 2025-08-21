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

// Função para calcular similaridade entre duas strings
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Função para calcular distância de Levenshtein
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Função para verificar se uma multa é leve
function isMultaLeve(valor, codigoInfracao) {
  // Códigos de infrações leves do CTB
  const codigosLeves = [
    '50110', '50120', '50130', '50140', '50150', '50160', '50170', '50180', '50190',
    '51110', '51120', '51130', '51140', '51150', '51160', '51170', '51180', '51190',
    '52110', '52120', '52130', '52140', '52150', '52160', '52170', '52180', '52190',
    '53110', '53120', '53130', '53140', '53150', '53160', '53170', '53180', '53190',
    '54110', '54120', '54130', '54140', '54150', '54160', '54170', '54180', '54190',
    '55110', '55120', '55130', '55140', '55150', '55160', '55170', '55180', '55190'
  ];
  
  // Verifica por código
  if (codigoInfracao && codigosLeves.includes(codigoInfracao)) {
    return true;
  }
  
  // Verifica por valor (multas leves até R$ 293,47 em 2024)
  const valorNumerico = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
  return valorNumerico <= 293.47;
}

async function findProblematicRecursos() {
  const targetId = '24134a30-2e5a-41dd-8938-c93caaf40772';
  
  console.log('🔍 Buscando recursos problemáticos...');
  console.log('=' .repeat(80));
  
  try {
    // 1. Buscar por ID exato primeiro
    console.log('\n1️⃣ Buscando recurso com ID exato:', targetId);
    const { data: recursoExato, error: errorExato } = await supabase
      .from('recursos')
      .select(`
        *,
        multas!inner(
          id,
          numero_auto,
          placa_veiculo,
          data_infracao,
          valor_original,
          valor_final,
          codigo_infracao,
          descricao_infracao,
          clients!inner(nome, cpf_cnpj)
        )
      `)
      .eq('id', targetId);
    
    if (errorExato) {
      console.log('❌ Erro ao buscar ID exato:', errorExato.message);
    } else if (recursoExato && recursoExato.length > 0) {
      console.log('✅ Recurso encontrado!');
      analyzeRecurso(recursoExato[0], 'ID EXATO');
    } else {
      console.log('❌ Recurso com ID exato não encontrado');
    }
    
    // 2. Buscar todos os recursos e filtrar por similaridade
    console.log('\n2️⃣ Buscando recursos similares...');
    
    const { data: todosRecursos, error: errorTodos } = await supabase
      .from('recursos')
      .select(`
        *,
        multas!inner(
          id,
          numero_auto,
          placa_veiculo,
          data_infracao,
          valor_original,
          valor_final,
          codigo_infracao,
          descricao_infracao,
          clients!inner(nome, cpf_cnpj)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100); // Limitar para performance
    
    let recursosUnicos = [];
    let errorSimilares = errorTodos;
    
    if (todosRecursos) {
      // Filtrar por similaridade no lado cliente
      const prefixo = targetId.substring(0, 8);
      const sufixo = targetId.substring(targetId.length - 8);
      
      recursosUnicos = todosRecursos.filter(recurso => {
        const id = recurso.id.toString();
        return id.startsWith(prefixo) || id.endsWith(sufixo) || 
               // Verificar se tem pelo menos 50% de caracteres em comum
               calculateSimilarity(id, targetId) > 0.5;
      });
    }
    
    if (errorSimilares) {
      console.log('❌ Erro ao buscar recursos:', errorSimilares.message);
    } else if (recursosUnicos && recursosUnicos.length > 0) {
      console.log(`✅ Encontrados ${recursosUnicos.length} recursos similares:`);
      recursosUnicos.forEach((recurso, index) => {
        console.log(`\n--- Recurso Similar ${index + 1} ---`);
        const similarity = calculateSimilarity(recurso.id, targetId);
        console.log(`  🔗 Similaridade: ${(similarity * 100).toFixed(1)}%`);
        analyzeRecurso(recurso, 'ID SIMILAR');
      });
    } else {
      console.log('❌ Nenhum recurso similar encontrado');
    }
    
    // 3. Buscar recursos dos últimos 30 dias com tipo 'defesa_previa' que deveriam ser 'conversao'
    console.log('\n3️⃣ Buscando recursos problemáticos dos últimos 30 dias...');
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);
    
    const { data: recursosRecentes, error: errorRecentes } = await supabase
      .from('recursos')
      .select(`
        *,
        multas!inner(
          id,
          numero_auto,
          placa_veiculo,
          data_infracao,
          valor_original,
          valor_final,
          codigo_infracao,
          descricao_infracao,
          clients!inner(nome, cpf_cnpj)
        )
      `)
      .eq('tipo_recurso', 'defesa_previa')
      .gte('created_at', dataLimite.toISOString())
      .order('created_at', { ascending: false });
    
    if (errorRecentes) {
      console.log('❌ Erro ao buscar recursos recentes:', errorRecentes.message);
    } else if (recursosRecentes && recursosRecentes.length > 0) {
      console.log(`\n📊 Analisando ${recursosRecentes.length} recursos 'defesa_previa' dos últimos 30 dias...`);
      
      let problematicos = [];
      
      recursosRecentes.forEach(recurso => {
        const multa = recurso.multas;
        const isLeve = isMultaLeve(multa.valor_original || multa.valor_final, multa.codigo_infracao);
        
        if (isLeve) {
          problematicos.push(recurso);
        }
      });
      
      if (problematicos.length > 0) {
        console.log(`\n🚨 ENCONTRADOS ${problematicos.length} RECURSOS PROBLEMÁTICOS:`);
        console.log('(Multas leves que deveriam ser conversão Art. 267 mas são defesa_previa)');
        
        problematicos.forEach((recurso, index) => {
          console.log(`\n--- Recurso Problemático ${index + 1} ---`);
          analyzeRecurso(recurso, 'PROBLEMÁTICO');
        });
      } else {
        console.log('✅ Nenhum recurso problemático encontrado nos últimos 30 dias');
      }
    } else {
      console.log('ℹ️ Nenhum recurso "defesa_previa" encontrado nos últimos 30 dias');
    }
    
    // 4. Estatísticas gerais
    console.log('\n4️⃣ Estatísticas gerais dos últimos 30 dias...');
    
    const { data: statsConversao, error: errorStats1 } = await supabase
      .from('recursos')
      .select('id')
      .eq('tipo_recurso', 'conversao')
      .gte('created_at', dataLimite.toISOString());
    
    const { data: statsDefesa, error: errorStats2 } = await supabase
      .from('recursos')
      .select('id')
      .eq('tipo_recurso', 'defesa_previa')
      .gte('created_at', dataLimite.toISOString());
    
    if (!errorStats1 && !errorStats2) {
      console.log('\n📈 ESTATÍSTICAS (últimos 30 dias):');
      console.log(`  • Recursos tipo "conversao": ${statsConversao?.length || 0}`);
      console.log(`  • Recursos tipo "defesa_previa": ${statsDefesa?.length || 0}`);
      console.log(`  • Total: ${(statsConversao?.length || 0) + (statsDefesa?.length || 0)}`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante busca:', error.message);
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('✅ Busca concluída');
}

function analyzeRecurso(recurso, tipo) {
  const multa = recurso.multas;
  const cliente = multa.clients;
  const isLeve = isMultaLeve(multa.valor_original || multa.valor_final, multa.codigo_infracao);
  const deveriaSer267 = isLeve && recurso.tipo_recurso === 'defesa_previa';
  
  console.log(`🔍 ${tipo} - ID: ${recurso.id}`);
  console.log(`  📅 Criado: ${new Date(recurso.created_at).toLocaleString('pt-BR')}`);
  console.log(`  📋 Tipo: ${recurso.tipo_recurso}`);
  console.log(`  👤 Cliente: ${cliente.nome}`);
  console.log(`  🚗 Placa: ${multa.placa_veiculo}`);
  console.log(`  📄 Auto: ${multa.numero_auto}`);
  console.log(`  💰 Valor: R$ ${(multa.valor_original || multa.valor_final || 0).toFixed(2)}`);
  console.log(`  📊 Código: ${multa.codigo_infracao || 'N/A'}`);
  console.log(`  ⚖️ É leve: ${isLeve ? '✅ SIM' : '❌ NÃO'}`);
  
  if (deveriaSer267) {
    console.log(`  🚨 PROBLEMA: Deveria ser "conversao" (Art. 267) mas é "${recurso.tipo_recurso}"`);
  } else if (isLeve && recurso.tipo_recurso === 'conversao') {
    console.log(`  ✅ CORRETO: Multa leve corretamente identificada como conversão`);
  }
}

// Executar busca
findProblematicRecursos();