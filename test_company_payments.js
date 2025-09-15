import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const COMPANY_ID = '7d573ce0-125d-46bf-9e37-33d0c6074cf9'; // Company do diego2@despachante.com

async function testCompanyPayments() {
  console.log('🧪 Testando busca de cobranças por company_id...');
  console.log(`📋 Company ID: ${COMPANY_ID}`);
  
  try {
    const url = `${API_BASE}/api/payments/company/${COMPANY_ID}`;
    console.log(`🔗 URL: ${url}`);
    
    const response = await fetch(url);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Sucesso!');
      console.log(`📈 Total de cobranças: ${data.payments?.length || 0}`);
      
      if (data.payments && data.payments.length > 0) {
        console.log('\n📋 Primeiras 3 cobranças:');
        data.payments.slice(0, 3).forEach((payment, index) => {
          console.log(`\n${index + 1}. Cobrança:`);
          console.log(`   ID: ${payment.payment_id}`);
          console.log(`   Tipo: ${payment.payment_type}`);
          console.log(`   Valor: R$ ${payment.amount}`);
          console.log(`   Status: ${payment.status}`);
          console.log(`   Cliente: ${payment.customer_name}`);
          console.log(`   Descrição: ${payment.description}`);
          console.log(`   QR Code: ${payment.pix_qr_code ? 'Presente' : 'Ausente'}`);
          console.log(`   PIX Copy/Paste: ${payment.pix_copy_paste ? 'Presente' : 'Ausente'}`);
        });
      } else {
        console.log('⚠️ Nenhuma cobrança encontrada');
      }
    } else {
      console.log('❌ Erro na API:');
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
  }
}

// Executar teste
testCompanyPayments();