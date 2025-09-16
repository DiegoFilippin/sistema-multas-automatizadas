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

async function buscarEmpresaDiego() {
  console.log('🔍 Buscando empresa do usuário diego2@despachante.com...');
  
  try {
    // 1. Buscar usuário por email
    console.log('\n1️⃣ Buscando usuário por email...');
    const { data: usuario, error: usuarioError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'diego2@despachante.com')
      .single();
    
    if (usuarioError) {
      console.error('❌ Erro ao buscar usuário:', usuarioError);
      
      // Tentar buscar por padrão similar
      console.log('\n🔍 Tentando buscar usuários similares...');
      const { data: usuariosSimilares, error: usuariosSimilaresError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', '%diego%');
      
      if (usuariosSimilaresError) {
        console.error('❌ Erro ao buscar usuários similares:', usuariosSimilaresError);
        return;
      }
      
      console.log(`✅ Encontrados ${usuariosSimilares.length} usuários com 'diego' no email:`);
      usuariosSimilares.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id} | Email: ${user.email} | Company ID: ${user.company_id || 'NÃO DEFINIDO'}`);
      });
      
      if (usuariosSimilares.length === 0) {
        console.log('❌ Nenhum usuário encontrado!');
        return;
      }
      
      // Usar o primeiro usuário encontrado
      const usuarioEncontrado = usuariosSimilares[0];
      console.log(`\n📌 Usando usuário: ${usuarioEncontrado.email}`);
      
      return await buscarDadosEmpresa(usuarioEncontrado);
    }
    
    console.log('✅ Usuário encontrado:');
    console.log('   - ID:', usuario.id);
    console.log('   - Email:', usuario.email);
    console.log('   - Company ID:', usuario.company_id || 'NÃO DEFINIDO');
    console.log('   - Created:', usuario.created_at);
    
    return await buscarDadosEmpresa(usuario);
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

async function buscarDadosEmpresa(usuario) {
  if (!usuario.company_id) {
    console.log('❌ Usuário não possui company_id associado!');
    return;
  }
  
  try {
    // 2. Buscar empresa pelo company_id
    console.log('\n2️⃣ Buscando dados da empresa...');
    const { data: empresa, error: empresaError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', usuario.company_id)
      .single();
    
    if (empresaError) {
      console.error('❌ Erro ao buscar empresa:', empresaError);
      return;
    }
    
    console.log('✅ Empresa encontrada:');
    console.log('   - ID:', empresa.id);
    console.log('   - Nome:', empresa.nome || empresa.name || 'NÃO DEFINIDO');
    console.log('   - Email:', empresa.email);
    console.log('   - CNPJ:', empresa.cnpj || 'NÃO DEFINIDO');
    console.log('   - Wallet ID:', empresa.wallet_id || 'NÃO CONFIGURADO');
    console.log('   - Asaas Wallet ID:', empresa.asaas_wallet_id || 'NÃO CONFIGURADO');
    console.log('   - Created:', empresa.created_at);
    console.log('   - Updated:', empresa.updated_at);
    
    // 3. Verificar histórico de payments
    console.log('\n3️⃣ Verificando histórico de payments...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, status, created_at, payment_id')
      .eq('company_id', empresa.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (paymentsError) {
      console.error('❌ Erro ao buscar payments:', paymentsError);
    } else {
      console.log(`✅ Encontrados ${payments.length} payments:`);
      payments.forEach((payment, index) => {
        console.log(`   ${index + 1}. ID: ${payment.id} | Valor: R$ ${payment.amount} | Status: ${payment.status} | Data: ${payment.created_at}`);
      });
    }
    
    // 4. Verificar services da empresa
    console.log('\n4️⃣ Verificando services da empresa...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, suggested_price, company_id')
      .eq('company_id', empresa.id);
    
    if (servicesError) {
      console.error('❌ Erro ao buscar services:', servicesError);
    } else {
      console.log(`✅ Encontrados ${services.length} services:`);
      services.forEach((service, index) => {
        console.log(`   ${index + 1}. ID: ${service.id} | Nome: ${service.name} | Preço: R$ ${service.suggested_price}`);
      });
    }
    
    // 5. Verificar wallet no Asaas (se configurado)
    if (empresa.wallet_id) {
      console.log('\n5️⃣ Verificando wallet no Asaas...');
      const { data: wallet, error: walletError } = await supabase
        .from('asaas_wallets')
        .select('*')
        .eq('id', empresa.wallet_id)
        .single();
      
      if (walletError) {
        console.error('❌ Erro ao buscar wallet:', walletError);
      } else if (wallet) {
        console.log('✅ Wallet encontrado:');
        console.log('   - ID:', wallet.id);
        console.log('   - API Key:', wallet.api_key ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
        console.log('   - Environment:', wallet.environment);
        console.log('   - Active:', wallet.active);
      } else {
        console.log('❌ Wallet não encontrado na tabela asaas_wallets!');
      }
    }
    
    // 6. Resumo da situação
    console.log('\n📊 RESUMO DA SITUAÇÃO:');
    console.log('   - Usuário existe:', usuario ? '✅' : '❌');
    console.log('   - Empresa existe:', empresa ? '✅' : '❌');
    console.log('   - Wallet configurado:', empresa.wallet_id ? '✅' : '❌');
    console.log('   - Payments anteriores:', payments && payments.length > 0 ? `✅ (${payments.length})` : '❌');
    console.log('   - Services disponíveis:', services && services.length > 0 ? `✅ (${services.length})` : '❌');
    
    // 7. Diagnóstico do problema
    console.log('\n🔧 DIAGNÓSTICO:');
    if (!empresa.wallet_id) {
      console.log('❌ PROBLEMA: Empresa não possui wallet_id configurado!');
      console.log('   💡 SOLUÇÃO: Configure o wallet no painel administrativo');
    } else {
      console.log('✅ Wallet ID está configurado na empresa');
      console.log('   🔍 Verificar se o wallet existe na tabela asaas_wallets');
    }
    
  } catch (error) {
    console.error('💥 Erro ao buscar dados da empresa:', error);
  }
}

buscarEmpresaDiego();