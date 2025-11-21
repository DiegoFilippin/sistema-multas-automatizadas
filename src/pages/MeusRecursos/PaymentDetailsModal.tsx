import React, { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, CheckCircle, Clock, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recursoId: string;
  paymentData: {
    asaas_payment_id?: string;
    asaas_invoice_url?: string;
    qr_code?: string;
    pix_copy_paste?: string;
    amount?: number;
    status?: string;
    created_at?: string;
  };
}

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  isOpen,
  onClose,
  recursoId,
  paymentData
}) => {
  const [paymentStatus, setPaymentStatus] = useState(paymentData.status || 'pending');
  const [isPolling, setIsPolling] = useState(true);

  // Polling para verificar status do pagamento
  useEffect(() => {
    if (!isOpen || paymentStatus === 'paid') {
      setIsPolling(false);
      return;
    }

    const interval = setInterval(async () => {
      try {
        // TODO: Implementar verificação de status via API
        // const response = await fetch(`/api/payments/${paymentData.asaas_payment_id}/status`);
        // const data = await response.json();
        // if (data.status === 'paid') {
        //   setPaymentStatus('paid');
        //   toast.success('Pagamento confirmado!');
        // }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 5000); // Verifica a cada 5 segundos

    return () => clearInterval(interval);
  }, [isOpen, paymentStatus, paymentData.asaas_payment_id]);

  const handleCopyPix = () => {
    if (paymentData.pix_copy_paste) {
      navigator.clipboard.writeText(paymentData.pix_copy_paste);
      toast.success('Código PIX copiado!');
    }
  };

  const handleOpenInvoice = () => {
    if (paymentData.asaas_invoice_url) {
      window.open(paymentData.asaas_invoice_url, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Detalhes do Pagamento</h2>
            <p className="text-sm text-gray-600 mt-1">
              Recurso #{recursoId.slice(0, 8)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
            <div className="flex items-center gap-3">
              {paymentStatus === 'paid' ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <Clock className="w-8 h-8 text-yellow-600 animate-pulse" />
              )}
              <div>
                <p className="font-semibold text-gray-900">
                  {paymentStatus === 'paid' ? 'Pagamento Confirmado' : 'Aguardando Pagamento'}
                </p>
                <p className="text-sm text-gray-600">
                  {paymentStatus === 'paid' 
                    ? 'Você já pode preencher os dados do recurso'
                    : 'Realize o pagamento para continuar'
                  }
                </p>
              </div>
            </div>
            {paymentStatus !== 'paid' && isPolling && (
              <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
            )}
          </div>

          {/* Valor */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Valor Total</p>
            <p className="text-4xl font-bold text-blue-600">
              R$ {(paymentData.amount || 0).toFixed(2)}
            </p>
          </div>

          {/* QR Code PIX */}
          {paymentData.qr_code && paymentStatus !== 'paid' && (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Pagar com PIX</h3>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <img 
                    src={`data:image/png;base64,${paymentData.qr_code}`}
                    alt="QR Code PIX"
                    className="w-64 h-64"
                  />
                </div>
                
                {paymentData.pix_copy_paste && (
                  <button
                    onClick={handleCopyPix}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    <Copy className="w-5 h-5" />
                    <span>Copiar Código PIX</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Link do Boleto */}
          {paymentData.asaas_invoice_url && paymentStatus !== 'paid' && (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ExternalLink className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Boleto Bancário</h3>
              </div>
              
              <button
                onClick={handleOpenInvoice}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <ExternalLink className="w-5 h-5" />
                <span>Abrir Boleto</span>
              </button>
            </div>
          )}

          {/* Informações Adicionais */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ID do Pagamento</span>
              <span className="font-mono text-gray-900">
                {paymentData.asaas_payment_id?.slice(0, 16)}...
              </span>
            </div>
            {paymentData.created_at && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Criado</span>
                <span className="text-gray-900">
                  {formatDistanceToNow(new Date(paymentData.created_at), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Fechar
            </button>
            {paymentStatus === 'paid' && (
              <button
                onClick={() => {
                  onClose();
                  // TODO: Navegar para preenchimento do recurso
                  window.location.href = `/recursos/${recursoId}/preencher`;
                }}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Preencher Recurso
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsModal;
