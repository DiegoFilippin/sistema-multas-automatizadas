#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configurar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class ProductionSubaccountChecker {
  
  // Buscar todas as empresas
  async getAllCompanies() {
    const { data, error } = await supabase
      .from('companies')
      .select('id, nome, cnpj, status, master_company_id')
      .order('nome');
    
    if (error) {
      console.log('Erro ao buscar empresas:', error.message);
      return null;
    }
    
    return data;
  }

  // Buscar subcontas por empresa
  async getSubaccountsByCompany(companyId) {
    const { data, error } = await supabase
      .from('asaas_subaccounts')
      .select('*')
      .eq('company_id', companyId);
    
    if (error) {
      console.log(`Erro ao buscar subcontas da empresa ${companyId}:`, error.message);
      return null;
    }
    
    // Buscar configuração Asaas da empresa separadamente
    if (data && data.length > 0) {
      const { data: configData, error: configError } = await supabase
        .from('asaas_config')
        .select('*')
        .eq('company_id', companyId)
        .single();
      
      if (!configError && configData) {
        // Adicionar configuração aos dados das subcontas
        data.forEach(subaccount => {
          subaccount.asaas_config = configData;
        });
      }
    }
    
    return data;
  }

  // Buscar clientes por empresa
  async getClientsByCompany(companyId) {
    const { data, error } = await supabase
      .from('clients')
      .select('id, nome, cpf_cnpj, status')
      .eq('company_id', companyId)
      .limit(5);
    
    if (error) {
      console.log(`Erro ao buscar clientes da empresa ${companyId}:`, error.message);
      return null;
    }
    
    return data;
  }

  // Testar conexão com Asaas
  async testAsaasConnection(apiKey, isProduction = false) {
    try {
      const baseUrl = isProduction 
        ? 'https://www.asaas.com/api/v3'
        : 'https://sandbox.asaas.com/api/v3';
      
      const response = await fetch(`${baseUrl}/finance/balance`, {
        method: 'GET',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Analisar subcontas
  async analyzeSubaccounts() {
    console.log('🏢 Buscando todas as empresas...\n');

    const companies = await this.getAllCompanies();
    if (!companies) {
      console.log('❌ Nenhuma empresa encontrada');
      return;
    }

    const summary = {
      companiesAnalyzed: companies.length,
      productionActiveSubaccounts: 0,
      companiesWithProduction: new Set(),
      alerts: []
    };

    console.log(`📊 Total de empresas: ${companies.length}\n`);

    for (const company of companies) {
      console.log(`\n🏢 Empresa: ${company.nome}`);
      console.log(`   CNPJ: ${company.cnpj}`);
      console.log(`   Status: ${company.status}`);
      console.log(`   ID: ${company.id}`);

      // Buscar subcontas
      const subaccounts = await this.getSubaccountsByCompany(company.id);

      if (subaccounts && subaccounts.length > 0) {
        console.log(`\n   📋 Subcontas Asaas: ${subaccounts.length}`);

        for (const subaccount of subaccounts) {
          console.log(`\n   🔑 Subconta #${subaccount.id}`);
          console.log(`      Asaas ID: ${subaccount.asaas_id}`);
          console.log(`      Wallet ID: ${subaccount.wallet_id || 'N/A'}`);
          console.log(`      Status: ${subaccount.status}`);
          console.log(`      Tipo de Conta: ${subaccount.account_type}`);
          console.log(`      Config Manual: ${subaccount.is_manual_config ? 'Sim' : 'Não'}`);

          if (subaccount.is_manual_config) {
            console.log(`      Wallet ID Manual: ${subaccount.manual_wallet_id ? '✅ Configurado' : '❌ Não configurado'}`);
            console.log(`      API Key Manual: ${subaccount.manual_api_key ? '✅ Configurada' : '❌ Não configurada'}`);
          }

          // Verificar se está em produção e checagens adicionais
          const isProduction = subaccount.asaas_config?.environment === 'production';
          const hasProdApiKey = subaccount.is_manual_config
            ? Boolean(subaccount.manual_api_key)
            : Boolean(subaccount.asaas_config?.api_key_production);
          const hasWalletId = subaccount.is_manual_config
            ? Boolean(subaccount.manual_wallet_id)
            : Boolean(subaccount.wallet_id);

          console.log(`      Ambiente: ${isProduction ? '🚀 PRODUÇÃO' : '🧪 Sandbox'}`);
          console.log(`      Conta em produção: ${isProduction ? '✅ Sim' : '❌ Não'}`);

          if (isProduction) {
            console.log('      Checagens de produção:');
            console.log(`        • API Key Produção: ${hasProdApiKey ? '✅ OK' : '🔴 Ausente'}`);
            console.log(`        • Wallet ID: ${hasWalletId ? '✅ OK' : '🔴 Ausente'}`);
          }

          if (isProduction) {
            summary.companiesWithProduction.add(company.nome);
            if (subaccount.status === 'active') {
              summary.productionActiveSubaccounts++;
            } else {
              summary.alerts.push(`⚠️ Empresa ${company.nome} - Subconta #${subaccount.id}: produção com status '${subaccount.status}'`);
            }

            if (!hasProdApiKey) {
              summary.alerts.push(`🔴 Empresa ${company.nome} - Subconta #${subaccount.id}: ambiente produção sem API key`);
            }
            if (!hasWalletId) {
              summary.alerts.push(`🔴 Empresa ${company.nome} - Subconta #${subaccount.id}: ambiente produção sem wallet_id`);
            }

            // Testar conexão se houver API key
            const apiKey = subaccount.is_manual_config
              ? subaccount.manual_api_key
              : subaccount.asaas_config?.api_key_production;

            if (apiKey) {
              console.log(`      🧪 Testando conexão...`);
              const testResult = await this.testAsaasConnection(apiKey, true);
              if (testResult.success) {
                console.log(`      ✅ Conexão OK (Status: ${testResult.status})`);
              } else {
                const reason = testResult.error || testResult.statusText || 'Motivo desconhecido';
                console.log(`      ❌ Falha na conexão: ${reason}`);
                summary.alerts.push(`🔴 Empresa ${company.nome} - Subconta #${subaccount.id}: falha na conexão produção (${reason})`);
              }
            }
          }
        }
      } else {
        console.log(`   ❌ Nenhuma subconta Asaas encontrada`);
      }

      // Buscar alguns clientes da empresa
      const clients = await this.getClientsByCompany(company.id);
      if (clients && clients.length > 0) {
        console.log(`\n   👥 Clientes (${clients.length} primeiros):`);
        clients.forEach(client => {
          console.log(`      - ${client.nome} (${client.cpf_cnpj})`);
        });
      }

      console.log('\n' + '='.repeat(80));
    }

    // Resumo executivo
    console.log('\n' + '='.repeat(80));
    console.log('📈 RESUMO EXECUTIVO');
    console.log(`- Empresas analisadas: ${summary.companiesAnalyzed}`);
    console.log(`- Subcontas em produção ativas: ${summary.productionActiveSubaccounts}`);

    const companiesList = Array.from(summary.companiesWithProduction);
    if (companiesList.length > 0) {
      console.log('- Empresas com contas em produção:');
      companiesList.forEach(nome => console.log(`  • ${nome}`));
    } else {
      console.log('- Empresas com contas em produção: Nenhuma');
    }

    if (summary.alerts.length > 0) {
      console.log('\n🔴 Alertas encontrados:');
      summary.alerts.forEach(alert => console.log(`  - ${alert}`));
    } else {
      console.log('\n✅ Nenhum alerta encontrado');
    }
  }
}

// Função principal
async function main() {
  const checker = new ProductionSubaccountChecker();
  
  console.log('🔍 ANÁLISE DE SUBCONTAS ASAAS EM PRODUÇÃO');
  console.log('=' .repeat(50));
  
  try {
    await checker.analyzeSubaccounts();
    console.log('\n✅ Análise concluída!');
  } catch (error) {
    console.error('❌ Erro durante a análise:', error.message);
    process.exit(1);
  }
}

// Executar
main();