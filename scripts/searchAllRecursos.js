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

// Função para verificar se uma multa é leve
function isMultaLeve(valor, codigoInfracao) {
  const codigosLeves = [
    '50110', '50120', '50130', '50140', '50150', '50160', '50170', '50180', '50190',
    '51110', '51120', '51130', '51140', '51150', '51160', '51170', '51180', '51190',
    '52110', '52120', '52130', '52140', '52150', '52160', '52170', '52180', '52190',
    '53110', '53120', '53130', '53140', '53150', '53160', '53170', '53180', '53190',
    '54110', '54120', '54130', '54140', '54150', '54160', '54170', '54180', '54190',
    '55110', '55120', '55130', '55140', '55150', '55160', '55170', '55180', '55190'
  ];
  
  if (codigoInfracao && codigosLeves.includes(codigoInfracao)) {
    return true;
  }
  
  const valorNumerico = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
  return valorNumerico <= 293.47;
}

async function searchAllRecursos() {
  console.log('🔍 Buscando todos os recursos recentes...');
  console.log('=' .repeat(80));
  
  try {
    // Primeiro, buscar especificamente pelo ID mencionado
    console.log('🎯 Buscando recurso específico ID: 24134a30-2e5a-41dd-8938-c93caaf40772');
    
    const { data: recursoEspecifico, error: errorEspecifico } = await supabase
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
          clients!inner(
            nome,
            cpf_cnpj
          )
        )
      `)
      .eq('id', '24134a30-2e5a-41dd-8938-c93caaf40772');
    
    if (recursoEspecifico && recursoEspecifico.length > 0) {
      const recurso = recursoEspecifico[0];
      const multa = recurso.multas;
      const isLeve = isMultaLeve(multa.valor_original || multa.valor_final, multa.codigo_infracao);
      
      console.log('🎯 RECURSO ESPECÍFICO ENCONTRADO!');
      console.log(`   ID: ${recurso.id}`);
      console.log(`   Tipo: ${recurso.tipo_recurso}`);
      console.log(`   Status: ${recurso.status}`);
      console.log(`   Auto: ${multa.numero_auto}`);
      console.log(`   Placa: ${multa.placa_veiculo}`);
      console.log(`   Valor: R$ ${(multa.valor_original || multa.valor_final).toFixed(2)}`);
      console.log(`   Código: ${multa.codigo_infracao}`);
      console.log(`   É leve: ${isLeve ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   Cliente: ${multa.clients.nome}`);
      console.log(`   Data criação: ${new Date(recurso.created_at).toLocaleString('pt-BR')}`);
      
      if (isLeve && recurso.tipo_recurso !== 'conversao') {
        console.log('');
        console.log('🚨 PROBLEMA IDENTIFICADO:');
        console.log(`   ❌ Multa leve (R$ ${(multa.valor_original || multa.valor_final).toFixed(2)}) foi processada como "${recurso.tipo_recurso}"`);
        console.log(`   ❌ DEVERIA ser "conversao" (Art. 267 CTB)`);
        console.log('');
        
        // Verificar o conteúdo do recurso
        if (recurso.argumentacao) {
          const temArt267 = recurso.argumentacao.toLowerCase().includes('267') || 
                           recurso.argumentacao.toLowerCase().includes('advertência');
          console.log(`   Conteúdo menciona Art. 267: ${temArt267 ? '✅ SIM' : '❌ NÃO'}`);
        }
        
        console.log(`   Probabilidade sucesso: ${recurso.probabilidade_sucesso}%`);
        console.log(`   (Conversões têm tipicamente 85% de sucesso)`);
      } else if (isLeve && recurso.tipo_recurso === 'conversao') {
        console.log('');
        console.log('✅ RECURSO CORRETO:');
        console.log(`   ✅ Multa leve foi corretamente processada como "conversao"`);
        console.log(`   ✅ Art. 267 CTB aplicado corretamente`);
      }
      
      console.log('');
      console.log('=' .repeat(80));
      return;
    } else {
      console.log('❌ Recurso específico não encontrado');
      console.log('');
    }
    
    // Buscar todos os recursos dos últimos 90 dias
    console.log('🔍 Buscando todos os recursos dos últimos 90 dias...');
    
    const { data: recursos, error } = await supabase
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
          clients!inner(
            nome,
            cpf_cnpj
          )
        )
      `)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar recursos:', error.message);
      return;
    }
    
    if (!recursos || recursos.length === 0) {
      console.log('❌ Nenhum recurso encontrado nos últimos 30 dias');
      return;
    }
    
    console.log(`📋 Encontrados ${recursos.length} recursos nos últimos 30 dias`);
    console.log('');
    
    let recursosConversao = 0;
    let recursosDefesa = 0;
    let multasLevesComDefesa = 0;
    let recursosProblematicos = [];
    
    recursos.forEach((recurso, index) => {
      const multa = recurso.multas;
      const isLeve = isMultaLeve(multa.valor_original || multa.valor_final, multa.codigo_infracao);
      
      if (recurso.tipo_recurso === 'conversao') {
        recursosConversao++;
      } else if (recurso.tipo_recurso === 'defesa_previa') {
        recursosDefesa++;
        
        if (isLeve) {
          multasLevesComDefesa++;
          recursosProblematicos.push({
            id: recurso.id,
            numeroAuto: multa.numero_auto,
            placa: multa.placa_veiculo,
            valor: multa.valor_original || multa.valor_final,
            codigo: multa.codigo_infracao,
            cliente: multa.clients.nome,
            dataInfracao: multa.data_infracao,
            dataCriacao: recurso.created_at
          });
        }
      }
      
      // Buscar pelo ID específico mencionado
      if (recurso.id === '24134a30-2e5a-41dd-8938-c93caaf40772') {
        console.log('🎯 RECURSO ESPECÍFICO ENCONTRADO!');
        console.log(`   ID: ${recurso.id}`);
        console.log(`   Tipo: ${recurso.tipo_recurso}`);
        console.log(`   Auto: ${multa.numero_auto}`);
        console.log(`   Valor: R$ ${(multa.valor_original || multa.valor_final).toFixed(2)}`);
        console.log(`   É leve: ${isLeve ? '✅ SIM' : '❌ NÃO'}`);
        console.log('');
      }
    });
    
    console.log('📊 ESTATÍSTICAS:');
    console.log(`   Total de recursos: ${recursos.length}`);
    console.log(`   Recursos de conversão (Art. 267): ${recursosConversao}`);
    console.log(`   Recursos de defesa prévia: ${recursosDefesa}`);
    console.log(`   Multas leves com defesa (problemáticas): ${multasLevesComDefesa}`);
    console.log('');
    
    if (recursosProblematicos.length > 0) {
      console.log('🚨 RECURSOS PROBLEMÁTICOS (multas leves que deveriam ser conversão):');
      console.log('');
      
      recursosProblematicos.slice(0, 10).forEach((recurso, index) => {
        console.log(`${index + 1}. ID: ${recurso.id}`);
        console.log(`   Auto: ${recurso.numeroAuto}`);
        console.log(`   Placa: ${recurso.placa}`);
        console.log(`   Valor: R$ ${recurso.valor.toFixed(2)}`);
        console.log(`   Código: ${recurso.codigo}`);
        console.log(`   Cliente: ${recurso.cliente}`);
        console.log(`   Data infração: ${recurso.dataInfracao}`);
        console.log(`   Data criação: ${new Date(recurso.dataCriacao).toLocaleString('pt-BR')}`);
        console.log('');
      });
      
      if (recursosProblematicos.length > 10) {
        console.log(`   ... e mais ${recursosProblematicos.length - 10} recursos problemáticos`);
      }
    } else {
      console.log('✅ Nenhum recurso problemático encontrado!');
      console.log('   Todos os recursos com multas leves foram corretamente convertidos.');
    }
    
    console.log('');
    console.log('=' .repeat(80));
    console.log('✅ Análise concluída');
    
  } catch (error) {
    console.error('❌ Erro durante análise:', error.message);
  }
}

// Executar análise
searchAllRecursos();