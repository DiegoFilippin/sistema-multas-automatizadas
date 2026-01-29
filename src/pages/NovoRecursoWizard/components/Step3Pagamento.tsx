import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, DollarSign, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Cliente, Servico, Pagamento } from '../types';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import PaymentStatusModal from './PaymentStatusModal';
import { supabase } from '@/lib/supabase';
import { prepaidWalletService } from '@/services/prepaidWalletService';
import { getApiUrl } from '@/lib/api-config';

interface Step3PagamentoProps {
  selectedCliente: Cliente;
  selectedServico: Servico;
  pagamento: Pagamento | null;
  onPagamentoComplete: (pagamento: Pagamento) => void;
  onBack: () => void;
  draftId?: string;
}

const Step3Pagamento: React.FC<Step3PagamentoProps> = ({
  selectedCliente,
  selectedServico,
  pagamento,
  onPagamentoComplete,
  onBack,
  draftId,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<'prepaid' | 'charge' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prepaidBalance, setPrepaidBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<Pagamento | null>(null);

  // Carregar saldo pré-pago
  useEffect(() => {
    loadPrepaidBalance();
  }, [user]);

  const loadPrepaidBalance = async () => {
    if (!user?.company_id) {
      console.log('⚠️ Usuário sem company_id, não é possível carregar saldo');
      setIsLoadingBalance(false);
      return;
    }

    try {
      setIsLoadingBalance(true);
      console.log('🔍 Carregando saldo pré-pago via Supabase para company_id:', user.company_id);

      const result = await prepaidWalletService.getBalance(user.company_id);
      console.log('✅ Saldo carregado:', result.balance);

      setPrepaidBalance(result.balance || 0);
    } catch (error) {
      console.error('❌ Erro ao carregar saldo pré-pago:', error);
      setPrepaidBalance(0);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handlePrepaidPayment = async () => {
    try {
      setIsProcessing(true);

      // Verificar saldo suficiente
      if (prepaidBalance < selectedServico.preco) {
        toast.error('Saldo insuficiente para realizar o pagamento');
        return;
      }

      if (!draftId) {
        toast.error('Erro: Rascunho não encontrado');
        return;
      }

      console.log('💰 Processando pagamento pré-pago para rascunho:', draftId);

      // 1. Atualizar rascunho para status 'em_preenchimento' (pagamento confirmado)
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          status: 'em_preenchimento', // Status correto após pagamento
          payment_method: 'prepaid',
          paid_at: new Date().toISOString(),
          amount: selectedServico.preco, // Garantir que amount seja atualizado
          client_id: selectedCliente.id, // Garantir que client_id esteja preenchido
          service_id: selectedServico.id, // Garantir que service_id esteja preenchido
        })
        .eq('id', draftId);

      if (updateError) {
        console.error('❌ Erro ao atualizar rascunho:', updateError);
        throw new Error('Erro ao atualizar status do recurso');
      }

      console.log('✅ Rascunho atualizado para status paid');

      // 2. Criar transação de débito no saldo pré-pago usando Supabase diretamente
      try {
        const debitResult = await prepaidWalletService.debitForService({
          companyId: user.company_id,
          amount: selectedServico.preco,
          serviceId: selectedServico.id,
          serviceOrderId: draftId,
          notes: `Pagamento via saldo pré-pago - Recurso ${draftId}`,
          createdBy: user.id
        });
        console.log('✅ Transação de débito criada:', debitResult);
      } catch (debitError: any) {
        // Reverter status se falhar
        await supabase
          .from('service_orders')
          .update({ status: 'rascunho', payment_method: null, paid_at: null })
          .eq('id', draftId);
        throw new Error(debitError.message || 'Erro ao processar pagamento');
      }

      // Criar objeto de pagamento
      const pagamentoData: Pagamento = {
        metodo: 'prepaid',
        status: 'paid',
        valor: selectedServico.preco,
        service_order_id: draftId,
        asaas_payment_id: null,
        paid_at: new Date().toISOString(),
      };

      setCurrentPayment(pagamentoData);
      setShowStatusModal(true);
      toast.success('Pagamento processado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao processar pagamento pré-pago:', error);
      toast.error(error.message || 'Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChargePayment = async () => {
    try {
      setIsProcessing(true);

      console.log('🏦 Gerando cobrança Asaas via webhook n8n...');
      console.log('📋 Cliente selecionado:', selectedCliente);
      console.log('📋 Serviço selecionado:', selectedServico);

      // 1. Buscar dados completos do cliente (incluindo asaas_customer_id)
      const { data: clienteCompleto, error: clienteError } = await supabase
        .from('clients')
        .select('id, nome, cpf_cnpj, email, telefone, asaas_customer_id')
        .eq('id', selectedCliente.id)
        .single();

      if (clienteError || !clienteCompleto) {
        console.error('❌ Erro ao buscar cliente:', clienteError);
        throw new Error('Erro ao buscar dados do cliente');
      }

      console.log('✅ Cliente completo:', clienteCompleto);
      console.log('  - Asaas Customer ID:', clienteCompleto.asaas_customer_id);

      if (!clienteCompleto.asaas_customer_id) {
        console.warn('⚠️ Cliente não possui asaas_customer_id');
        toast.warning('Cliente não possui integração com Asaas. O customer será criado automaticamente.');
      }

      // 2. Buscar dados da empresa (wallet do despachante)
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, nome, manual_wallet_id')
        .eq('id', user?.company_id)
        .single();

      if (companyError || !company) {
        console.error('❌ Erro ao buscar empresa:', companyError);
        throw new Error('Empresa não encontrada');
      }

      console.log('✅ Empresa encontrada:', company.nome);
      console.log('  - Wallet ID:', (company as any).manual_wallet_id);

      const dispatcherWalletId = (company as any)?.manual_wallet_id || null;
      if (!dispatcherWalletId) {
        console.error('❌ Wallet do despachante não configurada');
        throw new Error('Wallet do despachante não configurada. Configure manual_wallet_id na empresa.');
      }

      // 3. Buscar wallet da ICETRAN
      let icetranWalletId: string | null = null;
      
      // Primeiro tentar pela parent_company
      const { data: companyRow } = await supabase
        .from('companies')
        .select('parent_company_id')
        .eq('id', user?.company_id)
        .single();

      if (companyRow?.parent_company_id) {
        const { data: parent } = await supabase
          .from('companies')
          .select('id, nome, manual_wallet_id')
          .eq('id', companyRow.parent_company_id)
          .single();
        
        if (parent?.manual_wallet_id) {
          icetranWalletId = parent.manual_wallet_id;
        }
      }

      // Se não encontrou, buscar por company_type ou nome
      if (!icetranWalletId) {
        const { data: icetranCompanies } = await supabase
          .from('companies')
          .select('id, nome, manual_wallet_id, company_type, status')
          .or('company_type.eq.icetran,nome.ilike.%ICETRAN%')
          .eq('status', 'ativo')
          .limit(1);

        const icetran = Array.isArray(icetranCompanies) ? icetranCompanies[0] : null;
        if (icetran?.manual_wallet_id) {
          icetranWalletId = icetran.manual_wallet_id;
        }
      }

      console.log('🏦 Wallet ICETRAN:', icetranWalletId);
      console.log('🏦 Wallet DESPACHANTE:', dispatcherWalletId);

      // 4. Construir payload EXATO como no MeusServicos
      const webhookPayload = {
        wallet_icetran: icetranWalletId,
        wallet_despachante: dispatcherWalletId,
        Customer_cliente: {
          id: clienteCompleto.id,
          nome: clienteCompleto.nome,
          cpf_cnpj: clienteCompleto.cpf_cnpj,
          email: clienteCompleto.email,
          asaas_customer_id: clienteCompleto.asaas_customer_id
        },
        "Valor_cobrança": selectedServico.preco,
        "Idserviço": selectedServico.id,
        "descricaoserviço": selectedServico.nome,
        "multa_type": selectedServico.tipo_recurso,
        valoracsm: selectedServico.acsm_value || 0,
        valoricetran: selectedServico.icetran_value || 0,
        taxa: selectedServico.taxa_cobranca || 0,
        despachante: {
          company_id: user?.company_id,
          nome: company.nome,
          wallet_id: dispatcherWalletId,
          margem: selectedServico.preco - (selectedServico.acsm_value || 0) - (selectedServico.icetran_value || 0) - (selectedServico.taxa_cobranca || 0)
        }
      };

      console.log('\n📦 PAYLOAD PARA WEBHOOK N8N:');
      console.log('=====================================');
      console.log(JSON.stringify(webhookPayload, null, 2));
      console.log('=====================================\n');

      // 5. Chamar webhook n8n
      const response = await fetch(getApiUrl('/webhook/n8n/process-payment'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro na API:', errorData);
        throw new Error(errorData.error || 'Erro ao gerar cobrança');
      }

      const result = await response.json();
      console.log('✅ Resultado do webhook:', result);

      // 6. Extrair dados do pagamento (webhook retorna array)
      let paymentData = null;
      
      if (Array.isArray(result) && result.length > 0) {
        paymentData = result[0];
        console.log('✅ Dados extraídos do array (primeiro elemento)');
      } else if (result.payment) {
        paymentData = result.payment;
        console.log('✅ Dados extraídos de result.payment');
      } else if (result.data && result.data.payment) {
        paymentData = result.data.payment;
        console.log('✅ Dados extraídos de result.data.payment');
      } else if (result.id) {
        paymentData = result;
        console.log('✅ Dados extraídos diretamente do result');
      } else {
        console.error('❌ Resposta não contém dados válidos:', result);
        throw new Error('Resposta do webhook não contém dados válidos do pagamento');
      }

      console.log('📋 Dados do pagamento:', paymentData);
      console.log('  - ID:', paymentData.id);
      console.log('  - Invoice URL:', paymentData.invoiceUrl);
      console.log('  - QR Code (encodedImage):', paymentData.encodedImage ? 'PRESENTE' : 'AUSENTE');
      console.log('  - PIX Payload:', paymentData.payload ? 'PRESENTE' : 'AUSENTE');

      // 7. Criar objeto de pagamento
      const pagamentoData: Pagamento = {
        metodo: 'charge',
        status: 'pending',
        valor: selectedServico.preco,
        service_order_id: paymentData.id,
        asaas_payment_id: paymentData.id,
        asaas_invoice_url: paymentData.invoiceUrl || null,
        paid_at: null,
        // Dados do QR Code e PIX
        qr_code: paymentData.encodedImage || null,
        pix_copy_paste: paymentData.payload || null,
        encodedImage: paymentData.encodedImage || null,
        payload: paymentData.payload || null,
      };

      console.log('💳 Pagamento criado:', pagamentoData);
      console.log('  - Payment ID:', pagamentoData.asaas_payment_id);
      console.log('  - QR Code presente:', !!pagamentoData.qr_code);
      console.log('  - PIX Payload presente:', !!pagamentoData.pix_copy_paste);

      setCurrentPayment(pagamentoData);
      setShowStatusModal(true);
      toast.success('Cobrança gerada com sucesso!');
    } catch (error: any) {
      console.error('❌ Erro ao gerar cobrança:', error);
      toast.error(error.message || 'Erro ao gerar cobrança');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentMethodSelect = (method: 'prepaid' | 'charge') => {
    setPaymentMethod(method);
  };

  const handleConfirmPayment = () => {
    if (!paymentMethod) {
      toast.error('Selecione um método de pagamento');
      return;
    }

    if (paymentMethod === 'prepaid') {
      handlePrepaidPayment();
    } else {
      handleChargePayment();
    }
  };

  const handlePaymentConfirmed = () => {
    if (currentPayment && currentPayment.status === 'paid') {
      // Construir URL com parâmetros para a página de recurso
      const params = new URLSearchParams({
        serviceOrderId: currentPayment.service_order_id,
        nome: selectedCliente.nome,
        email: selectedCliente.email || '',
        telefone: selectedCliente.telefone || '',
        cpfCnpj: selectedCliente.cpf_cnpj || '',
      });

      console.log('✅ Pagamento confirmado, redirecionando para criação de recurso...');
      console.log('📋 Service Order ID:', currentPayment.service_order_id);
      
      // Redirecionar para página de criação de recurso
      navigate(`/teste-recurso-ia?${params.toString()}`);
      
      toast.success('Redirecionando para criação do recurso...');
    }
  };

  const hasSufficientBalance = prepaidBalance >= selectedServico.preco;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Pagamento
        </h2>
        <p className="text-gray-600">
          Escolha a forma de pagamento para continuar
        </p>
      </div>

      {/* Order Summary */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Resumo do Pedido</h3>
          
          <div className="space-y-3">
            {/* Cliente */}
            <div className="flex items-center justify-between py-2 border-b border-blue-200">
              <span className="text-gray-600">Cliente:</span>
              <span className="font-semibold text-gray-900">{selectedCliente.nome}</span>
            </div>

            {/* Serviço */}
            <div className="flex items-center justify-between py-2 border-b border-blue-200">
              <span className="text-gray-600">Serviço:</span>
              <span className="font-semibold text-gray-900">{selectedServico.nome}</span>
            </div>

            {/* Valor */}
            <div className="flex items-center justify-between py-3 bg-white rounded-lg px-4">
              <span className="text-lg font-semibold text-gray-900">Valor Total:</span>
              <span className="text-2xl font-bold text-green-600">
                R$ {selectedServico.preco.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="max-w-3xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Escolha o Método de Pagamento
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prepaid Payment */}
          <button
            onClick={() => handlePaymentMethodSelect('prepaid')}
            disabled={isLoadingBalance || !hasSufficientBalance || isProcessing}
            className={`
              relative p-6 rounded-xl border-2 transition-all text-left
              ${
                paymentMethod === 'prepaid'
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
              }
              ${!hasSufficientBalance || isLoadingBalance ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                ${paymentMethod === 'prepaid' ? 'bg-blue-600' : 'bg-gray-100'}
              `}>
                <Wallet className={`w-6 h-6 ${paymentMethod === 'prepaid' ? 'text-white' : 'text-gray-600'}`} />
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-lg text-gray-900 mb-1">
                  Saldo Pré-pago
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Usar saldo disponível na carteira
                </p>

                {isLoadingBalance ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Carregando saldo...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Saldo disponível:</span>
                      <span className="font-bold text-green-600">
                        R$ {prepaidBalance.toFixed(2)}
                      </span>
                    </div>
                    {!hasSufficientBalance && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Saldo insuficiente</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {paymentMethod === 'prepaid' && (
                <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
              )}
            </div>
          </button>

          {/* Charge Payment */}
          <button
            onClick={() => handlePaymentMethodSelect('charge')}
            disabled={isProcessing}
            className={`
              relative p-6 rounded-xl border-2 transition-all text-left
              ${
                paymentMethod === 'charge'
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
              }
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                ${paymentMethod === 'charge' ? 'bg-blue-600' : 'bg-gray-100'}
              `}>
                <CreditCard className={`w-6 h-6 ${paymentMethod === 'charge' ? 'text-white' : 'text-gray-600'}`} />
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-lg text-gray-900 mb-1">
                  Gerar Cobrança
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Criar cobrança via Asaas para o cliente
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <DollarSign className="w-4 h-4" />
                  <span>PIX, Boleto ou Cartão</span>
                </div>
              </div>

              {paymentMethod === 'charge' && (
                <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between max-w-3xl mx-auto pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Voltar
        </button>

        <button
          onClick={handleConfirmPayment}
          disabled={!paymentMethod || isProcessing}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processando...</span>
            </>
          ) : (
            <span>Confirmar Pagamento</span>
          )}
        </button>
      </div>

      {/* Payment Status Modal */}
      {currentPayment && (
        <PaymentStatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          pagamento={currentPayment}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
      )}
    </div>
  );
};

export default Step3Pagamento;
