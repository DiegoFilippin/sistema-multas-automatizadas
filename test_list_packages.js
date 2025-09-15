// Teste para listar pacotes de créditos disponíveis
import fetch from 'node-fetch';

async function testListPackages() {
  try {
    console.log('🔍 Listando pacotes de créditos disponíveis...');
    
    const response = await fetch('http://localhost:3001/api/credits/packages?targetType=company');
    
    if (!response.ok) {
      console.error('❌ Erro na requisição:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Detalhes do erro:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ Pacotes encontrados:');
    if (data.packages && data.packages.length > 0) {
      data.packages.forEach((pkg, index) => {
        console.log(`${index + 1}. ID: ${pkg.id}`);
        console.log(`   Nome: ${pkg.name}`);
        console.log(`   Créditos: ${pkg.credits}`);
        console.log(`   Preço: R$ ${pkg.price}`);
        console.log(`   Desconto: ${pkg.discount_percentage}%`);
        console.log(`   Ativo: ${pkg.active}`);
        console.log('---');
      });
      
      // Usar o primeiro pacote ativo para teste
      const activePackage = data.packages.find(pkg => pkg.active);
      if (activePackage) {
        console.log(`\n🎯 Usando pacote "${activePackage.name}" (ID: ${activePackage.id}) para teste...`);
        await testCreatePayment(activePackage.id);
      } else {
        console.log('⚠️ Nenhum pacote ativo encontrado para teste');
      }
    } else {
      console.log('⚠️ Nenhum pacote encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

async function testCreatePayment(packageId) {
  try {
    console.log('\n💳 Testando criação de pagamento PIX...');
    
    const paymentData = {
      packageId: packageId,
      customerId: '1',
      companyId: '1'
    };
    
    const response = await fetch('http://localhost:3001/api/credits/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });
    
    if (!response.ok) {
      console.error('❌ Erro na criação do pagamento:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Detalhes do erro:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ Pagamento criado com sucesso!');
    console.log('- Payment ID:', data.paymentId);
    console.log('- Asaas Payment ID:', data.asaasPaymentId);
    console.log('- Tem QR Code:', !!data.pixQrCode);
    
    if (data.pixQrCode) {
      console.log('🎉 QR Code gerado! Tamanho:', data.pixQrCode.length, 'caracteres');
    } else {
      console.log('⚠️ QR Code não foi gerado');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de pagamento:', error.message);
  }
}

testListPackages();