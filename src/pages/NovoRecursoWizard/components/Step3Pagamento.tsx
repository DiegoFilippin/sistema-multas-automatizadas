import React, { useState, useEffect } from 'react';
import { CreditCard, Wallet, DollarSign, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Cliente, Servico, Pagamento } from '../types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import PaymentStatusModal from './PaymentStatusModal';

interface Step3PagamentoProps {
  selectedCliente: Cliente;
  selectedServico: Servico;
  pagamento: Pagamento | null;
  onPagamentoComplete: (pagamento: Pagamento) => void;
  onBack: () => void;
}

const Step3Pagamento: React.FC<Step3PagamentoProps> = ({
  selectedCliente,
  selectedServico,
  pagamento,
  onPagamentoComplete,
  onBack,
}) => {
  const { user } = useAuthStore();
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
    try {
      setIsLoadingBalance(true);

      if (!user?.company_id) {
        console.warn('Company ID não encontrado');
        setPrepaidBalance(0);
        return;
      }

      const { data, error } = await supabase
        .from('prepaid_wallets')
        .select('balance')
        .eq('company_id', user.company_id)
        .single();

      if (error) {
        console.error('Erro ao carregar saldo:', error);
        setPrepaidBalance(0);
        return;
      }

      setPrepaidBalance(data?.balance || 0);
    } catch (error) {
      console.error('Erro ao carregar saldo pré-pago:', error);
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

      // Chamar API para processar pagamento pré-pago
      const response = await fetch('/api/service-orders/prepaid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: selectedCliente.id,
          service_id: selectedServico.id,
          amount: selectedServico.preco,
          notes: 'Pagamento via saldo pré-pago',
          multa_type: selectedServico.tipo_recurso,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar pagamento');
      }

      const result = await response.json();

      // Criar objeto de pagamento
      const pagamentoData: Pagamento = {
        metodo: 'prepaid',
        status: 'paid',
        valor: selectedServico.preco,
        service_order_id: result.serviceOrder.id,
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

      // Chamar API para gerar cobrança Asaas
      const response = await fetch('/api/service-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: selectedCliente.id,
          service_id: selectedServico.id,
          amount: selectedServico.preco,
          description: `${selectedServico.nome} - ${selectedCliente.nome}`,
          multa_type: selectedServico.tipo_recurso,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar cobrança');
      }

      const result = await response.json();

      // Criar objeto de pagamento
      const pagamentoData: Pagamento = {
        metodo: 'charge',
        status: 'pending',
        valor: selectedServico.preco,
        service_order_id: result.serviceOrder.id,
        asaas_payment_id: result.payment?.id || null,
        asaas_invoice_url: result.payment?.invoiceUrl || null,
        paid_at: null,
      };

      setCurrentPayment(pagamentoData);
      setShowStatusModal(true);
      toast.success('Cobrança gerada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar cobrança:', error);
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
    if (currentPayment) {
      onPagamentoComplete(currentPayment);
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
