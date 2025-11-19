import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, CreditCard, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

interface PaymentMethodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: 'prepaid' | 'asaas') => void;
  prepaidBalance: number;
  serviceCost: number;
  serviceAmount: number;
  serviceName: string;
  hasSufficientBalance: boolean;
}

export function PaymentMethodSelector({
  isOpen,
  onClose,
  onSelectMethod,
  prepaidBalance,
  serviceCost,
  serviceAmount,
  serviceName,
  hasSufficientBalance
}: PaymentMethodSelectorProps) {
  const projectedBalance = prepaidBalance - serviceCost;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleSelectPrepaid = () => {
    if (!hasSufficientBalance) {
      return;
    }
    onSelectMethod('prepaid');
  };

  const handleSelectAsaas = () => {
    onSelectMethod('asaas');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Escolha a Forma de Pagamento</DialogTitle>
          <DialogDescription>
            Selecione como deseja processar o pagamento deste serviço
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações do Serviço */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Detalhes do Serviço</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Serviço:</span>
                <span className="font-medium">{serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor da cobrança:</span>
                <span className="font-medium">{formatCurrency(serviceAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Custo do serviço:</span>
                <span className="font-medium text-red-600">{formatCurrency(serviceCost)}</span>
              </div>
            </div>
          </div>

          {/* Opção 1: Saldo Pré-Pago */}
          <button
            onClick={handleSelectPrepaid}
            disabled={!hasSufficientBalance}
            className={`w-full p-6 rounded-lg border-2 transition-all text-left ${
              hasSufficientBalance
                ? 'border-emerald-500 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-600 cursor-pointer'
                : 'border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                hasSufficientBalance ? 'bg-emerald-100' : 'bg-gray-200'
              }`}>
                <Wallet className={`h-6 w-6 ${
                  hasSufficientBalance ? 'text-emerald-600' : 'text-gray-500'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">Usar Saldo Pré-Pago</h3>
                  {hasSufficientBalance && (
                    <Badge className="bg-emerald-600">Recomendado</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Debitar o custo do serviço do seu saldo pré-pago. O serviço será marcado como pago automaticamente.
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-white rounded">
                    <span className="text-gray-600">Saldo atual:</span>
                    <span className="font-semibold">{formatCurrency(prepaidBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded">
                    <span className="text-gray-600">Custo do serviço:</span>
                    <span className="font-semibold text-red-600">- {formatCurrency(serviceCost)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-emerald-100 rounded border border-emerald-300">
                    <span className="text-gray-700 font-medium">Saldo após débito:</span>
                    <span className={`font-bold ${
                      projectedBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {formatCurrency(projectedBalance)}
                    </span>
                  </div>
                </div>

                {!hasSufficientBalance && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">
                      Saldo insuficiente. Adicione pelo menos {formatCurrency(serviceCost - prepaidBalance)} para usar esta opção.
                    </p>
                  </div>
                )}

                {hasSufficientBalance && (
                  <div className="mt-3 flex items-center gap-2 text-emerald-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Processamento instantâneo</span>
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* Opção 2: Gerar Cobrança para Cliente */}
          <button
            onClick={handleSelectAsaas}
            className="w-full p-6 rounded-lg border-2 border-blue-500 bg-blue-50 hover:bg-blue-100 hover:border-blue-600 transition-all text-left cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Gerar Cobrança para Cliente</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Criar uma cobrança PIX que será enviada ao cliente. O pagamento será processado via Asaas.
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-blue-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Cliente recebe QR Code PIX</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Pagamento confirmado automaticamente</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Splits distribuídos conforme configuração</span>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-300">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">Valor da cobrança:</span>
                    <span className="text-lg font-bold text-blue-700">{formatCurrency(serviceAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
