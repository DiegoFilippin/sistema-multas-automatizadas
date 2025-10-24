import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixWalletSync() {
  console.log('🔧 === CORRIGIR SINCRONIZAÇÃO DE WALLET (manual_wallet_id) ===');
  
  const company_id = '7d573ce0-125d-46bf-9e37-33d0c6074cf9'; // F&Z CONSULTORIA
  const wallet_id = '2bb1d7d-7530-45ac-953d-b9f7a980c4af'; // Wallet ID do Asaas (das imagens)
  
  try {
    // 1. Verificar estado atual
    console.log('\n1️⃣ Verificando estado atual da empresa...');
    const { data: currentCompany, error: currentError } = await supabase
      .from('companies')
      .select('id, nome, manual_wallet_id')
      .eq('id', company_id)
      .single();
    
    if (currentError) {
      console.error('❌ Erro ao buscar empresa:', currentError);
      return;
    }
    
    console.log('📊 Estado atual:');
    console.log('  - ID:', currentCompany.id);
    console.log('  - Nome:', currentCompany.nome);
    console.log('  - manual_wallet_id:', currentCompany.manual_wallet_id || 'NULL');
    
    // 2. Atualizar wallet_id
    console.log('\n2️⃣ Atualizando manual_wallet_id...');
    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update({ manual_wallet_id: wallet_id })
      .eq('id', company_id)
      .select('id, nome, manual_wallet_id')
      .single();
    
    if (updateError) {
      console.error('❌ Erro ao atualizar empresa:', updateError);
      return;
    }
    
    console.log('✅ Empresa atualizada com sucesso!');
    console.log('📊 Novo estado:');
    console.log('  - ID:', updatedCompany.id);
    console.log('  - Nome:', updatedCompany.nome);
    console.log('  - manual_wallet_id:', updatedCompany.manual_wallet_id);
    
    // 3. Testar validação de leitura
    console.log('\n3️⃣ Testando leitura após atualização...');
    const { data: testCompany, error: testError } = await supabase
      .from('companies')
      .select('manual_wallet_id, nome')
      .eq('id', company_id)
      .single();
    
    if (testError || !testCompany?.manual_wallet_id) {
      console.log('❌ Validação ainda falha:', testError);
    } else {
      console.log('✅ Validação agora passa!');
      console.log('  - Empresa:', testCompany.nome);
      console.log('  - Wallet:', testCompany.manual_wallet_id);
    }
    
    // 4. Resumo da correção
    console.log('\n🎯 === RESUMO DA CORREÇÃO ===');
    console.log('✅ Problema identificado: manual_wallet_id estava NULL no banco');
    console.log('✅ Solução aplicada: Sincronizado com wallet ID do Asaas');
    console.log('✅ Wallet ID configurado:', wallet_id);
    console.log('✅ Leitura agora usa manual_wallet_id como única fonte');
    
    console.log('\n🧪 PRÓXIMO PASSO:');
    console.log('   Testar criação de cobrança na aplicação');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

fixWalletSync();