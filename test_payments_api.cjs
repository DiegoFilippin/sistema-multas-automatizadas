// Script para testar a API de pagamentos e verificar dados
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔍 Verificando dados no banco de dados...');
  
  try {
    // 1. Verificar tabela payments
    console.log('\n📊 Verificando tabela payments:');
    const { data: payments, error: paymentsError, count: paymentsCount } = await supabase
      .from('payments')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (paymentsError) {
      console.error('❌ Erro ao consultar payments:', paymentsError);
    } else {
      console.log(`✅ Total de registros em payments: ${paymentsCount}`);
      if (payments && payments.length > 0) {
        console.log('📋 Primeiros registros:');
        payments.forEach((payment, index) => {
          console.log(`  ${index + 1}. ID: ${payment.id.slice(-8)}, Valor: R$ ${payment.amount}, Status: ${payment.status}, Data: ${payment.created_at}`);
        });
      } else {
        console.log('📭 Nenhum registro encontrado em payments');
      }
    }
    
    // 2. Verificar tabela asaas_payments
    console.log('\n📊 Verificando tabela asaas_payments:');
    const { data: asaasPayments, error: asaasError, count: asaasCount } = await supabase
      .from('asaas_payments')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (asaasError) {
      console.error('❌ Erro ao consultar asaas_payments:', asaasError);
    } else {
      console.log(`✅ Total de registros em asaas_payments: ${asaasCount}`);
      if (asaasPayments && asaasPayments.length > 0) {
        console.log('📋 Primeiros registros:');
        asaasPayments.forEach((payment, index) => {
          console.log(`  ${index + 1}. ID: ${payment.id.slice(-8)}, Valor: R$ ${payment.amount}, Status: ${payment.status}, Data: ${payment.created_at}`);
        });
      } else {
        console.log('📭 Nenhum registro encontrado em asaas_payments');
      }
    }
    
    // 3. Verificar empresas
    console.log('\n🏢 Verificando empresas:');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, nome, cnpj')
      .limit(5);
    
    if (companiesError) {
      console.error('❌ Erro ao consultar companies:', companiesError);
    } else {
      console.log(`✅ Total de empresas encontradas: ${companies?.length || 0}`);
      if (companies && companies.length > 0) {
        companies.forEach((company, index) => {
          console.log(`  ${index + 1}. ${company.nome} (${company.cnpj})`);
        });
      }
    }
    
    // 4. Verificar clientes
    console.log('\n👥 Verificando clientes:');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, nome, cpf_cnpj')
      .limit(5);
    
    if (clientsError) {
      console.error('❌ Erro ao consultar clients:', clientsError);
    } else {
      console.log(`✅ Total de clientes encontrados: ${clients?.length || 0}`);
      if (clients && clients.length > 0) {
        clients.forEach((client, index) => {
          console.log(`  ${index + 1}. ${client.nome} (${client.cpf_cnpj})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

async function testAPI() {
  console.log('\n🌐 Testando APIs...');
  
  try {
    // Simular token de superadmin (você precisa substituir por um token real)
    const token = 'seu_token_aqui'; // Substitua por um token válido
    
    // Testar API de todas as cobranças
    console.log('\n📡 Testando GET /api/payments/all');
    const response = await fetch('http://localhost:5173/api/payments/all', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API respondeu com sucesso');
      console.log(`📊 Total de pagamentos retornados: ${data.payments?.length || 0}`);
      if (data.payments && data.payments.length > 0) {
        console.log('📋 Primeiros pagamentos:');
        data.payments.slice(0, 3).forEach((payment, index) => {
          console.log(`  ${index + 1}. Cliente: ${payment.customer_name || payment.client_name}, Valor: R$ ${payment.amount || payment.value}, Status: ${payment.status}`);
        });
      }
    } else {
      console.log(`❌ API retornou erro: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.log('Resposta:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
    console.log('💡 Certifique-se de que o servidor está rodando em http://localhost:5173');
  }
}

async function createTestData() {
  console.log('\n🔧 Criando dados de teste...');
  
  try {
    // Verificar se já existem empresas
    const { data: existingCompanies } = await supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    let companyId;
    
    if (!existingCompanies || existingCompanies.length === 0) {
      console.log('📝 Criando empresa de teste...');
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          nome: 'Empresa Teste',
          cnpj: '12.345.678/0001-90',
          email: 'teste@empresa.com',
          telefone: '(11) 99999-9999'
        })
        .select()
        .single();
      
      if (companyError) {
        console.error('❌ Erro ao criar empresa:', companyError);
        return;
      }
      
      companyId = newCompany.id;
      console.log('✅ Empresa criada com sucesso');
    } else {
      companyId = existingCompanies[0].id;
      console.log('✅ Usando empresa existente');
    }
    
    // Criar cliente de teste
    console.log('📝 Criando cliente de teste...');
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        nome: 'Cliente Teste',
        cpf_cnpj: '123.456.789-00',
        email: 'cliente@teste.com',
        telefone: '(11) 88888-8888',
        company_id: companyId
      })
      .select()
      .single();
    
    if (clientError) {
      console.error('❌ Erro ao criar cliente:', clientError);
      return;
    }
    
    console.log('✅ Cliente criado com sucesso');
    
    // Criar pagamento de teste
    console.log('📝 Criando pagamento de teste...');
    const { data: newPayment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        company_id: companyId,
        customer_id: newClient.id,
        amount: 50.00,
        credit_amount: 50,
        payment_method: 'PIX',
        status: 'pending',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias a partir de hoje
        pix_qr_code: 'teste_qr_code',
        pix_copy_paste: 'teste_copy_paste'
      })
      .select()
      .single();
    
    if (paymentError) {
      console.error('❌ Erro ao criar pagamento:', paymentError);
      return;
    }
    
    console.log('✅ Pagamento criado com sucesso');
    console.log(`💰 Pagamento ID: ${newPayment.id}`);
    
    // Criar cobrança Asaas de teste
    console.log('📝 Criando cobrança Asaas de teste...');
    const { data: newAsaasPayment, error: asaasPaymentError } = await supabase
      .from('asaas_payments')
      .insert({
        company_id: companyId,
        client_id: newClient.id,
        asaas_payment_id: 'pay_teste_123456',
        asaas_customer_id: 'cus_teste_123456',
        resource_type: 'multa',
        amount: 100.00,
        description: 'Cobrança de multa de teste',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 dias a partir de hoje
        payment_method: 'PIX',
        status: 'PENDING'
      })
      .select()
      .single();
    
    if (asaasPaymentError) {
      console.error('❌ Erro ao criar cobrança Asaas:', asaasPaymentError);
      return;
    }
    
    console.log('✅ Cobrança Asaas criada com sucesso');
    console.log(`💰 Cobrança Asaas ID: ${newAsaasPayment.id}`);
    
    console.log('\n🎉 Dados de teste criados com sucesso!');
    console.log('💡 Agora você pode testar a página de cobranças.');
    
  } catch (error) {
    console.error('❌ Erro ao criar dados de teste:', error);
  }
}

async function main() {
  console.log('🚀 Iniciando diagnóstico de cobranças...');
  
  await testDatabase();
  
  // Perguntar se deve criar dados de teste
  const { data: payments } = await supabase.from('payments').select('id').limit(1);
  const { data: asaasPayments } = await supabase.from('asaas_payments').select('id').limit(1);
  
  if ((!payments || payments.length === 0) && (!asaasPayments || asaasPayments.length === 0)) {
    console.log('\n❓ Não foram encontradas cobranças no banco de dados.');
    console.log('💡 Execute: node test_payments_api.js --create-test-data para criar dados de teste');
    
    if (process.argv.includes('--create-test-data')) {
      await createTestData();
    }
  }
  
  // await testAPI(); // Descomente se quiser testar a API
  
  console.log('\n✅ Diagnóstico concluído!');
}

main().catch(console.error);