import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  RefreshCw,
  QrCode,
  CreditCard,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Pagamento } from '../types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface Step4AguardandoPagamentoProps {
  pagamento: Pagamento;
  draftId: string;
  clienteNome: string;
  servicoNome: string;
  onPaymentConfirmed: () => void;
}

const Step4AguardandoPagamento: React.FC<Step4AguardandoPagamentoProps> = ({
  pagamento,
  draftId,
  clienteNome,
  servicoNome,
  onPaymentConfirmed,
}) => {
  const navigate = useNavigate();
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>(pagamento.status);
  const [copied, setCopied] = useState(false);

  // Verificar status do pagamento periodicamente
  const checkPaymentStatus = useCallback(async () => {
    if (!draftId) return;
    
    try {
      setIsCheckingPayment(true);
      
      const { data: serviceOrder, error } = await supabase
        .from('service_orders')
        .select('status, paid_at')
        .eq('id', draftId)
        .single();
      
      if (error) {
        console.error('Erro ao verificar status:', error);
        return;
      }
      
      console.log('📊 Status do pagamento:', serviceOrder);
      
      // Verificar se foi pago (status em_preenchimento ou paid_at preenchido)
      if (serviceOrder.status === 'em_preenchimento' || serviceOrder.paid_at) {
        setPaymentStatus('paid');
        toast.success('Pagamento confirmado! Redirecionando...');
        
        // Aguardar um pouco e redirecionar
        setTimeout(() => {
          onPaymentConfirmed();
        }, 1500);
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
    } finally {
      setIsCheckingPayment(false);
    }
  }, [draftId, onPaymentConfirmed]);

  // Verificar status a cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (paymentStatus !== 'paid') {
        checkPaymentStatus();
      }
    }, 10000);

    // Verificar imediatamente ao montar
    checkPaymentStatus();

    return () => clearInterval(interval);
  }, [checkPaymentStatus, paymentStatus]);

  const handleCopyPixCode = async () => {
    const pixCode = pagamento.pix_copy_paste || pagamento.payload;
    if (pixCode) {
      try {
        await navigator.clipboard.writeText(pixCode);
        setCopied(true);
        toast.success('Código PIX copiado!');
        setTimeout(() => setCopied(false), 3000);
      } catch (error) {
        toast.error('Erro ao copiar código');
      }
    }
  };

  const handleOpenInvoice = () => {
    if (pagamento.asaas_invoice_url) {
      window.open(pagamento.asaas_invoice_url, '_blank');
    }
  };

  const getQrCodeImage = () => {
    if (pagamento.encodedImage) {
      return `data:image/png;base64,${pagamento.encodedImage}`;
    }
    if (pagamento.qr_code) {
      // Se for uma URL, usar diretamente
      if (pagamento.qr_code.startsWith('http')) {
        return pagamento.qr_code;
      }
      // Se for base64, adicionar prefixo
      return `data:image/png;base64,${pagamento.qr_code}`;
    }
    return null;
  };

  const qrCodeImage = getQrCodeImage();
  const pixCode = pagamento.pix_copy_paste || pagamento.payload;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
          paymentStatus === 'paid' 
            ? 'bg-green-100' 
            : 'bg-amber-100'
        }`}>
          {paymentStatus === 'paid' ? (
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          ) : (
            <Clock className="w-8 h-8 text-amber-600" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {paymentStatus === 'paid' 
            ? 'Pagamento Confirmado!' 
            : 'Aguardando Pagamento'
          }
        </h2>
        <p className="text-gray-600">
          {paymentStatus === 'paid'
            ? 'Seu pagamento foi confirmado. Você será redirecionado em instantes.'
            : 'Realize o pagamento para continuar com o preenchimento do recurso'
          }
        </p>
      </div>

      {/* Resumo do Pedido */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Resumo do Pedido</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Cliente:</span>
            <span className="font-medium text-gray-900">{clienteNome}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Serviço:</span>
            <span className="font-medium text-gray-900">{servicoNome}</span>
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-200">
            <span className="text-lg font-semibold text-gray-900">Valor Total:</span>
            <span className="text-lg font-bold text-green-600">
              R$ {pagamento.valor.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Status do Pagamento */}
      {paymentStatus !== 'paid' && (
        <>
          {/* QR Code PIX */}
          {qrCodeImage && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Pague com PIX</h3>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                  <img 
                    src={qrCodeImage} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 object-contain"
                  />
                </div>
                
                {pixCode && (
                  <div className="w-full">
                    <p className="text-sm text-gray-600 mb-2 text-center">
                      Ou copie o código PIX:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pixCode}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate"
                      />
                      <button
                        onClick={handleCopyPixCode}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                          copied 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Link para Fatura */}
          {pagamento.asaas_invoice_url && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Outras formas de pagamento</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Acesse a fatura para pagar com boleto ou cartão de crédito.
              </p>
              
              <button
                onClick={handleOpenInvoice}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Fatura Completa
              </button>
            </div>
          )}

          {/* Verificar Status */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={checkPaymentStatus}
              disabled={isCheckingPayment}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isCheckingPayment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Verificar Pagamento
            </button>
          </div>

          {/* Aviso */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 font-medium">
                Aguardando confirmação do pagamento
              </p>
              <p className="text-sm text-amber-700 mt-1">
                O status será atualizado automaticamente assim que o pagamento for confirmado.
                Você também pode verificar manualmente clicando no botão acima.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Pagamento Confirmado */}
      {paymentStatus === 'paid' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Pagamento Confirmado!
          </h3>
          <p className="text-green-700">
            Redirecionando para o preenchimento do recurso...
          </p>
          <Loader2 className="w-6 h-6 text-green-600 mx-auto mt-4 animate-spin" />
        </div>
      )}

      {/* Nota: Não há botão voltar pois a cobrança já foi gerada */}
    </div>
  );
};

export default Step4AguardandoPagamento;
