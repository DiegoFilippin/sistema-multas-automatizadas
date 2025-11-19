import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, CheckCircle, XCircle, Eye, Copy, QrCode as QrCodeIcon } from 'lucide-react';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api-config';

interface PrepaidRecharge {
  id: string;
  company_id: string;
  amount: number;
  asaas_payment_id: string | null;
  asaas_customer_id: string | null;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  payment_url: string | null;
  qr_code: string | null;
  pix_copy_paste: string | null;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  expires_at: string | null;
}

interface PrepaidRechargesHistoryProps {
  limit?: number;
}

export function PrepaidRechargesHistory({ limit = 10 }: PrepaidRechargesHistoryProps) {
  const [recharges, setRecharges] = useState<PrepaidRecharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecharge, setSelectedRecharge] = useState<PrepaidRecharge | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadRecharges();
  }, [limit]);

  const loadRecharges = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl(`/wallets/prepaid/recharges?limit=${limit}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar histórico de recargas');
      }

      const data = await response.json();
      setRecharges(data.recharges || []);
    } catch (error) {
      console.error('Erro ao carregar recargas:', error);
      toast.error('Não foi possível carregar o histórico de recargas');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(dateString));
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      paid: { label: 'Pago', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
      expired: { label: 'Expirado', className: 'bg-gray-100 text-gray-800' },
    };

    const variant = variants[status as keyof typeof variants] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const handleCopyPixCode = async (pixCode: string) => {
    try {
      await navigator.clipboard.writeText(pixCode);
      toast.success('Código PIX copiado!');
    } catch (error) {
      toast.error('Erro ao copiar código PIX');
    }
  };

  const handleViewDetails = (recharge: PrepaidRecharge) => {
    setSelectedRecharge(recharge);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Recargas</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (recharges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Recargas</CardTitle>
          <CardDescription>Nenhuma recarga encontrada</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Você ainda não fez nenhuma recarga de saldo pré-pago.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Recargas</CardTitle>
          <CardDescription>Últimas {recharges.length} recargas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recharges.map((recharge) => (
              <div
                key={recharge.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0">
                    {recharge.status === 'paid' ? (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : recharge.status === 'pending' ? (
                      <Clock className="h-8 w-8 text-yellow-600" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">{formatCurrency(recharge.amount)}</span>
                      {getStatusBadge(recharge.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Criado em {formatDate(recharge.created_at)}
                    </p>
                    {recharge.paid_at && (
                      <p className="text-xs text-green-600">
                        Pago em {formatDate(recharge.paid_at)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {recharge.status === 'pending' && recharge.pix_copy_paste && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyPixCode(recharge.pix_copy_paste!)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar PIX
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(recharge)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      {selectedRecharge && (
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Detalhes da Recarga</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Informações Gerais */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Valor:</span>
                  <span className="font-semibold">{formatCurrency(selectedRecharge.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  {getStatusBadge(selectedRecharge.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Criado em:</span>
                  <span className="text-sm">{formatDate(selectedRecharge.created_at)}</span>
                </div>
                {selectedRecharge.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pago em:</span>
                    <span className="text-sm text-green-600">{formatDate(selectedRecharge.paid_at)}</span>
                  </div>
                )}
              </div>

              {/* QR Code e PIX */}
              {selectedRecharge.status === 'pending' && (
                <>
                  {selectedRecharge.qr_code && (
                    <div className="flex flex-col items-center space-y-3 p-4 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">QR Code PIX</span>
                      <div className="bg-white p-3 rounded-lg border-2 border-gray-200">
                        <img
                          src={`data:image/png;base64,${selectedRecharge.qr_code}`}
                          alt="QR Code PIX"
                          className="w-48 h-48"
                        />
                      </div>
                    </div>
                  )}

                  {selectedRecharge.pix_copy_paste && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Código PIX Copia e Cola</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={selectedRecharge.pix_copy_paste}
                          readOnly
                          className="flex-1 px-3 py-2 border rounded-md font-mono text-xs bg-gray-50"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopyPixCode(selectedRecharge.pix_copy_paste!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Link de Pagamento */}
              {selectedRecharge.payment_url && (
                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(selectedRecharge.payment_url!, '_blank')}
                  >
                    Abrir Página de Pagamento
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
