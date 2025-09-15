// Script para verificar especificamente a subconta ICETRAN usando sua API key
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkIcetranSubaccountStatus() {
  try {
    console.log('🔍 Verificando subconta ICETRAN usando sua API key própria...');
    console.log('');

    // 1. Buscar subconta ICETRAN e sua API key
    console.log('📋 Buscando dados da subconta ICETRAN...');
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

    if (!subaccount.api_key) {
      console.log('❌ API Key da subconta não encontrada');
      return;
    }

    console.log('✅ Subconta encontrada:');
    console.log(`   Asaas Account ID: ${subaccount.asaas_account_id}`);
    console.log(`   Wallet ID: ${subaccount.wallet_id}`);
    console.log(`   API Key: ${subaccount.api_key.substring(0, 15)}...`);
    console.log('');

    // 2. Usar a API key da subconta para consultar suas próprias informações
    console.log('🌐 Consultando informações da subconta usando sua API key...');
    
    try {
      // Usar proxy local com a API key da subconta
      const response = await fetch('http://localhost:3001/api/asaas-proxy/myAccount', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': subaccount.api_key
        }
      });

      if (!response.ok) {
        console.log(`❌ Erro na consulta: ${response.status} - ${response.statusText}`);
        
        // Tentar obter mais detalhes do erro
        try {
          const errorData = await response.json();
          console.log('   Detalhes do erro:', errorData);
        } catch (e) {
          console.log('   Não foi possível obter detalhes do erro');
        }
        return;
      }

      const accountInfo = await response.json();
      console.log('✅ Informações da subconta obtidas:');
      console.log(`   ID: ${accountInfo.id}`);
      console.log(`   Nome: ${accountInfo.name}`);
      console.log(`   Email: ${accountInfo.email}`);
      console.log(`   CNPJ: ${accountInfo.cpfCnpj}`);
      console.log(`   Status: ${accountInfo.status}`);
      console.log(`   Tipo: ${accountInfo.personType}`);
      console.log(`   Telefone: ${accountInfo.phone || 'Não informado'}`);
      console.log(`   Endereço: ${accountInfo.address || 'Não informado'}`);
      console.log('');

      // 3. Verificar status de validação específico da subconta
      console.log('🔍 Analisando status de validação da subconta...');
      
      let needsValidation = false;
      let validationMessage = '';
      
      switch (accountInfo.status) {
        case 'PENDING_APPROVAL':
          needsValidation = true;
          validationMessage = 'Subconta pendente de aprovação - precisa validar documentos';
          break;
        case 'APPROVED':
          needsValidation = false;
          validationMessage = 'Subconta aprovada - não precisa de validação adicional';
          break;
        case 'ACTIVE':
          needsValidation = false;
          validationMessage = 'Subconta ativa - não precisa de validação adicional';
          break;
        case 'REJECTED':
          needsValidation = true;
          validationMessage = 'Subconta rejeitada - precisa reenviar documentação';
          break;
        case 'SUSPENDED':
          needsValidation = true;
          validationMessage = 'Subconta suspensa - verificar motivos e resolver pendências';
          break;
        default:
          needsValidation = true;
          validationMessage = `Status desconhecido (${accountInfo.status}) - verificar documentação`;
      }

      console.log(`   ${needsValidation ? '⚠️' : '✅'} ${validationMessage}`);
      console.log('');

      // 4. Verificar se há documentos pendentes
      if (accountInfo.pendingDocuments && accountInfo.pendingDocuments.length > 0) {
        console.log('📄 Documentos pendentes:');
        accountInfo.pendingDocuments.forEach((doc, index) => {
          console.log(`   ${index + 1}. ${doc}`);
        });
        console.log('');
      }

      // 5. Resumo final
      console.log('📊 RESUMO FINAL DA SUBCONTA ICETRAN:');
      console.log(`   Empresa: ${accountInfo.name}`);
      console.log(`   CNPJ: ${accountInfo.cpfCnpj}`);
      console.log(`   Subconta ID (banco): ${subaccount.id}`);
      console.log(`   Asaas Account ID: ${accountInfo.id}`);
      console.log(`   Wallet ID: ${subaccount.wallet_id}`);
      console.log(`   Status: ${accountInfo.status}`);
      console.log(`   API Key: PRESENTE E FUNCIONAL ✅`);
      console.log(`   Precisa validação: ${needsValidation ? 'SIM ⚠️' : 'NÃO ✅'}`);
      console.log('');

      // 6. Próximos passos se necessário
      if (needsValidation) {
        console.log('🔗 PRÓXIMOS PASSOS PARA VALIDAÇÃO:');
        console.log('   1. Criar link de validação de documentos para a subconta');
        console.log('   2. Enviar link para ICETRAN (contato@icetran.com.br)');
        console.log('   3. ICETRAN faz upload dos documentos necessários');
        console.log('   4. Asaas analisa e aprova/rejeita a subconta');
        console.log('');
        console.log('💡 Endpoint para criar link de validação:');
        console.log(`   POST /accounts/${accountInfo.id}/documents/validation`);
        console.log(`   Usar API key da subconta: ${subaccount.api_key.substring(0, 15)}...`);
      } else {
        console.log('🎉 SUBCONTA PRONTA PARA USO!');
        console.log('   A subconta ICETRAN está aprovada e pode ser usada para:');
        console.log('   - Receber splits de pagamento');
        console.log('   - Processar cobranças');
        console.log('   - Gerenciar clientes e assinaturas');
      }

    } catch (fetchError) {
      console.log('❌ Erro ao consultar API da subconta:', fetchError.message);
      console.log('   Possíveis causas:');
      console.log('   - Proxy server não está rodando na porta 3001');
      console.log('   - API key da subconta inválida ou expirada');
      console.log('   - Problemas de conectividade com Asaas');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

checkIcetranSubaccountStatus();