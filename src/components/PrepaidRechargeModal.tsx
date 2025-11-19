import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PiggyBank, Copy, QrCode, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api-config';

interface PrepaidRecharge {
  id: string;
  amount: number;
  status: string;
  payment_url: string | null;
  qr_code: string | null;
  pix_copy_paste: string | null;
  created_at: string;
}

interface PrepaidRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRechargeCreated?: (recharge: PrepaidRecharge) => void;
}

const SUGGESTED_AMOUNTS = [50, 100, 200, 500, 1000];

export function PrepaidRechargeModal({ isOpen, onClose, onRechargeCreated }: PrepaidRechargeModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdRecharge, setCreatedRecharge] = useState<PrepaidRecharge | null>(null);

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const getAmountToCharge = (): number => {
    if (customAmount) {
      const parsed = parseFloat(customAmount.replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    }
    return selectedAmount || 0;
  };

  const handleCreateRecharge = async () => {
    const amount = getAmountToCharge();
    
    if (!amount || amount <= 0) {
      toast.error('Selecione ou informe um valor válido para recarga.');
      return;
    }

    if (amount < 10) {
      toast.error('O valor mínimo para recarga é R$ 10,00.');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch(getApiUrl('/wallets/prepaid/create-recharge'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          amount,
          notes: `Recarga de saldo pré-pago - R$ ${amount.toFixed(2)}`
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Não foi possível criar a recarga.');
      }

      toast.success('Recarga criada! Efetue o pagamento para creditar o saldo.');
      setCreatedRecharge(data.recharge);
      
      if (onRechargeCreated) {
        onRechargeCreated(data.recharge);
      }
    } catch (error) {
      console.error('Erro ao criar recarga:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar recarga');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyPixCode = async () => {
    if (!createdRecharge?.pix_copy_paste) {
      toast.error('Código PIX não disponível');
      return;
    }

    try {
      await navigator.clipboard.writeText(createdRecharge.pix_copy_paste);
      toast.success('Código PIX copiado!');
    } catch (error) {
      toast.error('Erro ao copiar código PIX');
    }
  };

  const handleClose = () => {
    setSelectedAmount(null);
    setCustomAmount('');
    setCreatedRecharge(null);
    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        {!createdRecharge ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-emerald-600" />
                Adicionar Saldo Pré-Pago
              </DialogTitle>
              <DialogDescription>
                Selecione o valor que deseja adicionar ao seu saldo. Será gerada uma cobrança PIX para pagamento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Valores Sugeridos */}
              <div className="space-y-3">
                <Label>Valores Sugeridos</Label>
                <div className="grid grid-cols-3 gap-3">
                  {SUGGESTED_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      variant={selectedAmount === amount ? 'default' : 'outline'}
                      className={`h-16 text-lg font-semibold ${
                        selectedAmount === amount
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'hover:border-emerald-500 hover:text-emerald-700'
                      }`}
                      onClick={() => handleSelectAmount(amount)}
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Valor Customizado */}
              <div className="space-y-2">
                <Label htmlFor="custom-amount">Ou informe outro valor</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <Input
                    id="custom-amount"
                    type="number"
                    min="10"
                    step="0.01"
                    placeholder="0,00"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500">Valor mínimo: R$ 10,00</p>
              </div>

              {/* Resumo */}
              {getAmountToCharge() > 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-emerald-900">Valor da recarga:</span>
                    <span className="text-2xl font-bold text-emerald-700">
                      {formatCurrency(getAmountToCharge())}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-600 mt-2">
                    Este valor será creditado em seu saldo após a confirmação do pagamento PIX.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateRecharge}
                disabled={isCreating || getAmountToCharge() < 10}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Gerando cobrança...
                  </>
                ) : (
                  <>
                    <PiggyBank className="h-4 w-4 mr-2" />
                    Gerar Cobrança PIX
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Cobrança Gerada com Sucesso!
              </DialogTitle>
              <DialogDescription>
                Efetue o pagamento via PIX para creditar {formatCurrency(createdRecharge.amount)} em seu saldo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* QR Code */}
              {createdRecharge.qr_code && (
                <div className="flex flex-col items-center space-y-3 p-4 bg-gray-50 rounded-lg">
                  <Label className="text-sm font-medium">Escaneie o QR Code</Label>
                  <div className="bg-white p-3 rounded-lg border-2 border-gray-200">
                    <img
                      src={`data:image/png;base64,${createdRecharge.qr_code}`}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}

              {/* Código PIX Copia e Cola */}
              {createdRecharge.pix_copy_paste && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ou copie o código PIX</Label>
                  <div className="flex gap-2">
                    <Input
                      value={createdRecharge.pix_copy_paste}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyPixCode}
                      title="Copiar código PIX"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Informações */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 space-y-1">
                    <p className="font-medium">Importante:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>O saldo será creditado automaticamente após a confirmação do pagamento</li>
                      <li>O pagamento pode levar alguns minutos para ser processado</li>
                      <li>Você receberá uma notificação quando o saldo for creditado</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Badge de Status */}
              <div className="flex justify-center">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Aguardando Pagamento
                </Badge>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-col gap-2">
              <Button 
                onClick={handleClose} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-lg"
                size="lg"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Entendi, Fechar
              </Button>
              <p className="text-xs text-center text-gray-500">
                Você pode acompanhar o status da recarga na aba "Histórico de Recargas"
              </p>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
