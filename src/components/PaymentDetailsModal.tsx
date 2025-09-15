import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  QrCode,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Download,
  RefreshCw,
  CreditCard,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PaymentDetails {
  id: string;
  asaas_payment_id: string;
  amount: number;
  credit_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  pix_qr_code?: string;
  pix_copy_paste?: string;
  due_date: string;
  created_at: string;
  confirmed_at?: string;
  description?: string;
}

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId: string;
}

export function PaymentDetailsModal({ isOpen, onClose, paymentId }: PaymentDetailsModalProps) {
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchPaymentDetails = async (showRefreshIndicator = false) => {
    if (!paymentId) return;

    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/credits/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentDetails(data.data);
        
        // Processar QR Code
        if (data.data?.pix_qr_code) {
          const validQRCode = formatQRCode(data.data.pix_qr_code);
          if (validQRCode) {
            setQrCodeDataUrl(validQRCode);
            console.log('✅ QR Code válido carregado');
          } else {
            console.log('⚠️ QR Code inválido, gerando a partir do PIX copy/paste');
            // Fallback: gerar QR Code a partir do pix_copy_paste
            if (data.data?.pix_copy_paste && data.data.pix_copy_paste !== 'pix_copy_paste_test') {
              generateQrCode(data.data.pix_copy_paste);
            } else {
              setQrCodeDataUrl('');
            }
          }
        } else if (data.data?.pix_copy_paste && data.data.pix_copy_paste !== 'pix_copy_paste_test') {
          // Gerar QR Code se houver código PIX válido
          generateQrCode(data.data.pix_copy_paste);
        } else {
          setQrCodeDataUrl('');
        }
      } else {
        toast.error('Erro ao carregar detalhes do pagamento');
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do pagamento:', error);
      toast.error('Erro ao carregar detalhes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Função para validar se é um base64 válido
  const isValidBase64Image = (str: string): boolean => {
    if (!str) return false;
    
    // Verificar se começa com data:image/
    if (str.startsWith('data:image/')) {
      return true;
    }
    
    // Verificar se é um base64 válido (sem prefixo)
    try {
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      return base64Regex.test(str) && str.length > 10;
    } catch {
      return false;
    }
  };

  // Função para formatar QR code corretamente
  const formatQRCode = (qrCode: string): string | null => {
    if (!qrCode) return null;
    
    // Se já tem o prefixo data:image/, validar se não é um valor de teste
    if (qrCode.startsWith('data:image/')) {
      return qrCode;
    }
    
    // Se é um valor de teste inválido, retornar null
    if (qrCode === 'qr_code_test' || qrCode.includes('test')) {
      console.warn('⚠️ QR Code de teste detectado:', qrCode);
      return null;
    }
    
    // Se é um base64 válido, adicionar prefixo
    if (isValidBase64Image(qrCode)) {
      return `data:image/png;base64,${qrCode}`;
    }
    
    // Se não é válido, retornar null
    console.warn('⚠️ QR Code inválido:', qrCode);
    return null;
  };

  const generateQrCode = async (pixCode: string) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(pixCode, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      setQrCodeDataUrl('');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado para a área de transferência`);
    } catch (error) {
      toast.error('Erro ao copiar para a área de transferência');
    }
  };

  const handleRefresh = () => {
    fetchPaymentDetails(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Pendente';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  useEffect(() => {
    if (isOpen && paymentId) {
      fetchPaymentDetails();
    }
  }, [isOpen, paymentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Detalhes da Cobrança
              </h2>
              <p className="text-sm text-gray-500">
                Informações do pagamento PIX
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : paymentDetails ? (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={cn('flex items-center gap-1', getStatusColor(paymentDetails.status))}>
                    {getStatusIcon(paymentDetails.status)}
                    {getStatusLabel(paymentDetails.status)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(paymentDetails.amount)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {paymentDetails.credit_amount} créditos
                  </p>
                </div>
              </div>

              {/* Informações Gerais */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Informações do Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Data de Criação</p>
                      <p className="text-sm text-gray-900">{formatDate(paymentDetails.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Vencimento</p>
                      <p className="text-sm text-gray-900">{formatDate(paymentDetails.due_date)}</p>
                    </div>
                    {paymentDetails.confirmed_at && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-500">Data de Confirmação</p>
                        <p className="text-sm text-gray-900">{formatDate(paymentDetails.confirmed_at)}</p>
                      </div>
                    )}
                  </div>
                  {paymentDetails.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Descrição</p>
                      <p className="text-sm text-gray-900">{paymentDetails.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* QR Code PIX - apenas para pagamentos pendentes */}
              {paymentDetails.status === 'pending' && paymentDetails.pix_copy_paste && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      Pagamento PIX
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="bg-white p-4 rounded-lg border inline-block">
                        {qrCodeDataUrl ? (
                          <img 
                            src={qrCodeDataUrl} 
                            alt="QR Code PIX" 
                            className="h-48 w-48 mx-auto"
                            onError={(e) => {
                              console.error('❌ Erro ao carregar QR Code:', qrCodeDataUrl);
                              e.currentTarget.style.display = 'none';
                              // Mostrar fallback
                              const fallbackDiv = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallbackDiv) {
                                fallbackDiv.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div 
                          className="h-48 w-48 mx-auto flex-col items-center justify-center bg-gray-50 rounded-lg" 
                          style={{ display: qrCodeDataUrl ? 'none' : 'flex' }}
                        >
                          <QrCode className="h-16 w-16 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500 text-center px-4">
                            {paymentDetails.pix_qr_code === 'qr_code_test' || paymentDetails.pix_copy_paste === 'pix_copy_paste_test' 
                              ? 'QR Code de teste não disponível' 
                              : 'QR Code indisponível'
                            }
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        {qrCodeDataUrl ? 'Escaneie o QR Code com seu app de banco' : 'Use o código PIX abaixo para pagamento'}
                      </p>
                    </div>

                    {paymentDetails.pix_copy_paste && paymentDetails.pix_copy_paste !== 'pix_copy_paste_test' ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                          Copie o código PIX:
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 p-3 bg-gray-50 rounded-lg border">
                            <p className="text-xs font-mono text-gray-600 break-all">
                              {paymentDetails.pix_copy_paste}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(paymentDetails.pix_copy_paste!, 'Código PIX')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Código PIX não disponível</strong><br />
                          Este é um pagamento de teste. Em produção, o código PIX seria gerado automaticamente.
                        </p>
                      </div>
                    )}

                    {paymentDetails.pix_copy_paste && paymentDetails.pix_copy_paste !== 'pix_copy_paste_test' ? (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Importante:</strong> O pagamento será confirmado automaticamente após a compensação do PIX.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Pagamento de Teste:</strong> Este é um pagamento fictício para demonstração do sistema.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Comprovante - para pagamentos confirmados */}
              {paymentDetails.status === 'confirmed' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Pagamento Confirmado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Pagamento realizado com sucesso!</strong><br />
                        Os créditos foram adicionados à sua conta.
                      </p>
                      {paymentDetails.confirmed_at && (
                        <p className="text-xs text-green-700 mt-2">
                          Confirmado em: {formatDate(paymentDetails.confirmed_at)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Erro ao carregar detalhes
              </h3>
              <p className="text-gray-500 mb-4">
                Não foi possível carregar os detalhes do pagamento.
              </p>
              <Button onClick={() => fetchPaymentDetails()}>
                Tentar Novamente
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}