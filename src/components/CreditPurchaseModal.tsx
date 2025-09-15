import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  CreditCard,
  QrCode,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Percent,
  Coins
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import QRCode from 'qrcode';

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credit_amount: number;
  price: number;
  discount_percentage: number;
  target_type: 'client' | 'company';
  is_active: boolean;
}

interface PaymentData {
  paymentId: string;
  amount: number;
  creditAmount: number;
  pixQrCode: string;
  pixCopyPaste: string;
  dueDate: string;
  status: 'pending';
}

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  companyId?: string;
  targetType?: 'client' | 'company';
  onPurchaseComplete?: () => void;
}

export function CreditPurchaseModal({
  isOpen,
  onClose,
  clientId,
  companyId,
  targetType,
  onPurchaseComplete
}: CreditPurchaseModalProps) {
  const { user } = useAuthStore();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed' | 'expired'>('pending');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Determinar tipo de compra baseado no usuário ou prop
  const effectiveTargetType = targetType || (user?.role === 'despachante' ? 'company' : 'client');
  const effectiveClientId = clientId || user?.id;
  const effectiveCompanyId = companyId || user?.company_id;

  // Buscar pacotes disponíveis
  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen, effectiveTargetType]);

  const fetchPackages = async () => {
    console.log('🔍 Buscando pacotes de créditos...');
    console.log('Target Type:', effectiveTargetType);
    console.log('User:', user);
    
    try {
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      const url = `/api/credits/packages?targetType=${effectiveTargetType}`;
      console.log('Request URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        toast.error(`Erro HTTP ${response.status}: ${errorText}`);
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        console.log('Pacotes encontrados:', data.data.length);
        setPackages(data.data);
      } else {
        console.error('API returned error:', data.error);
        toast.error(data.error || 'Erro ao carregar pacotes de créditos');
      }
    } catch (error) {
      console.error('Erro ao buscar pacotes:', error);
      toast.error('Erro ao carregar pacotes de créditos');
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setLoading(true);
    try {
      // Para despachantes, sempre usar companyId como customerId
      // Para clientes, usar clientId como customerId
      const customerId = effectiveTargetType === 'client' ? effectiveClientId : effectiveCompanyId;
      
      console.log('🛒 Iniciando compra de créditos:');
      console.log('- Target Type:', effectiveTargetType);
      console.log('- Customer ID:', customerId);
      console.log('- Company ID:', effectiveCompanyId);
      console.log('- Package:', selectedPackage.name);
      
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          customerId: customerId,
          companyId: effectiveCompanyId
        })
      });

      const data = await response.json();
      if (data.success) {
        setPaymentData(data.data);
        setStep('payment');
        startPaymentStatusCheck(data.data.paymentId);
      } else {
        toast.error(data.error || 'Erro ao criar pagamento');
      }
    } catch (error) {
      console.error('Erro ao criar compra:', error);
      toast.error('Erro ao processar compra');
    } finally {
      setLoading(false);
    }
  };

  const startPaymentStatusCheck = (paymentId: string) => {
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/credits/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await response.json();
        if (data.success) {
          if (data.data.status === 'confirmed') {
            setPaymentStatus('confirmed');
            setStep('success');
            clearInterval(checkInterval);
            toast.success('Pagamento confirmado! Créditos adicionados à sua conta.');
            onPurchaseComplete?.();
          } else if (data.data.status === 'expired' || data.data.status === 'cancelled') {
            setPaymentStatus('expired');
            clearInterval(checkInterval);
            toast.error('Pagamento expirado ou cancelado.');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
      }
    }, 5000); // Verificar a cada 5 segundos

    // Limpar intervalo após 30 minutos
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 30 * 60 * 1000);
  };

  const copyPixCode = async () => {
    if (paymentData?.pixCopyPaste) {
      try {
        await navigator.clipboard.writeText(paymentData.pixCopyPaste);
        toast.success('Código PIX copiado!');
      } catch (error) {
        toast.error('Erro ao copiar código PIX');
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Gerar QR Code visual
  const generateQrCode = async (pixCode: string) => {
    try {
      const qrCodeUrl = await QRCode.toDataURL(pixCode, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrCodeUrl);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error('Erro ao gerar QR Code visual');
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

  // Gerar QR Code quando dados de pagamento estiverem disponíveis
  useEffect(() => {
    if (paymentData?.pixCopyPaste && paymentData.pixCopyPaste !== 'pix_copy_paste_test') {
      generateQrCode(paymentData.pixCopyPaste);
    } else {
      setQrCodeDataUrl('');
    }
  }, [paymentData?.pixCopyPaste]);

  const handleClose = () => {
    setStep('select');
    setSelectedPackage(null);
    setPaymentData(null);
    setPaymentStatus('pending');
    setQrCodeDataUrl('');
    onClose();
  };

  const renderPackageSelection = () => {
    // Buscar nome do cliente se estiver comprando para cliente específico
    const getTargetInfo = () => {
      if (effectiveTargetType === 'client' && clientId) {
        return {
          type: 'Cliente Específico',
          description: 'Créditos serão adicionados diretamente na conta do cliente',
          icon: '👤'
        };
      } else if (effectiveTargetType === 'company') {
        return {
          type: 'Empresa',
          description: 'Créditos serão adicionados na conta da empresa (com desconto)',
          icon: '🏢'
        };
      } else {
        return {
          type: 'Cliente',
          description: 'Créditos para sua conta pessoal',
          icon: '👤'
        };
      }
    };

    const targetInfo = getTargetInfo();

    return (
      <div className="space-y-4">
        {/* Indicador de tipo de compra */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{targetInfo.icon}</span>
            <span className="font-medium text-blue-900">Comprando para: {targetInfo.type}</span>
          </div>
          <p className="text-sm text-blue-700">{targetInfo.description}</p>
        </div>

        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">
            Escolha um pacote de créditos
          </h3>
          <p className="text-sm text-muted-foreground">
            {effectiveTargetType === 'client' 
              ? 'Pacotes para clientes com valores promocionais'
              : 'Pacotes empresariais com descontos especiais'
            }
          </p>
        </div>

      <div className="grid gap-3 max-h-96 overflow-y-auto">
        {packages.map((pkg) => (
          <Card 
            key={pkg.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedPackage?.id === pkg.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedPackage(pkg)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold">{pkg.name}</h4>
                    {pkg.discount_percentage > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Percent className="h-3 w-3 mr-1" />
                        {pkg.discount_percentage}% OFF
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {pkg.description}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">{pkg.credit_amount} créditos</span>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(pkg.price)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={handleClose} className="flex-1">
          Cancelar
        </Button>
        <Button 
          onClick={handlePurchase} 
          disabled={!selectedPackage || loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Continuar
            </>
          )}
        </Button>
      </div>
    </div>
    );
  };

  const renderPayment = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Pagamento PIX</h3>
        <p className="text-sm text-muted-foreground">
          Escaneie o QR Code ou copie o código PIX para realizar o pagamento
        </p>
      </div>

      {selectedPackage && paymentData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              {selectedPackage.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Créditos:</span>
              <span className="font-semibold">{selectedPackage.credit_amount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Valor:</span>
              <span className="font-semibold text-lg">{formatCurrency(paymentData.amount)}</span>
            </div>
            {selectedPackage.discount_percentage > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span>Desconto:</span>
                <span className="font-semibold">{selectedPackage.discount_percentage}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="space-y-4">
        <div className="text-center">
          <div className="bg-white p-4 rounded-lg border inline-block">
            {qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code PIX" 
                className="h-32 w-32 mx-auto"
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
              className="h-32 w-32 mx-auto flex-col items-center justify-center" 
              style={{ display: qrCodeDataUrl ? 'none' : 'flex' }}
            >
              {paymentData?.pixCopyPaste && paymentData.pixCopyPaste !== 'pix_copy_paste_test' ? (
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              ) : (
                <>
                  <QrCode className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500 text-center px-2">
                    {paymentData?.pixCopyPaste === 'pix_copy_paste_test' 
                      ? 'QR Code de teste não disponível' 
                      : 'QR Code indisponível'
                    }
                  </p>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {qrCodeDataUrl ? 'QR Code PIX' : 'Aguardando dados de pagamento'}
            </p>
          </div>
        </div>

        {paymentData?.pixCopyPaste && paymentData.pixCopyPaste !== 'pix_copy_paste_test' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Código PIX (Copia e Cola):</label>
            <div className="flex gap-2">
              <div className="flex-1 p-2 bg-gray-50 rounded border text-xs font-mono break-all">
                {paymentData.pixCopyPaste}
              </div>
              <Button size="sm" variant="outline" onClick={copyPixCode}>
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

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            O pagamento será confirmado automaticamente após a compensação do PIX.
            Mantenha esta janela aberta para acompanhar o status.
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={handleClose} className="flex-1">
          Fechar
        </Button>
        <Button variant="secondary" onClick={() => setStep('select')} className="flex-1">
          Voltar
        </Button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          Pagamento Confirmado!
        </h3>
        <p className="text-sm text-muted-foreground">
          Seus créditos foram adicionados à sua conta com sucesso.
        </p>
      </div>

      {selectedPackage && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-green-800">Créditos adicionados:</span>
              <span className="font-bold text-green-900">
                +{selectedPackage.credit_amount} créditos
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleClose} className="w-full">
        Concluir
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'Comprar Créditos'}
            {step === 'payment' && 'Realizar Pagamento'}
            {step === 'success' && 'Pagamento Confirmado'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Escolha um pacote de créditos para continuar'}
            {step === 'payment' && 'Complete o pagamento via PIX'}
            {step === 'success' && 'Seus créditos foram adicionados com sucesso'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && renderPackageSelection()}
        {step === 'payment' && renderPayment()}
        {step === 'success' && renderSuccess()}
      </DialogContent>
    </Dialog>
  );
}