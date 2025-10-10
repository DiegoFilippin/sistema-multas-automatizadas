// Script para corrigir o mapeamento de dados na página de cobranças
const fs = require('fs');
const path = require('path');

// Ler o arquivo atual
const filePath = path.join(__dirname, 'src/pages/CobrancasGerais.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Corrigir a função carregarCobrancas para mapear corretamente os dados
const oldCarregarCobrancas = `  const carregarCobrancas = async () => {
    try {
      setIsLoading(true);
      
      // Se é superadmin, busca todas as cobranças, senão busca apenas da empresa
      const endpoint = isSuperadmin() 
        ? '/api/payments/all'
        : \`/api/payments/company/\${user?.company_id}\`;
      
      const params = new URLSearchParams();
      if (companyFilter !== 'all' && isSuperadmin()) {
        params.append('companyId', companyFilter);
      }
      
      const url = params.toString() ? \`\${endpoint}?\${params}\` : endpoint;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': \`Bearer \${localStorage.getItem('token')}\`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCobrancas(data.payments || []);
      } else {
        toast.error('Erro ao carregar cobranças');
      }
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
      toast.error('Erro ao carregar cobranças');
    } finally {
      setIsLoading(false);
    }
  };`;

const newCarregarCobrancas = `  const carregarCobrancas = async () => {
    try {
      setIsLoading(true);
      
      // Se é superadmin, busca todas as cobranças, senão busca apenas da empresa
      const endpoint = isSuperadmin() 
        ? '/api/payments/all'
        : \`/api/payments/company/\${user?.company_id}\`;
      
      const params = new URLSearchParams();
      if (companyFilter !== 'all' && isSuperadmin()) {
        params.append('companyId', companyFilter);
      }
      
      const url = params.toString() ? \`\${endpoint}?\${params}\` : endpoint;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': \`Bearer \${localStorage.getItem('token')}\`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Dados recebidos da API:', data); // Debug
        
        // Mapear os dados para o formato esperado pela interface
        const mappedPayments = (data.payments || []).map(payment => ({
          id: payment.id || payment.payment_id,
          client_id: payment.customer_id || payment.client_id,
          client_name: payment.customer_name || payment.customer?.nome || payment.client?.nome || 'Cliente',
          amount: payment.amount || payment.value || 0,
          due_date: payment.due_date,
          status: mapApiStatusToInterface(payment.status),
          description: payment.description || \`Compra de \${payment.credit_amount || 0} créditos\`,
          payment_method: payment.payment_method || payment.method || 'PIX',
          asaas_payment_id: payment.asaas_payment_id,
          created_at: payment.created_at,
          paid_at: payment.payment_date || payment.confirmed_at,
          invoice_url: payment.invoice_url,
          pix_qr_code: payment.pix_qr_code,
          company_name: payment.company_name || payment.company?.nome,
          company_id: payment.company_id
        }));
        
        console.log('Dados mapeados:', mappedPayments); // Debug
        setCobrancas(mappedPayments);
      } else {
        console.error('Erro na resposta da API:', response.status, response.statusText);
        toast.error('Erro ao carregar cobranças');
      }
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
      toast.error('Erro ao carregar cobranças');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para mapear status da API para interface
  const mapApiStatusToInterface = (apiStatus: string): 'pending' | 'paid' | 'overdue' | 'cancelled' => {
    switch (apiStatus?.toLowerCase()) {
      case 'confirmed':
      case 'paid':
      case 'received':
        return 'paid';
      case 'pending':
        return 'pending';
      case 'cancelled':
      case 'refunded':
        return 'cancelled';
      case 'overdue':
        return 'overdue';
      default:
        return 'pending';
    }
  };`;

// Substituir a função
content = content.replace(oldCarregarCobrancas, newCarregarCobrancas);

// Salvar o arquivo modificado
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Arquivo CobrancasGerais.tsx atualizado com sucesso!');
console.log('🔧 Adicionado mapeamento de dados e logs de debug');
console.log('💡 Agora a página deve exibir as cobranças corretamente');
console.log('🐛 Verifique o console do navegador para logs de debug');