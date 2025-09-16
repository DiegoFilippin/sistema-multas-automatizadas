import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDiegoEmpresa() {
  console.log('🔍 Investigando empresa diego2@despachante.com...');
  
  try {
    // 1. Buscar empresa por email exato
    console.log('\n1️⃣ Buscando empresa por email exato...');
    const { data: empresaExata, error: empresaExataError } = await supabase
      .from('companies')
      .select('*')
      .eq('email', 'diego2@despachante.com');
    
    console.log('Resultado busca exata:', empresaExata?.length || 0, 'empresas encontradas');
    
    // 2. Buscar empresas com email similar (diego)
    console.log('\n2️⃣ Buscando empresas com email similar (diego)...');
    const { data: empresasSimilares, error: empresasSimilaresError } = await supabase
      .from('companies')
      .select('*')
      .ilike('email', '%diego%');
    
    if (empresasSimilaresError) {
      console.error('❌ Erro ao buscar empresas similares:', empresasSimilaresError);
    } else {
      console.log(`✅ Encontradas ${empresasSimilares.length} empresas com 'diego' no email:`);
      empresasSimilares.forEach((empresa, index) => {
        console.log(`   ${index + 1}. ID: ${empresa.id} | Nome: ${empresa.name} | Email: ${empresa.email} | Wallet: ${empresa.wallet_id || 'NÃO CONFIGURADO'}`);
      });
    }
    
    // 3. Buscar todas as empresas para ver estrutura
    console.log('\n3️⃣ Listando todas as empresas (primeiras 10)...');
    const { data: todasEmpresas, error: todasEmpresasError } = await supabase
      .from('companies')
      .select('id, name, email, wallet_id, created_at')
      .limit(10);
    
    if (todasEmpresasError) {
      console.error('❌ Erro ao buscar todas empresas:', todasEmpresasError);
    } else {
      console.log(`✅ Primeiras ${todasEmpresas.length} empresas:`);
      todasEmpresas.forEach((empresa, index) => {
        console.log(`   ${index + 1}. ID: ${empresa.id} | Nome: ${empresa.name} | Email: ${empresa.email} | Wallet: ${empresa.wallet_id || 'NÃO CONFIGURADO'}`);
      });
    }
    
    // 4. Se encontrou empresas similares, verificar cobranças
    if (empresasSimilares && empresasSimilares.length > 0) {
      const empresaDiego = empresasSimilares[0]; // Pegar a primeira
      console.log(`\n4️⃣ Verificando cobranças da empresa ${empresaDiego.email}...`);
      
      const { data: cobrancas, error: cobrancasError } = await supabase
        .from('cobrancas')
        .select('id, valor, status, created_at, payment_id')
        .eq('company_id', empresaDiego.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (cobrancasError) {
        console.error('❌ Erro ao buscar cobranças:', cobrancasError);
      } else {
        console.log(`✅ Encontradas ${cobrancas.length} cobranças:`);
        cobrancas.forEach((cobranca, index) => {
          console.log(`   ${index + 1}. ID: ${cobranca.id} | Valor: R$ ${cobranca.valor} | Status: ${cobranca.status} | Data: ${cobranca.created_at}`);
        });
      }
      
      // 5. Verificar services
      console.log(`\n5️⃣ Verificando services da empresa ${empresaDiego.email}...`);
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, name, price, company_id')
        .eq('company_id', empresaDiego.id);
      
      if (servicesError) {
        console.error('❌ Erro ao buscar services:', servicesError);
      } else {
        console.log(`✅ Encontrados ${services.length} services:`);
        services.forEach((service, index) => {
          console.log(`   ${index + 1}. ID: ${service.id} | Nome: ${service.name} | Preço: R$ ${service.price}`);
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

debugDiegoEmpresa();