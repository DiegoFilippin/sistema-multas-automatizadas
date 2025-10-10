import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxMDYwOCwiZXhwIjoyMDY4Nzg2NjA4fQ.q31X1QarmN4Ga_V2S0KJosGxSa_Bi-CItRs9KNHslJA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findValidService() {
  try {
    console.log('🔍 Buscando serviços disponíveis...');
    
    // Buscar serviços
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(10);
    
    if (servicesError) {
      console.error('❌ Erro ao buscar serviços:', servicesError);
      return;
    }
    
    console.log(`📋 Encontrados ${services?.length || 0} serviços:`);
    services?.forEach((service, index) => {
      console.log(`  ${index + 1}. ID: ${service.id}`);
      console.log(`     Nome: ${service.name}`);
      console.log(`     Categoria: ${service.category}`);
      console.log(`     Tipo Multa: ${service.tipo_multa || 'N/A'}`);
      console.log(`     Ativo: ${service.is_active}`);
      console.log('');
    });
    
    // Buscar clientes
    console.log('🔍 Buscando clientes disponíveis...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(5);
    
    if (clientsError) {
      console.error('❌ Erro ao buscar clientes:', clientsError);
    } else {
      console.log(`👥 Encontrados ${clients?.length || 0} clientes:`);
      clients?.forEach((client, index) => {
        console.log(`  ${index + 1}. ID: ${client.id}`);
        console.log(`     Nome: ${client.nome}`);
        console.log(`     Email: ${client.email}`);
        console.log('');
      });
    }
    
    // Buscar empresas
    console.log('🔍 Buscando empresas disponíveis...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(5);
    
    if (companiesError) {
      console.error('❌ Erro ao buscar empresas:', companiesError);
    } else {
      console.log(`🏢 Encontradas ${companies?.length || 0} empresas:`);
      companies?.forEach((company, index) => {
        console.log(`  ${index + 1}. ID: ${company.id}`);
        console.log(`     Nome: ${company.nome}`);
        console.log(`     CNPJ: ${company.cnpj}`);
        console.log('');
      });
    }
    
    // Sugerir dados válidos para teste
    if (services && services.length > 0 && clients && clients.length > 0 && companies && companies.length > 0) {
      console.log('✅ Dados sugeridos para teste:');
      console.log('📋 Dados de teste válidos:');
      console.log(`  service_id: '${services[0].id}'`);
      console.log(`  customer_id: '${clients[0].id}'`);
      console.log(`  company_id: '${companies[0].id}'`);
      console.log(`  valor_cobranca: 80.00`);
      console.log(`  descricaoservico: '${services[0].name}'`);
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

findValidService();