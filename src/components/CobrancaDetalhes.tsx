import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCode from 'qrcode';
import {
  X,
  DollarSign,
  User,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Copy,
  QrCode,
  RefreshCw,
  Send,
  Banknote,
  ExternalLink,
  Download,
  FileText,
  Scale,
  Eye,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// ✅ INTERFACE UNIFICADA - Compatível com MeusServicos.tsx e CobrancasGerais.tsx
interface Cobranca {
  id: string;
  asaas_payment_id?: string;
  client_id?: string;
  client_name: string;
  amount: number;
  status: string;
  payment_method: string;
  due_date: string;
  created_at: string;
  paid_at?: string;
  description: string;
  invoice_url?: string;
  bank_slip_url?: string;
  // ✅ Múltiplas fontes de dados PIX para compatibilidade
  pix_code?: string;
  pix_qr_code?: string;
  qr_code_image?: string;
  pix_payload?: string;
  pix_copy_paste?: string;
  // ✅ Campos adicionais para compatibilidade
  company_name?: string;
  company_id?: string;
  customer_id?: string;
  customer_name?: string;
  // ✅ Campos financeiros opcionais
  discount_amount?: number;
  interest_amount?: number;
  fine_amount?: number;
  asaas_fee?: number;
  net_value?: number;
  payment_attempts?: PaymentAttempt[];
  // ✅ Dados extras do payment para fallback
  payment_data?: any;
  // ✅ Campos de webhook e processamento
  webhook_data?: any;
  webhook_response?: any;
  processed_data?: any;
}

interface PaymentAttempt {
  id: string;
  payment_method: string;
  status: string;
  attempted_at: string;
  error_message?: string;
}

interface CobrancaDetalhesProps {
  cobranca: Cobranca;
  isOpen: boolean;
  onClose: () => void;
  onResend?: (cobranca?: Cobranca) => void;
  onCancel?: (cobranca?: Cobranca) => void;
  onUpdate?: (cobranca: Cobranca) => void;
}

// Componente para ações de recurso
function RecursoActions({ cobranca }: { cobranca: Cobranca }) {
  const navigate = useNavigate();
  const [recursoStatus, setRecursoStatus] = useState<{
    canCreateRecurso: boolean;
    hasExistingRecurso: boolean;
    recurso?: any;
    loading: boolean;
    message?: string;
  }>({ canCreateRecurso: false, hasExistingRecurso: false, loading: true });

  // Verificar se pode criar recurso
  useEffect(() => {
    const checkRecursoStatus = async () => {
      if (!cobranca?.asaas_payment_id && !cobranca?.id) {
        setRecursoStatus({ canCreateRecurso: false, hasExistingRecurso: false, loading: false });
        return;
      }

      // Verificar se o pagamento está pago
      const isPaid = ['paid', 'received', 'confirmed'].includes(cobranca.status);
      if (!isPaid) {
        console.log('⚠️ Pagamento não está pago, não pode criar recurso');
        setRecursoStatus({ canCreateRecurso: false, hasExistingRecurso: false, loading: false });
        return;
      }

      try {
        const paymentId = cobranca.asaas_payment_id || cobranca.id;
        console.log('🔍 Verificando recurso para payment ID:', paymentId);
        console.log('🔍 Status do pagamento:', cobranca.status);
        
        const response = await fetch(`/api/payments/${paymentId}/recurso`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
          const responseText = await response.text();
          console.log('📄 Raw response:', responseText);
          
          // Verificar se a resposta é JSON válido
          let data;
          try {
            // Verificar se começa com HTML (erro comum no Vercel)
            if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
              console.error('❌ API retornou HTML ao invés de JSON:', responseText.substring(0, 100));
              throw new Error('API retornou HTML ao invés de JSON - possível erro de roteamento');
            }
            
            data = JSON.parse(responseText);
            console.log('✅ Recurso data received:', data);
          } catch (parseError) {
            console.error('❌ Erro ao fazer parse do JSON:', parseError);
            console.error('❌ Resposta recebida:', responseText.substring(0, 200));
            throw new Error('Resposta da API não é um JSON válido');
          }
          
          // Se não tem recurso e o pagamento está pago, pode criar
          if (!data.hasRecurso && isPaid) {
            setRecursoStatus({ 
              canCreateRecurso: true, 
              hasExistingRecurso: false, 
              loading: false 
            });
          } else if (data.hasRecurso) {
            setRecursoStatus({ 
              canCreateRecurso: false, 
              hasExistingRecurso: true, 
              recurso: data.recurso,
              loading: false 
            });
          } else {
            setRecursoStatus({ 
              canCreateRecurso: false, 
              hasExistingRecurso: false, 
              loading: false 
            });
          }
        } else {
          const errorText = await response.text();
          console.error('❌ Erro ao verificar status do recurso:', response.status, errorText);
          // Se o pagamento está pago mas a API falhou, ainda pode tentar criar recurso
          if (isPaid) {
            setRecursoStatus({ canCreateRecurso: true, hasExistingRecurso: false, loading: false });
          } else {
            setRecursoStatus({ canCreateRecurso: false, hasExistingRecurso: false, loading: false });
          }
        }
      } catch (error) {
        console.error('❌ Erro de rede ao verificar recurso:', error);
        // Se o pagamento está pago mas houve erro de rede, ainda pode tentar criar recurso
        const isPaidFallback = ['paid', 'received', 'confirmed'].includes(cobranca.status);
        if (isPaidFallback) {
          setRecursoStatus({ canCreateRecurso: true, hasExistingRecurso: false, loading: false });
        } else {
          setRecursoStatus({ canCreateRecurso: false, hasExistingRecurso: false, loading: false });
        }
      }
    };

    checkRecursoStatus();
  }, [cobranca]);

  const handleCreateRecurso = () => {
    console.log('🚀 === INICIANDO CRIAÇÃO DE RECURSO ===');
    console.log('📋 Dados completos da cobrança:', cobranca);
    
    const paymentId = cobranca.asaas_payment_id || cobranca.id;
    
    // Extrair dados do cliente da cobrança - verificar múltiplas fontes
    const clienteNome = cobranca.client_name || 
                       cobranca.customer_name || 
                       cobranca.webhook_data?.customer?.name ||
                       cobranca.webhook_response?.customer?.name ||
                       cobranca.processed_data?.customer_name ||
                       '';
                       
    const clienteId = cobranca.client_id || 
                     cobranca.customer_id || 
                     cobranca.webhook_data?.customer?.id ||
                     cobranca.webhook_response?.customer?.id ||
                     '';
                     
    const clienteCpfCnpj = cobranca.webhook_data?.customer?.cpf_cnpj ||
                          cobranca.webhook_response?.customer?.cpfCnpj ||
                          cobranca.processed_data?.customer_cpf ||
                          cobranca.payment_data?.customer?.cpfCnpj ||
                          '';
                          
    const clienteEndereco = cobranca.webhook_data?.customer?.endereco ||
                           cobranca.webhook_response?.customer?.endereco ||
                           cobranca.processed_data?.customer_endereco ||
                           cobranca.payment_data?.customer?.endereco ||
                           '';
    
    console.log('👤 Dados extraídos do cliente:');
    console.log('  - Nome:', clienteNome);
    console.log('  - ID:', clienteId);
    console.log('  - CPF/CNPJ:', clienteCpfCnpj);
    console.log('  - Endereço:', clienteEndereco);
    console.log('  - Payment ID:', paymentId);
    
    // Construir URL com parâmetros para TesteRecursoIA
    const params = new URLSearchParams();
    
    if (paymentId) params.set('serviceOrderId', paymentId);
    if (clienteId) params.set('clienteId', clienteId);
    if (clienteNome) params.set('nome', clienteNome);
    if (clienteCpfCnpj) params.set('cpfCnpj', clienteCpfCnpj);
    if (clienteEndereco) params.set('endereco', clienteEndereco);
    
    const urlFinal = `/teste-recurso-ia?${params.toString()}`;
    console.log('🔗 URL final construída:', urlFinal);
    console.log('📤 Parâmetros enviados:', Object.fromEntries(params));
    
    navigate(urlFinal);
  };

  const handleViewRecurso = () => {
    if (recursoStatus.recurso?.id) {
      navigate(`/recursos/${recursoStatus.recurso.id}`);
    }
  };

  // Não mostrar nada se ainda está carregando ou se não pode criar recurso
  if (recursoStatus.loading || (!recursoStatus.canCreateRecurso && !recursoStatus.hasExistingRecurso)) {
    return null;
  }

  return (
    <div className="px-6 pb-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 rounded-2xl p-6 border border-blue-200/50 shadow-lg">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/20 rounded-full -translate-y-12 translate-x-12"></div>
        <div className="relative">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-blue-800">Recurso de Multa</h3>
              <p className="text-sm text-blue-700/80">
                {recursoStatus.hasExistingRecurso 
                  ? 'Você já possui um recurso para esta empresa'
                  : 'Pagamento confirmado - Inicie seu recurso agora'
                }
              </p>
            </div>
          </div>

          {recursoStatus.hasExistingRecurso ? (
            <div className="space-y-4">
              {recursoStatus.recurso && (
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-blue-200/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Recurso #{recursoStatus.recurso.numero_processo || 'Em processamento'}
                      </p>
                      <p className="text-xs text-blue-600">
                        Tipo: {recursoStatus.recurso.tipo_recurso} • Status: {recursoStatus.recurso.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-600">
                        Criado em {new Date(recursoStatus.recurso.data_protocolo).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleViewRecurso}
                className="w-full flex items-center justify-center space-x-3 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Eye className="w-5 h-5" />
                <span>Ver Recurso Existente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-green-200/30">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Pagamento Confirmado</p>
                    <p className="text-xs text-green-600">Você pode iniciar o processo de recurso</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleCreateRecurso}
                className="w-full flex items-center justify-center space-x-3 p-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Scale className="w-5 h-5" />
                <span>Iniciar Recurso de Multa</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/30">
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>💡 Dica:</strong> Nosso sistema de IA analisará sua multa e gerará automaticamente 
                  os argumentos mais eficazes para seu recurso, aumentando suas chances de sucesso.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CobrancaDetalhes({ cobranca, isOpen, onClose, onResend, onCancel, onUpdate }: CobrancaDetalhesProps) {
  // ✅ TODOS OS HOOKS SEMPRE EXECUTADOS NO TOPO
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [qrCodeData, setQrCodeData] = useState<any>(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [processandoBaixa, setProcessandoBaixa] = useState(false);



  // ✅ VARIÁVEIS DERIVADAS APÓS TODOS OS HOOKS
  const isSuperadmin = user?.role === 'Superadmin';
  const actualStatus = paymentDetails?.status || cobranca?.status || 'pending';

  // ✅ VERIFICAÇÃO DE SEGURANÇA APÓS TODOS OS HOOKS
  if (!cobranca) {
    console.warn('⚠️ CobrancaDetalhes: cobranca é null/undefined');
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'pending_payment':
        return 'text-yellow-600 bg-yellow-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-6 h-6 text-white" />;
      case 'pending':
      case 'pending_payment':
        return <Clock className="w-6 h-6 text-white" />;
      case 'overdue':
        return <AlertTriangle className="w-6 h-6 text-white" />;
      case 'cancelled':
        return <XCircle className="w-6 h-6 text-white" />;
      default:
        return <Clock className="w-6 h-6 text-white" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
      case 'pending_payment':
        return 'Pendente';
      case 'overdue':
        return 'Vencido';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Pendente';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'PIX':
        return 'PIX';
      case 'CREDIT_CARD':
        return 'Cartão de Crédito';
      case 'BANK_SLIP':
        return 'Boleto Bancário';
      default:
        return method;
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado para a área de transferência!`);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('Erro ao copiar para a área de transferência');
    }
  };

  const handleResend = async () => {
    if (!onResend) return;
    setIsLoading(true);
    try {
      await onResend(cobranca);
      toast.success('Cobrança reenviada com sucesso!');
    } catch (error) {
      console.error('Erro ao reenviar:', error);
      toast.error('Erro ao reenviar cobrança');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    setIsLoading(true);
    try {
      await onCancel(cobranca);
      toast.success('Cobrança cancelada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast.error('Erro ao cancelar cobrança');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualPayment = async () => {
    if (!isSuperadmin) {
      toast.error('Apenas superadmins podem realizar baixa manual');
      return;
    }

    const confirmacao = window.confirm(
      'Tem certeza que deseja confirmar este pagamento manualmente?\n\n' +
      'Esta ação irá:\n' +
      '• Marcar o pagamento como "Recebido em Dinheiro" no Asaas\n' +
      '• Atualizar o status para "Pago" no sistema\n' +
      '• Esta ação não pode ser desfeita\n\n' +
      'Confirmar?'
    );

    if (!confirmacao) return;

    setProcessandoBaixa(true);
    try {
      const response = await fetch(`/api/payments/${cobranca.asaas_payment_id || cobranca.id}/manual-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method: 'CASH',
          notes: 'Baixa manual realizada pelo superadmin'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar baixa manual');
      }

      const result = await response.json();
      toast.success('Baixa manual realizada com sucesso!');
      
      // Atualizar os dados do pagamento
      setPaymentDetails({
        ...paymentDetails,
        status: 'paid',
        paid_at: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Erro na baixa manual:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar baixa manual');
    } finally {
      setProcessandoBaixa(false);
    }
  };

  // ✅ SEMPRE EXECUTAR - useEffect para carregar detalhes do pagamento (CORRIGIDO)
  useEffect(() => {
    const loadPaymentDetails = async () => {
      // ✅ VERIFICAÇÃO DENTRO DO useEffect, não como condição
      if (!cobranca) return;
      
      setQrCodeLoading(true);
      try {
        console.log('🔍 === DEBUG QR CODE - PROCESSANDO DADOS ===');
        console.log('  - Cobrança completa:', cobranca);
        console.log('  - Payment Method:', cobranca.payment_method);
        console.log('  - QR Code fields disponíveis:', {
          pix_qr_code: !!cobranca.pix_qr_code,
          qr_code_image: !!cobranca.qr_code_image,
          pix_code: !!cobranca.pix_code,
          pix_payload: !!cobranca.pix_payload,
          pix_copy_paste: !!cobranca.pix_copy_paste
        });
        
        // ✅ USAR DADOS DIRETAMENTE DA COBRANÇA - SEM CHAMADA API
        // Isso evita o erro 404 e usa os dados já disponíveis
        setPaymentDetails(cobranca);
        
        // ✅ LÓGICA ROBUSTA PARA QR CODE - Múltiplas fontes da própria cobrança
        const finalQrCode = cobranca.pix_qr_code || 
                           cobranca.qr_code_image || 
                           cobranca.pix_code || 
                           cobranca.pix_payload;
        
        console.log('  - QR Code final encontrado:', !!finalQrCode);
        console.log('  - Tipo do QR Code:', typeof finalQrCode);
        
        if (finalQrCode) {
          // Verificar se é base64 válido ou texto PIX
          if (finalQrCode.startsWith('data:image/')) {
            console.log('  ✅ QR Code é base64 válido');
            setQrCodeData(finalQrCode);
          } else if (finalQrCode.startsWith('iVBORw0KGgo') || (finalQrCode.length > 100 && !finalQrCode.includes(' '))) {
            console.log('  ✅ QR Code é base64 sem prefixo');
            setQrCodeData(`data:image/png;base64,${finalQrCode}`);
          } else {
            console.log('  ⚠️ QR Code é texto PIX, gerando imagem...');
            try {
              const qrCodeImage = await QRCode.toDataURL(finalQrCode, {
                width: 256,
                margin: 2,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF'
                }
              });
              setQrCodeData(qrCodeImage);
              console.log('  ✅ QR Code gerado com sucesso');
            } catch (qrError) {
              console.error('  ❌ Erro ao gerar QR Code:', qrError);
            }
          }
        } else {
          console.log('  ⚠️ Nenhum QR Code encontrado na cobrança');
        }
        
      } catch (error) {
        console.error('  ❌ Erro ao processar dados:', error);
      } finally {
        setQrCodeLoading(false);
      }
    };

    loadPaymentDetails();
  }, [cobranca]);

  // ✅ SEMPRE EXECUTAR - useEffect para debug (CORRIGIDO - sem condicionais)
  useEffect(() => {
    // Verificação DENTRO do useEffect, não como condição
    if (cobranca) {
      console.log('🔍 === DEBUG COBRANCA DETALHES ===');
      console.log('  - Cobrança:', cobranca);
      console.log('  - Payment Details:', paymentDetails);
      console.log('  - QR Code Data:', qrCodeData);
      console.log('  - Status atual:', actualStatus);
    }
  }, [cobranca, paymentDetails, qrCodeData, actualStatus]);

  // ✅ LÓGICA SIMPLIFICADA PARA MOSTRAR PIX
  const qrCodeFromCobranca = cobranca?.pix_qr_code || cobranca?.qr_code_image || cobranca?.pix_code;
  const qrCodeFromDetails = paymentDetails?.pix_qr_code || paymentDetails?.qr_code_image || paymentDetails?.encodedImage;
  const hasQrCode = !!(qrCodeData || qrCodeFromCobranca || qrCodeFromDetails);
  
  // ✅ SEMPRE MOSTRAR PIX PARA PAGAMENTOS PIX (independente do status)
  const isPixPayment = (cobranca?.payment_method === 'PIX' || !cobranca?.payment_method);
  const shouldShowPix = isPixPayment || hasQrCode;
  
  console.log('🎯 === DECISÃO DE EXIBIÇÃO PIX ===');
  console.log('  - Payment Method:', cobranca?.payment_method);
  console.log('  - Is PIX Payment:', isPixPayment);
  console.log('  - QR Code Data:', !!qrCodeData);
  console.log('  - QR Code da Cobrança:', !!qrCodeFromCobranca);
  console.log('  - QR Code dos Detalhes:', !!qrCodeFromDetails);
  console.log('  - Has QR Code:', hasQrCode);
  console.log('  - Should Show PIX:', shouldShowPix);
  console.log('  - Cobrança PIX fields:', {
    pix_qr_code: cobranca?.pix_qr_code,
    qr_code_image: cobranca?.qr_code_image,
    pix_code: cobranca?.pix_code
  });

  // ✅ VERIFICAR SE PODE CRIAR RECURSO (apenas para pagamentos confirmados)
  const isPaid = ['paid', 'received', 'confirmed'].includes(actualStatus);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                getStatusColor(actualStatus)
              )}>
                {getStatusIcon(actualStatus)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detalhes da Cobrança</h2>
                <p className="text-sm text-gray-600">
                  {cobranca.client_name || cobranca.customer_name || 'Cliente não informado'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Status Badge */}
            <div className="px-6 pt-6">
              <div className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                getStatusColor(actualStatus)
              )}>
                {getStatusLabel(actualStatus)}
              </div>
            </div>

            {/* Payment Info */}
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">Valor</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    R$ {cobranca.amount?.toFixed(2).replace('.', ',') || '0,00'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Vencimento</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {cobranca.due_date ? format(new Date(cobranca.due_date), 'dd/MM/yyyy', { locale: ptBR }) : 'Não informado'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-sm">Método</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {getPaymentMethodLabel(cobranca.payment_method || 'PIX')}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Cliente</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {cobranca.client_name || cobranca.customer_name || 'Não informado'}
                  </p>
                </div>
              </div>

              {cobranca.description && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Descrição</span>
                  </div>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {cobranca.description}
                  </p>
                </div>
              )}
            </div>

            {/* ✅ SEÇÃO PIX - SEMPRE VISÍVEL SE QR CODE EXISTIR */}
            {shouldShowPix && actualStatus !== 'paid' && (
              <div className="px-6 py-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <QrCode className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-800">Pagamento via PIX</h3>
                      <p className="text-sm text-green-600">Escaneie o QR Code ou copie o código PIX</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* QR Code Image */}
                    {qrCodeLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-green-600" />
                        <span className="ml-2 text-sm text-green-600">Carregando QR Code...</span>
                      </div>
                    ) : qrCodeData ? (
                      <div className="flex justify-center">
                        <div className="bg-white p-4 rounded-xl shadow-lg">
                          <img 
                            src={qrCodeData} 
                            alt="QR Code PIX" 
                            className="w-48 h-48 object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-8 text-gray-500">
                        <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">QR Code não disponível</p>
                      </div>
                    )}

                    {/* PIX Copy Paste */}
                    {(paymentDetails?.pix_payload || paymentDetails?.pix_copy_paste || cobranca?.pix_code) && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-green-800">Código PIX para copiar:</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={paymentDetails?.pix_payload || paymentDetails?.pix_copy_paste || cobranca?.pix_code || ''}
                            readOnly
                            className="flex-1 p-3 border border-green-300 rounded-lg bg-white text-sm font-mono"
                          />
                          <button
                            onClick={() => copyToClipboard(
                              paymentDetails?.pix_payload || paymentDetails?.pix_copy_paste || cobranca?.pix_code || '',
                              'Código PIX'
                            )}
                            className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ✅ SEÇÃO AÇÕES DE RECURSO - APENAS PARA PAGAMENTOS CONFIRMADOS */}
            {isPaid && (
              <RecursoActions cobranca={cobranca} />
            )}

            {/* Action Buttons */}
            <div className="px-6 py-4 border-t border-gray-200 space-y-3">
              {/* Superadmin Actions */}
              {isSuperadmin && actualStatus !== 'paid' && (
                <button
                  onClick={handleManualPayment}
                  disabled={processandoBaixa}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-lg font-medium transition-colors"
                >
                  {processandoBaixa ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Banknote className="w-4 h-4" />
                  )}
                  <span>{processandoBaixa ? 'Processando...' : 'Confirmar Pagamento Manual'}</span>
                </button>
              )}

              {/* Regular Actions */}
              <div className="flex space-x-3">
                {onResend && actualStatus !== 'paid' && (
                  <button
                    onClick={handleResend}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center space-x-2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Reenviar</span>
                  </button>
                )}

                {onCancel && actualStatus !== 'paid' && actualStatus !== 'cancelled' && (
                  <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center space-x-2 p-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cancelar</span>
                  </button>
                )}
              </div>

              {/* External Links - OCULTO QUANDO STATUS FOR PAID */}
              {cobranca.invoice_url && actualStatus !== 'paid' && (
                <div className="pb-2">
                  <a
                    href={cobranca.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: '#1F2937',
                      color: '#FFFFFF',
                      border: '2px solid #374151',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      textDecoration: 'none',
                      minHeight: '50px',
                      width: '100%',
                      opacity: '1',
                      visibility: 'visible',
                      position: 'relative',
                      zIndex: '1000',
                      fontWeight: '600',
                      fontSize: '16px',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#111827';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#1F2937';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <ExternalLink style={{ color: '#FFFFFF', width: '20px', height: '20px' }} />
                    <span style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '16px' }}>Ver Fatura</span>
                  </a>
                </div>
              )}
              
              {cobranca.bank_slip_url && (
                <div className="pb-2">
                  <a
                    href={cobranca.bank_slip_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: '#4B5563',
                      color: '#FFFFFF',
                      border: '2px solid #6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      textDecoration: 'none',
                      minHeight: '50px',
                      width: '100%',
                      opacity: '1',
                      visibility: 'visible',
                      fontWeight: '600',
                      fontSize: '16px',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <Download style={{ color: '#FFFFFF', width: '20px', height: '20px' }} />
                    <span style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '16px' }}>Baixar Boleto</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}