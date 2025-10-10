const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://ktgynzdzvfcpvbdbtplu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Z3luemR6dmZjcHZiZGJ0cGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDYzMTg3NywiZXhwIjoyMDUwMjA3ODc3fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testChatDataFix() {
  console.log('🧪 === TESTE DA CORREÇÃO DOS DADOS DO CHAT ===');
  
  const multaId = '49a52e83-1135-4450-891a-8d9dc55707ae';
  console.log('🆔 Testando com multa ID:', multaId);
  
  try {
    // 1. Buscar dados da multa no banco
    console.log('\n1️⃣ === BUSCANDO DADOS DA MULTA NO BANCO ===');
    const { data: multaBanco, error } = await supabase
      .from('multas')
      .select('*')
      .eq('id', multaId)
      .single();
    
    if (error) {
      console.error('❌ Erro ao buscar multa:', error);
      return;
    }
    
    if (!multaBanco) {
      console.log('❌ Multa não encontrada no banco');
      return;
    }
    
    console.log('✅ Multa encontrada no banco:');
    console.log('📋 Dados completos da multa:', {
      id: multaBanco.id,
      numero_auto: multaBanco.numero_auto,
      placa_veiculo: multaBanco.placa_veiculo,
      data_infracao: multaBanco.data_infracao,
      local_infracao: multaBanco.local_infracao,
      codigo_infracao: multaBanco.codigo_infracao,
      orgao_autuador: multaBanco.orgao_autuador,
      descricao_infracao: multaBanco.descricao_infracao,
      valor_original: multaBanco.valor_original,
      valor_final: multaBanco.valor_final,
      pontos: multaBanco.pontos,
      tipo_gravidade: multaBanco.tipo_gravidade,
      renavam_veiculo: multaBanco.renavam_veiculo,
      condutor: multaBanco.condutor,
      observacoes: multaBanco.observacoes,
      client_id: multaBanco.client_id,
      company_id: multaBanco.company_id
    });
    
    // 2. Simular preparação dos dados para o webhook (como será feito agora)
    console.log('\n2️⃣ === SIMULANDO PREPARAÇÃO DOS DADOS PARA WEBHOOK ===');
    
    const dadosCompletosMulta = {
      numero_auto: multaBanco.numero_auto || '',
      placa_veiculo: multaBanco.placa_veiculo || '',
      data_hora_infracao: multaBanco.data_infracao || '',
      local_infracao: multaBanco.local_infracao || '',
      codigo_infracao: multaBanco.codigo_infracao || '',
      orgao_autuador: multaBanco.orgao_autuador || '',
      descricao_infracao: multaBanco.descricao_infracao || '',
      valor_multa: multaBanco.valor_original || multaBanco.valor_final || 0,
      pontos: multaBanco.pontos || 0,
      tipo_gravidade: multaBanco.tipo_gravidade || '',
      renavam_veiculo: multaBanco.renavam_veiculo || '',
      condutor: multaBanco.condutor || '',
      observacoes: multaBanco.observacoes || ''
    };
    
    console.log('📊 Dados preparados para o webhook:', dadosCompletosMulta);
    
    // 3. Buscar dados do cliente
    console.log('\n3️⃣ === BUSCANDO DADOS DO CLIENTE ===');
    let clienteData = null;
    
    if (multaBanco.client_id) {
      const { data: cliente, error: clienteError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', multaBanco.client_id)
        .single();
      
      if (clienteError) {
        console.warn('⚠️ Erro ao buscar cliente:', clienteError);
      } else {
        clienteData = cliente;
        console.log('✅ Cliente encontrado:', {
          id: cliente.id,
          nome: cliente.nome,
          cpf_cnpj: cliente.cpf_cnpj,
          email: cliente.email,
          endereco: cliente.endereco
        });
      }
    } else {
      console.log('⚠️ Multa não possui client_id associado');
    }
    
    // 4. Simular payload completo do webhook
    console.log('\n4️⃣ === SIMULANDO PAYLOAD COMPLETO DO WEBHOOK ===');
    
    const webhookData = {
      nome_requerente: clienteData?.nome || 'ANA PAULA CARVALHO ZORZZI',
      cpf_cnpj: clienteData?.cpf_cnpj || 'CPF/CNPJ não informado',
      endereco_requerente: clienteData?.endereco || 'Endereço não informado',
      placa_veiculo: dadosCompletosMulta.placa_veiculo,
      renavam_veiculo: dadosCompletosMulta.renavam_veiculo,
      numero_auto: dadosCompletosMulta.numero_auto,
      data_hora_infracao: dadosCompletosMulta.data_hora_infracao,
      local_infracao: dadosCompletosMulta.local_infracao,
      codigo_infracao: dadosCompletosMulta.codigo_infracao,
      orgao_autuador: dadosCompletosMulta.orgao_autuador,
      descricao_infracao: dadosCompletosMulta.descricao_infracao,
      valor_multa: dadosCompletosMulta.valor_multa,
      pontos: dadosCompletosMulta.pontos,
      tipo_gravidade: dadosCompletosMulta.tipo_gravidade,
      condutor: dadosCompletosMulta.condutor,
      observacoes: dadosCompletosMulta.observacoes,
      idmultabancodedados: multaId,
      mensagem_usuario: 'Analise o auto de infração e verifique inconsistências conforme regras do MBFT e a justificativa minha justificativa para anular a autuação.',
      company_id: multaBanco.company_id || '7d573ce0-125d-46bf-9e37-33d0c6074cf9'
    };
    
    console.log('📤 Payload completo que será enviado para o agent:');
    console.log(JSON.stringify(webhookData, null, 2));
    
    // 5. Validar campos obrigatórios
    console.log('\n5️⃣ === VALIDANDO CAMPOS OBRIGATÓRIOS ===');
    
    const camposObrigatorios = {
      placa_veiculo: webhookData.placa_veiculo,
      numero_auto: webhookData.numero_auto,
      data_hora_infracao: webhookData.data_hora_infracao,
      local_infracao: webhookData.local_infracao,
      codigo_infracao: webhookData.codigo_infracao,
      orgao_autuador: webhookData.orgao_autuador
    };
    
    const camposVazios = Object.entries(camposObrigatorios)
      .filter(([key, value]) => !value || value.trim() === '')
      .map(([key]) => key);
    
    if (camposVazios.length > 0) {
      console.warn('⚠️ Campos obrigatórios vazios:', camposVazios);
      console.warn('💡 AÇÃO NECESSÁRIA: Estes campos precisam ser preenchidos no banco de dados');
    } else {
      console.log('✅ Todos os campos obrigatórios estão preenchidos!');
    }
    
    // 6. Comparar com dados anteriores (vazios)
    console.log('\n6️⃣ === COMPARAÇÃO COM DADOS ANTERIORES ===');
    
    const dadosAnteriores = {
      placa_veiculo: '',
      renavam_veiculo: '',
      numero_auto: '',
      data_hora_infracao: '',
      local_infracao: '',
      codigo_infracao: '',
      orgao_autuador: ''
    };
    
    console.log('❌ Dados anteriores (vazios):', dadosAnteriores);
    console.log('✅ Dados corrigidos (do banco):', {
      placa_veiculo: webhookData.placa_veiculo,
      renavam_veiculo: webhookData.renavam_veiculo,
      numero_auto: webhookData.numero_auto,
      data_hora_infracao: webhookData.data_hora_infracao,
      local_infracao: webhookData.local_infracao,
      codigo_infracao: webhookData.codigo_infracao,
      orgao_autuador: webhookData.orgao_autuador
    });
    
    console.log('\n🎯 === RESULTADO DO TESTE ===');
    
    const camposCorrigidos = Object.keys(dadosAnteriores).filter(campo => {
      const valorAntigo = dadosAnteriores[campo];
      const valorNovo = webhookData[campo];
      return valorAntigo !== valorNovo && valorNovo && valorNovo.trim() !== '';
    });
    
    if (camposCorrigidos.length > 0) {
      console.log('✅ CORREÇÃO BEM-SUCEDIDA!');
      console.log('📊 Campos corrigidos:', camposCorrigidos);
      console.log('💡 O agent agora receberá dados completos para análise');
    } else {
      console.log('⚠️ Nenhum campo foi corrigido - verificar se os dados estão no banco');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testChatDataFix();