#!/usr/bin/env node

/**
 * Script para verificar se um cliente tem subconta em produção
 * Uso: node check-client-subaccount.js [CPF|ID|NOME]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configurar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  console.log('Verifique se você tem as variáveis:');
  console.log('- VITE_SUPABASE_URL ou SUPABASE_URL');
  console.log('- VITE_SUPABASE_ANON_KEY ou SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Função para buscar cliente por CPF (removendo máscaras)
async function findClientByCpf(cpf) {
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('cpf_cnpj', cpfLimpo)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('❌ Erro ao buscar cliente por CPF:', error.message);
    return null;
  }
  
  return data;
}

// Função para buscar cliente por ID
async function findClientById(id) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, nome, cpf_cnpj, email, telefone')
    .eq('id', id)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('❌ Erro ao buscar cliente por ID:', error.message);
    return null;
  }
  
  return data;
}

// Função para buscar cliente por nome (busca parcial)
async function findClientByName(nome) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .ilike('nome', `%${nome}%`)
    .limit(5);
    
  if (error) {
    console.error('❌ Erro ao buscar cliente por nome:', error.message);
    return null;
  }
  
  return data;
}

// Função para buscar company associada ao cliente
async function findCompanyByClient(clientId) {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('client_id', clientId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('❌ Erro ao buscar company:', error.message);
    return null;
  }
  
  return data;
}

// Função para buscar subconta da company
async function findSubaccountByCompany(companyId) {
  const { data, error } = await supabase
    .from('asaas_subaccounts')
    .select(`
      *,
      company:companies!company_id(name, cnpj)
    `)
    .eq('company_id', companyId)
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('❌ Erro ao buscar subconta:', error.message);
    return null;
  }
  
  return data;
}

// Função para verificar configuração do Asaas (ambiente)
async function getAsaasConfig() {
  const { data, error } = await supabase
    .from('asaas_config')
    .select('*')
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('❌ Erro ao buscar configuração Asaas:', error.message);
    return null;
  }
  
  return data;
}

// Função principal
async function checkClientSubaccount(searchTerm) {
  console.log(`🔍 Buscando cliente: ${searchTerm}`);
  
  let client = null;
  let searchType = '';
  
  // Detectar tipo de busca
  if (searchTerm.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    // UUID (ID do cliente)
    searchType = 'ID';
    client = await findClientById(searchTerm);
  } else if (searchTerm.replace(/\D/g, '').length === 11) {
    // CPF
    searchType = 'CPF';
    client = await findClientByCpf(searchTerm);
  } else if (/^\d+$/.test(searchTerm)) {
    // ID numérico (legado)
    searchType = 'ID';
    client = await findClientById(searchTerm);
  } else {
    // Nome
    searchType = 'NOME';
    const clients = await findClientByName(searchTerm);
    if (clients && clients.length > 0) {
      if (clients.length === 1) {
        client = clients[0];
      } else {
        console.log(`📋 Encontrados ${clients.length} clientes com nome similar:`);
        clients.forEach((c, index) => {
          console.log(`  ${index + 1}. ${c.nome} (ID: ${c.id}, CPF: ${c.cpf_cnpj})`);
        });
        console.log('\n🔍 Use o ID ou CPF específico para verificar detalhes');
        return;
      }
    }
  }
  
  if (!client) {
    console.log(`❌ Cliente não encontrado com ${searchType}: ${searchTerm}`);
    return;
  }
  
  console.log('\n✅ Cliente encontrado:');
  console.log(`   Nome: ${client.nome}`);
  console.log(`   ID: ${client.id}`);
  console.log(`   CPF: ${client.cpf_cnpj}`);
  console.log(`   Email: ${client.email}`);
  console.log(`   Telefone: ${client.telefone || 'N/A'}`);
  
  // Buscar company associada
  console.log('\n🏢 Buscando empresa associada...');
  const company = await findCompanyByClient(client.id);
  
  if (!company) {
    console.log('❌ Nenhuma empresa encontrada para este cliente');
    console.log('ℹ️  O cliente precisa ter uma empresa cadastrada para ter subconta');
    return;
  }
  
  console.log(`✅ Empresa encontrada:`);
  console.log(`   Nome: ${company.nome}`);
  console.log(`   ID: ${company.id}`);
  console.log(`   CNPJ: ${company.cnpj}`);
  console.log(`   Tipo: ${company.tipo || 'N/A'}`);
  
  // Buscar subconta
  console.log('\n🔍 Buscando subconta Asaas...');
  const subaccount = await findSubaccountByCompany(company.id);
  
  if (!subaccount) {
    console.log('❌ Nenhuma subconta encontrada para esta empresa');
    console.log('ℹ️  A empresa não possui subconta no Asaas');
    return;
  }
  
  // Verificar configuração do Asaas
  const asaasConfig = await getAsaasConfig();
  const currentEnvironment = asaasConfig?.environment || 'desconhecido';
  
  console.log('\n📊 Dados da Subconta:');
  console.log(`   ID da Subconta: ${subaccount.id}`);
  console.log(`   ID Asaas: ${subaccount.asaas_account_id}`);
  console.log(`   Wallet ID: ${subaccount.wallet_id}`);
  console.log(`   Tipo: ${subaccount.account_type}`);
  console.log(`   Status: ${subaccount.status}`);
  console.log(`   Criada em: ${new Date(subaccount.created_at).toLocaleDateString('pt-BR')}`);
  
  // Verificar se é configuração manual
  const isManualConfig = subaccount.manual_wallet_id || subaccount.manual_api_key;
  if (isManualConfig) {
    console.log(`   ⚙️  Configuração: MANUAL`);
    console.log(`   Wallet Manual: ${subaccount.manual_wallet_id || 'N/A'}`);
  } else {
    console.log(`   ⚙️  Configuração: AUTOMÁTICA`);
  }
  
  // Verificar se está em produção
  const isProduction = currentEnvironment === 'production' && 
                      subaccount.status === 'active' && 
                      (subaccount.wallet_id || subaccount.manual_wallet_id);
  
  console.log('\n🎯 ANÁLISE DE PRODUÇÃO:');
  console.log(`   Ambiente Asaas: ${currentEnvironment}`);
  console.log(`   Status Subconta: ${subaccount.status}`);
  
  if (isProduction) {
    console.log('✅ SUBCONTA EM PRODUÇÃO ATIVA');
    console.log('   ✨ Esta subconta está pronta para transações reais');
    console.log(`   💰 Wallet ID: ${subaccount.wallet_id || subaccount.manual_wallet_id}`);
  } else {
    console.log('❌ SUBCONTA NÃO ESTÁ EM PRODUÇÃO');
    
    if (currentEnvironment !== 'production') {
      console.log('   ⚠️  Sistema está em ambiente SANDBOX');
    }
    if (subaccount.status !== 'active') {
      console.log(`   ⚠️  Status da subconta: ${subaccount.status} (deveria ser 'active')`);
    }
    if (!subaccount.wallet_id && !subaccount.manual_wallet_id) {
      console.log('   ⚠️  Wallet ID não configurado');
    }
  }
  
  // Testar conexão se estiver em produção
  if (isProduction) {
    console.log('\n🧪 Testando conexão com Asaas...');
    try {
      const walletId = subaccount.manual_wallet_id || subaccount.wallet_id;
      const apiKey = subaccount.manual_api_key || subaccount.api_key;
      
      if (walletId && apiKey) {
        console.log('   ✅ Credenciais disponíveis para teste');
        console.log(`   🔑 Wallet: ${walletId.substring(0, 8)}...`);
        console.log(`   🔐 API Key: ${apiKey.substring(0, 10)}...`);
      } else {
        console.log('   ⚠️  Credenciais incompletas para teste');
      }
    } catch (error) {
      console.log('   ❌ Erro ao preparar teste de conexão');
    }
  }
  
  console.log('\n' + '='.repeat(60));
}

// Executar script
const searchTerm = process.argv[2];

if (!searchTerm) {
  console.log('🤖 Verificador de Subcontas em Produção');
  console.log('\nUso: node check-client-subaccount.js [CPF|ID|NOME]');
  console.log('\nExemplos:');
  console.log('  node check-client-subaccount.js 123.456.789-09');
  console.log('  node check-client-subaccount.js 550e8400-e29b-41d4-a716-446655440000');
  console.log('  node check-client-subaccount.js "João Silva"');
  process.exit(1);
}

// Executar verificação
checkClientSubaccount(searchTerm).catch(error => {
  console.error('❌ Erro ao executar verificação:', error);
  process.exit(1);
});