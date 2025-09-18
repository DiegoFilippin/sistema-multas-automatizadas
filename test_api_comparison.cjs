// Teste para comparar acesso direto vs API HTTP
const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const util = require('util');
require('dotenv').config();

const execAsync = util.promisify(exec);

async function testComparison() {
  console.log('🔍 === COMPARAÇÃO: CLIENTES vs SERVICE_ORDERS ===\n');
  
  // 1. Teste acesso direto (como clientes fazem)
  console.log('1️⃣ TESTE ACESSO DIRETO (como clientes):');
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL, 
      process.env.VITE_SUPABASE_ANON_KEY
    );
    
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(3);
      
    console.log('✅ Clientes direto:', clients?.length || 0, 'registros');
    if (clientsError) console.error('❌ Erro clientes:', clientsError.message);
    
    const { data: serviceOrders, error: serviceOrdersError } = await supabase
      .from('service_orders')
      .select('*')
      .limit(3);
      
    console.log('✅ Service Orders direto:', serviceOrders?.length || 0, 'registros');
    if (serviceOrdersError) console.error('❌ Erro service_orders:', serviceOrdersError.message);
    
  } catch (error) {
    console.error('❌ Erro acesso direto:', error.message);
  }
  
  console.log('\n2️⃣ TESTE API HTTP LOCAL:');
  
  // 2. Teste API HTTP local (proxy-server)
  try {
    const { stdout, stderr } = await execAsync('curl -s -w "\n%{http_code}" "http://localhost:3001/api/payments/list-service-orders?company_id=7d573ce0-125d-46bf-9e37-33d0c6074cf9"');
    const lines = stdout.trim().split('\n');
    const httpCode = lines[lines.length - 1];
    const response = lines.slice(0, -1).join('\n');
    
    if (httpCode === '200') {
      const data = JSON.parse(response);
      console.log('✅ API Local funcionou:', data.total || 0, 'registros');
    } else {
      console.error('❌ API Local falhou:', httpCode);
      console.error('Resposta:', response.substring(0, 200));
    }
  } catch (error) {
    console.error('❌ Erro API Local:', error.message);
  }
  
  console.log('\n3️⃣ TESTE API HTTP VERCEL:');
  
  // 3. Teste API HTTP Vercel
  try {
    const { stdout, stderr } = await execAsync('curl -s -w "\n%{http_code}" "https://traemultastrae6jgf-diegofilippin-8163-diegos-projects-d728f2d6.vercel.app/api/payments/list-service-orders?company_id=7d573ce0-125d-46bf-9e37-33d0c6074cf9"');
    const lines = stdout.trim().split('\n');
    const httpCode = lines[lines.length - 1];
    const response = lines.slice(0, -1).join('\n');
    
    if (httpCode === '200') {
      const data = JSON.parse(response);
      console.log('✅ API Vercel funcionou:', data.total || 0, 'registros');
    } else {
      console.error('❌ API Vercel falhou:', httpCode);
      console.error('Resposta:', response.substring(0, 200));
    }
  } catch (error) {
    console.error('❌ Erro API Vercel:', error.message);
  }
  
  console.log('\n🎯 CONCLUSÃO:');
  console.log('- Clientes: Acesso direto ao Supabase (VITE_ vars) ✅');
  console.log('- Service Orders: API HTTP (variáveis backend)');
  console.log('- Se API local funciona mas Vercel não = problema de variáveis de ambiente!');
  console.log('- Se ambas falham = problema na implementação da API');
}

testComparison();