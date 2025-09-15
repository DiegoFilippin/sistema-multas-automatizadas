// Script para verificar status da conta ICETRAN no Asaas
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkAsaasAccountStatus() {
  try {
    console.log('🔍 Verificando status da conta ICETRAN no Asaas...');
    console.log('');

    // 1. Buscar configuração do Asaas
    console.log('📋 Carregando configuração do Asaas...');
    const { data: config, error: configError } = await supabase
      .from('asaas_config')
      .select('*')
      .single();

    if (configError || !config) {
      console.log('❌ Erro ao carregar configuração do Asaas:', configError?.message);
      return;
    }

    console.log(`✅ Configuração carregada - Ambiente: ${config.environment}`);
    console.log('');

    // 2. Buscar subconta ICETRAN
    console.log('🔍 Buscando subconta ICETRAN...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('cnpj', '02968119000188')
      .single();

    if (companyError || !company) {
      console.log('❌ Empresa ICETRAN não encontrada');
      return;
    }

    const { data: subaccount, error: subaccountError } = await supabase
      .from('asaas_subaccounts')
      .select('*')
      .eq('company_id', company.id)
      .single();

    if (subaccountError || !subaccount) {
      console.log('❌ Subconta não encontrada');
      return;
    }

    console.log('✅ Subconta encontrada:');
    console.log(`   Asaas Account ID: ${subaccount.asaas_account_id}`);
    console.log(`   API Key: ${subaccount.api_key ? 'Presente' : 'Ausente'}`);
    console.log('');

    // 3. Fazer chamada para API do Asaas via proxy para verificar status da conta
    console.log('🌐 Consultando status da conta no Asaas...');
    
    const apiKey = config.environment === 'sandbox' ? config.sandbox_api_key : config.production_api_key;
    
    try {
      // Usar proxy local para evitar CORS
      const response = await fetch('http://localhost:3001/api/asaas-proxy/myAccount', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': apiKey
        }
      });

      if (!response.ok) {
        console.log(`❌ Erro na consulta: ${response.status} - ${response.statusText}`);
        return;
      }

      const accountInfo = await response.json();
      console.log('✅ Informações da conta obtidas:');
      console.log(`   ID: ${accountInfo.id}`);
      console.log(`   Nome: ${accountInfo.name}`);
      console.log(`   Email: ${accountInfo.email}`);
      console.log(`   CNPJ: ${accountInfo.cpfCnpj}`);
      console.log(`   Status: ${accountInfo.status}`);
      console.log(`   Tipo: ${accountInfo.personType}`);
      console.log('');

      // 4. Verificar se precisa de validação
      console.log('🔍 Verificando necessidade de validação...');
      
      // Status possíveis: ACTIVE, PENDING_APPROVAL, REJECTED, etc.
      if (accountInfo.status === 'PENDING_APPROVAL') {
        console.log('⚠️  CONTA PENDENTE DE APROVAÇÃO');
        console.log('   A conta precisa de validação de documentos.');
        console.log('   É necessário criar um link de validação para o cliente.');
        
        // Verificar se há informações sobre documentos pendentes
        if (accountInfo.pendingDocuments && accountInfo.pendingDocuments.length > 0) {
          console.log('   Documentos pendentes:');
          accountInfo.pendingDocuments.forEach((doc, index) => {
            console.log(`   ${index + 1}. ${doc}`);
          });
        }
      } else if (accountInfo.status === 'ACTIVE') {
        console.log('✅ CONTA ATIVA');
        console.log('   A conta está aprovada e não precisa de validação adicional.');
      } else if (accountInfo.status === 'REJECTED') {
        console.log('❌ CONTA REJEITADA');
        console.log('   A conta foi rejeitada. Verifique os motivos e reenvie a documentação.');
      } else {
        console.log(`ℹ️  Status da conta: ${accountInfo.status}`);
        console.log('   Verifique a documentação do Asaas para entender este status.');
      }

      console.log('');
      console.log('📊 RESUMO FINAL:');
      console.log(`   Empresa: ICETRAN`);
      console.log(`   CNPJ: 02968119000188`);
      console.log(`   Asaas Account ID: ${subaccount.asaas_account_id}`);
      console.log(`   Status no Asaas: ${accountInfo.status}`);
      console.log(`   API Key salva: ${subaccount.api_key ? 'SIM' : 'NÃO'}`);
      console.log(`   Precisa validação: ${accountInfo.status === 'PENDING_APPROVAL' ? 'SIM' : 'NÃO'}`);

      // 5. Se precisar de validação, mostrar próximos passos
      if (accountInfo.status === 'PENDING_APPROVAL') {
        console.log('');
        console.log('🔗 PRÓXIMOS PASSOS:');
        console.log('   1. Criar link de validação de documentos');
        console.log('   2. Enviar link para o cliente (ICETRAN)');
        console.log('   3. Cliente faz upload dos documentos necessários');
        console.log('   4. Asaas analisa e aprova/rejeita a conta');
        console.log('');
        console.log('💡 Para criar o link de validação, use a API do Asaas:');
        console.log('   POST /accounts/{accountId}/documents/validation');
      }

    } catch (fetchError) {
      console.log('❌ Erro ao consultar API do Asaas:', fetchError.message);
      console.log('   Verifique se o proxy server está rodando na porta 3001');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

checkAsaasAccountStatus();