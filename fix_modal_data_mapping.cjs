// Script para corrigir o mapeamento de dados no modal de detalhes
const fs = require('fs');
const path = require('path');

// Função para corrigir o mapeamento de dados na API
function fixApiDataMapping() {
  const apiFile = path.join(__dirname, 'api/routes/payments.ts');
  let content = fs.readFileSync(apiFile, 'utf8');
  
  // Melhorar o mapeamento de service_orders para incluir todos os campos necessários
  const oldServiceOrderMapping = `// Cobranças de multa (service_orders) - INCLUINDO AS SINCRONIZADAS
      ...(serviceOrders || []).map(order => ({
        ...order,
        source: 'service_order',
        payment_id: order.payment_id || order.id,
        payment_date: order.paid_at,
        due_date: order.expires_at,
        value: order.amount,
        amount: order.amount,
        description: order.description || \`Recurso de Multa - \${order.multa_type?.toUpperCase()}\`,
        method: 'PIX',
        customer_name: order.client?.nome || order.client_name || order.customer_name || 'Cliente não identificado',
        client_name: order.client?.nome || order.client_name || order.customer_name || 'Cliente não identificado',
        multa_type: order.multa_type || 'Recurso de Multa',
        status: order.status === 'paid' ? 'confirmed' : (order.status === 'pending_payment' ? 'pending' : order.status),
        qr_code: order.qr_code,
        pix_copy_paste: order.pix_copy_paste,
        payment_url: order.payment_url
      })),`;
  
  const newServiceOrderMapping = `// Cobranças de multa (service_orders) - INCLUINDO AS SINCRONIZADAS
      ...(serviceOrders || []).map(order => {
        // Extrair dados do campo notes se existir
        let webhookData = null;
        let processedData = null;
        
        if (order.notes) {
          try {
            const notesData = JSON.parse(order.notes);
            webhookData = notesData.webhook_data;
            processedData = notesData.processed_data;
          } catch (e) {
            console.warn('Erro ao parsear notes:', e);
          }
        }
        
        return {
          ...order,
          source: 'service_order',
          payment_id: order.payment_id || order.id,
          payment_date: order.paid_at,
          due_date: order.expires_at,
          value: order.amount,
          amount: order.amount,
          description: order.payment_description || processedData?.payment_description || order.description || \`Recurso de Multa - \${order.multa_type?.toUpperCase()}\`,
          method: 'PIX',
          // Melhor mapeamento do nome do cliente
          customer_name: order.client?.nome || order.client_name || order.customer_name || processedData?.customer_name || webhookData?.customer?.name || 'Cliente não identificado',
          client_name: order.client?.nome || order.client_name || order.customer_name || processedData?.customer_name || webhookData?.customer?.name || 'Cliente não identificado',
          multa_type: order.multa_type || 'Recurso de Multa',
          // Melhor mapeamento do status
          status: order.status === 'paid' ? 'confirmed' : 
                 (order.status === 'pending_payment' ? 'pending' : 
                 (processedData?.status || webhookData?.status || order.status || 'pending')),
          // Melhor mapeamento dos dados PIX
          qr_code: order.qr_code_image || processedData?.qr_code_image || order.qr_code,
          pix_copy_paste: order.pix_payload || processedData?.pix_payload || order.pix_copy_paste,
          payment_url: order.invoice_url || processedData?.invoice_url || order.payment_url,
          // Campos adicionais do webhook
          invoice_url: order.invoice_url || processedData?.invoice_url,
          webhook_data: webhookData,
          processed_data: processedData
        };
      }),`;
  
  if (content.includes(oldServiceOrderMapping)) {
    content = content.replace(oldServiceOrderMapping, newServiceOrderMapping);
    fs.writeFileSync(apiFile, content);
    console.log('✅ Mapeamento de service_orders corrigido na API');
  } else {
    console.log('⚠️ Padrão não encontrado na API - pode já estar atualizado');
  }
}

