import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { Pagamento } from '../types';
import { toast } from 'sonner';

interface PaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  pagamento: Pagamento;
  onPaymentConfirmed?: () => void;
}

const PaymentStatusModal: React.FC<PaymentStatusModalProps> = ({
  isOpen,
  onClose,
  pagamento,
  onPaymentConfirmed,
}) => {
  const [paymentStatus, setPaymentStatus] = useState(pagamento.status);
  const [qrCodeData, setQrCodeData] = useState<string | null>(
    pagamento.qr_code || pagamento.encodedImage || null
  );
  const [pixPayload, setPixPayload] = useState<string | null>(
    pagamento.pix_copy_paste || pagamento.payload || null
  );
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);

  // Log dos dados recebidos
  useEffect(() => {
    console.log('📋 PaymentStatusModal - Dados recebidos:');
    console.log('  - Payment ID:', pagamento.asaas_payment_id);
    console.log('  - QR Code presente:', !!qrCodeData);
    console.log('  - PIX Payload presente:', !!pixPayload);
    console.log('  - Invoice URL:', pagamento.asaas_invoice_url);
  }, [pagamento]);

  // Polling automático para verificar status do pagamento
  useEffect(() => {
    if (!isOpen || pagamento.metodo !== 'charge' || paymentStatus !== 'pending') {
      return;
    }

    // Polling a cada 5 segundos
    const pollingInterval = setInterval(() => {
      checkPaymentStatus();
      setPollingCount(prev => prev + 1);
    }, 5000);

    // Limpar intervalo após 5 minutos (60 tentativas)
    const timeout = setTimeout(() => {
      clearInterval(pollingInterval);
      console.log('Polling timeout: 5 minutos excedidos');
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(pollingInterval);
      clearTimeout(timeout);
    };
  }, [isOpen, pagamento.metodo, paymentStatus]);

  const checkPaymentStatus = async () => {
    try {
      if (!pagamento.asaas_payment_id) return;

      const response = await fetch(`/api/payments/${pagamento.asaas_payment_id}/status`);
      
      if (!response.ok) {
        console.error('Erro ao verificar status do pagamento');
        return;
      }

      const data = await response.json();
      
      if (data.status && data.status !== paymentStatus) {
        console.log(`Status atualizado: ${paymentStatus} -> ${data.status}`);
        setPaymentStatus(data.status);
        
        if (data.status === 'paid') {
          toast.success('Pagamento confirmado!');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const loadQRCode = async () => {
    try {
      setIsLoadingQR(true);

      const response = await fetch(`/api/payments/${pagamento.asaas_payment_id}/qrcode`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar QR Code');
      }

      const data = await response.json();
      setQrCodeData(data.qrCode);
    } catch (error) {
      console.error('Erro ao carregar QR Code:', error);
    } finally {
      setIsLoadingQR(false);
    }
  };

  const handleCopyPixCode = () => {
    if (pixPayload) {
      navigator.clipboard.writeText(pixPayload);
      toast.success('Código PIX copiado para a área de transferência!');
    } else {
      toast.error('Código PIX não disponível');
    }
  };

  const handleOpenInvoice = () => {
    if (pagamento.asaas_invoice_url) {
      window.open(pagamento.asaas_invoice_url, '_blank');
    }
  };

  const getStatusConfig = () => {
    switch (paymentStatus) {
      case 'paid':
        return {
          icon: <CheckCircle2 className="w-16 h-16 text-green-500" />,
          title: 'Pagamento Confirmado!',
          description: 'O pagamento foi processado com sucesso.',
          color: 'green',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'pending':
        return {
          icon: <Clock className="w-16 h-16 text-yellow-500" />,
          title: 'Aguardando Pagamento',
          description: 'Escaneie o QR Code ou acesse o link para pagar.',
          color: 'yellow',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
      case 'failed':
        return {
          icon: <AlertCircle className="w-16 h-16 text-red-500" />,
          title: 'Pagamento Falhou',
          description: 'Houve um problema ao processar o pagamento.',
          color: 'red',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      default:
        return {
          icon: <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />,
          title: 'Processando...',
          description: 'Aguarde enquanto processamos o pagamento.',
          color: 'blue',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        };
    }
  };

  const statusConfig = getStatusConfig();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Status do Pagamento</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Icon & Message */}
          <div className={`${statusConfig.bgColor} ${statusConfig.borderColor} border-2 rounded-xl p-8 text-center`}>
            <div className="flex justify-center mb-4">
              {statusConfig.icon}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {statusConfig.title}
            </h3>
            <p className="text-gray-600">
              {statusConfig.description}
            </p>
            
            {/* Polling Indicator */}
            {pagamento.metodo === 'charge' && paymentStatus === 'pending' && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Verificando pagamento automaticamente...</span>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-3">
            <h4 className="font-semibold text-gray-900 mb-3">Detalhes do Pagamento</h4>
            
            {/* Payment ID */}
            {pagamento.asaas_payment_id && (
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Payment ID:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">
                    {pagamento.asaas_payment_id}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pagamento.asaas_payment_id || '');
                      toast.success('Payment ID copiado!');
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Copiar Payment ID"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Método:</span>
              <span className="font-semibold text-gray-900">
                {pagamento.metodo === 'prepaid' ? 'Saldo Pré-pago' : 'Cobrança Asaas'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Valor:</span>
              <span className="font-bold text-green-600 text-lg">
                R$ {pagamento.valor.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Status:</span>
              <span className={`
                px-3 py-1 rounded-full text-sm font-medium
                ${paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : ''}
                ${paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                ${paymentStatus === 'failed' ? 'bg-red-100 text-red-700' : ''}
              `}>
                {paymentStatus === 'paid' ? 'Pago' : ''}
                {paymentStatus === 'pending' ? 'Pendente' : ''}
                {paymentStatus === 'failed' ? 'Falhou' : ''}
              </span>
            </div>
          </div>

          {/* QR Code Section (for charge payments) */}
          {pagamento.metodo === 'charge' && paymentStatus === 'pending' && (
            <div className="space-y-4">
              {/* QR Code */}
              {isLoadingQR ? (
                <div className="flex items-center justify-center py-12 bg-gray-50 rounded-xl">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <span className="ml-3 text-gray-600">Carregando QR Code...</span>
                </div>
              ) : qrCodeData ? (
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 text-center">
                    Pague com PIX
                  </h4>
                  
                  {/* QR Code Image */}
                  <div className="flex justify-center mb-4">
                    <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                      <img 
                        src={`data:image/png;base64,${qrCodeData}`}
                        alt="QR Code PIX"
                        className="w-48 h-48"
                      />
                    </div>
                  </div>

                  {/* Copy PIX Code Button */}
                  <button
                    onClick={handleCopyPixCode}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Copy className="w-5 h-5" />
                    <span>Copiar Código PIX</span>
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-3">
                    Escaneie o QR Code ou copie o código para pagar via PIX
                  </p>
                </div>
              ) : null}

              {/* Invoice Link */}
              {pagamento.asaas_invoice_url && (
                <button
                  onClick={handleOpenInvoice}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md font-medium"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>Ver Fatura Completa</span>
                </button>
              )}
            </div>
          )}

          {/* Success Message for Prepaid */}
          {pagamento.metodo === 'prepaid' && paymentStatus === 'paid' && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-green-800 font-medium">
                O valor foi debitado do seu saldo pré-pago com sucesso!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          {paymentStatus === 'pending' && (
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Fechar
            </button>
          )}
          
          {paymentStatus === 'paid' && (
            <button
              onClick={() => {
                onPaymentConfirmed?.();
                onClose();
              }}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-md"
            >
              Continuar
            </button>
          )}

          {paymentStatus === 'failed' && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Tentar Novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentStatusModal;
