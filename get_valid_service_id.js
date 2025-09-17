// Buscar service_id válido no banco
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ixqhvzqjqxqjqxqjqxqj.supabase.co';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cWh2enFqcXhxanF4cWpxeHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MjU2NzIsImV4cCI6MjA1MTQwMTY3Mn0.abc123';

const supabase = createClient(supabaseUrl, supabaseKey);

async function buscarServiceId() {
  console.log('🔍 Buscando service_id válido...');
  
  const { data: services, error } = await supabase
    .from('services')
    .select('id, name, type')
    .limit(5);
  
  if (error) {
    console.error('❌ Erro ao buscar services:', error);
    return;
  }
  
  if (services && services.length > 0) {
    console.log('✅ Services encontrados:');
    services.forEach((service, index) => {
      console.log(`  ${index + 1}. ID: ${service.id}`);
      console.log(`     Nome: ${service.name}`);
      console.log(`     Tipo: ${service.type}`);
      console.log('');
    });
    
    console.log('🎯 Usar este service_id no teste:', services[0].id);
  } else {
    console.log('⚠️ Nenhum service encontrado');
  }
}

buscarServiceId().catch(console.error);