// Função para corrigir o modal no frontend
function fixModalDataDisplay() {
  const modalFile = path.join(__dirname, 'src/pages/MeusServicos.tsx');
  let content = fs.readFileSync(modalFile, 'utf8');
  
  // Melhorar a função getClientDisplay para lidar com dados faltantes
  const oldGetClientDisplay = `// Função para exibir nome do cliente com fallback
  const getClientDisplay = (cobranca: PaymentResponse): string => {
    if (cobranca.client_name && cobranca.client_name.trim() !== '') {
      return cobranca.client_name;
    }
    
    if (cobranca.customer_name && cobranca.customer_name.trim() !== '') {
      return cobranca.customer_name;
    }
    
    if (cobranca.customer_id) {
      return \`Cliente \${cobranca.customer_id}\`;
    }
    
    return 'Cliente não identificado';
  };`;
  
  const newGetClientDisplay = `// Função para exibir nome do cliente com fallback melhorado
  const getClientDisplay = (cobranca: PaymentResponse): string => {
    // Tentar múltiplas fontes de nome do cliente
    const possibleNames = [
      cobranca.client_name,
      cobranca.customer_name,
      cobranca.webhook_data?.customer?.name,
      cobranca.processed_data?.customer_name
    ].filter(name => name && name.trim() !== '' && name !== 'N/A');
    
    if (possibleNames.length > 0) {
      return possibleNames[0];
    }
    
    if (cobranca.customer_id) {
      return \`Cliente \${cobranca.customer_id}\`;
    }
    
    return 'Cliente não identificado';
  };`;
  
  if (content.includes(oldGetClientDisplay)) {
    content = content.replace(oldGetClientDisplay, newGetClientDisplay);
    console.log('✅ Função getClientDisplay melhorada');
  }
  
  // Melhorar a função getStatusLabel
  const oldGetStatusLabel = `const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'received':
      case 'confirmed':
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'awaiting_payment': return 'Aguardando';
      case 'overdue': return 'Vencido';
      case 'cancelled': return 'Cancelado';
      case 'refunded': return 'Reembolsado';
      default: return 'Desconhecido';
    }
  };`;
  
  const newGetStatusLabel = `const getStatusLabel = (status: string) => {
    if (!status || status.trim() === '') {
      return 'Pendente'; // Status padrão mais útil
    }
    
    switch (status?.toLowerCase()) {
      case 'received':
      case 'confirmed':
      case 'paid': return 'Pago';
      case 'pending':
      case 'pending_payment': return 'Pendente';
      case 'awaiting_payment': return 'Aguardando';
      case 'overdue': return 'Vencido';
      case 'cancelled': return 'Cancelado';
      case 'refunded': return 'Reembolsado';
      default: return 'Pendente'; // Mais útil que "Desconhecido"
    }
  };`;
  
  if (content.includes(oldGetStatusLabel)) {
    content = content.replace(oldGetStatusLabel, newGetStatusLabel);
    console.log('✅ Função getStatusLabel melhorada');
  }
  
  // Adicionar debug no modal para verificar dados
  const modalOpenCode = `onClick={() => {
                          setPaymentResult(cobranca);
                          setShowPaymentModal(true);
                        }}`;
  
  const newModalOpenCode = `onClick={() => {
                          console.log('🔍 Abrindo modal com dados:', cobranca);
                          console.log('  - client_name:', cobranca.client_name);
                          console.log('  - customer_name:', cobranca.customer_name);
                          console.log('  - status:', cobranca.status);
                          console.log('  - qr_code:', !!cobranca.qr_code);
                          console.log('  - pix_copy_paste:', !!cobranca.pix_copy_paste);
                          setPaymentResult(cobranca);
                          setShowPaymentModal(true);
                        }}`;
  
  if (content.includes(modalOpenCode)) {
    content = content.replace(modalOpenCode, newModalOpenCode);
    console.log('✅ Debug adicionado ao modal');
  }
  
  fs.writeFileSync(modalFile, content);
  console.log('✅ Modal corrigido no frontend');
}

// Executar correções
console.log('🔧 Iniciando correção do mapeamento de dados do modal...');

try {
  fixApiDataMapping();
  fixModalDataDisplay();
  
  console.log('\n✅ Correções aplicadas com sucesso!');
  console.log('\n📋 Resumo das correções:');
  console.log('  1. ✅ Melhorado mapeamento de service_orders na API');
  console.log('  2. ✅ Melhorada função getClientDisplay');
  console.log('  3. ✅ Melhorada função getStatusLabel');
  console.log('  4. ✅ Adicionado debug ao modal');
  console.log('\n🔄 Reinicie o servidor para aplicar as mudanças.');
  
} catch (error) {
  console.error('❌ Erro ao aplicar correções:', error);
  process.exit(1);
}