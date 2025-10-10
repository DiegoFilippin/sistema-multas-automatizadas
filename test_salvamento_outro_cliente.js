const fetch = require('node-fetch');

// Teste para reproduzir o erro de salvamento com outro cliente
async function testarSalvamentoOutroCliente() {
  console.log('🧪 === TESTE: SALVAMENTO COM OUTRO CLIENTE ===');
  
  try {
    // Dados de teste com um cliente diferente
    const dadosTeste = {
      webhook_data: {
        id: 'pay_test_' + Date.now(),
        value: 150.00,
        status: 'PENDING',
        description: 'Recurso de multa - Teste outro cliente',
        encodedImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        payload: '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000520400005303986540515.005802BR5925NOME DO BENEFICIARIO6009SAO PAULO62070503***6304ABCD',
        invoiceUrl: 'https://sandbox.asaas.com/i/test123',
        invoiceNumber: 'INV-' + Date.now(),
        externalReference: 'EXT-' + Date.now(),
        billingType: 'PIX',
        dateCreated: new Date().toISOString(),
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      customer_id: 'cliente-inexistente-123', // Cliente que não existe
      service_id: 'servico-inexistente-456', // Serviço que não existe
      company_id: '7d573ce0-125d-46bf-9e37-33d0c6074cf9',
      valor_cobranca: 150.00
    };
    
    console.log('📦 Dados de teste:');
    console.log('  - Customer ID:', dadosTeste.customer_id);
    console.log('  - Service ID:', dadosTeste.service_id);
    console.log('  - Company ID:', dadosTeste.company_id);
    console.log('  - Valor:', dadosTeste.valor_cobranca);
    
    console.log('\n🚀 Enviando POST para save-service-order...');
    
    const response = await fetch('http://localhost:3001/api/payments/save-service-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5MmJmMWE1Yy1j