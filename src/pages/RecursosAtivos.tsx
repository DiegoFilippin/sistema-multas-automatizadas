import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ServiceOrder {
  id: string;
  service_type: string;
  multa_type: string;
  amount: number;
  status: 'pending_payment' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'expired';
  description?: string;
  auto_autuacao_url?: string;
  recurso_generated_url?: string;
  ai_analysis?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  expires_at: string;
  client: {
    id: string;
    nome: string;
    cpf_cnpj: string;
  };
  service: {
    id: string;
    name: string;
    description: string;
  };
}

interface UploadProgress {
  serviceOrderId: string;
  progress: number;
  uploading: boolean;
}

const RecursosAtivos: React.FC = () => {
  const { user } = useAuthStore();
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [processingService, setProcessingService] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadActiveServices();
    }
  }, [user]);

  const loadActiveServices = async () => {
    try {
      setLoading(true);

      // Buscar serviços ativos do cliente atual
      // Como não temos relação direta entre users e clients, vamos buscar por email
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('email', user?.email)
        .single();

      if (clientError) {
        console.error('Cliente não encontrado:', clientError);
        setServiceOrders([]);
        return;
      }

      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          client:clients(id, nome, cpf_cnpj),
          service:services(id, name, description)
        `)
        .eq('client_id', clientData.id)
        .in('status', ['paid', 'processing', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServiceOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar serviços ativos:', error);
      toast.error('Erro ao carregar serviços ativos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (serviceOrderId: string, file: File) => {
    if (!file) {
      toast.error('Selecione um arquivo');
      return;
    }

    // Validar tipo de arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Apenas arquivos PDF, JPG e PNG são permitidos');
      return;
    }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB');
      return;
    }

    try {
      setUploadProgress(prev => ({
        ...prev,
        [serviceOrderId]: { serviceOrderId, progress: 0, uploading: true }
      }));

      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[serviceOrderId]?.progress || 0;
          if (current < 90) {
            return {
              ...prev,
              [serviceOrderId]: { ...prev[serviceOrderId], progress: current + 10 }
            };
          }
          return prev;
        });
      }, 200);

      // Upload do arquivo para o Supabase Storage
      const fileName = `auto-autuacao-${serviceOrderId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Obter URL pública do arquivo
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Atualizar service_order com URL do arquivo
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          auto_autuacao_url: urlData.publicUrl,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceOrderId);

      if (updateError) throw updateError;

      setUploadProgress(prev => ({
        ...prev,
        [serviceOrderId]: { serviceOrderId, progress: 100, uploading: false }
      }));

      toast.success('Arquivo enviado com sucesso!');
      loadActiveServices(); // Recarregar dados

      // Limpar progresso após 2 segundos
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[serviceOrderId];
          return newProgress;
        });
      }, 2000);

    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar arquivo');
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[serviceOrderId];
        return newProgress;
      });
    }
  };

  const processRecurso = async (serviceOrderId: string) => {
    try {
      setProcessingService(serviceOrderId);

      // Simular processamento da IA
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Atualizar status para completed com análise simulada
      const { error } = await supabase
        .from('service_orders')
        .update({
          status: 'completed',
          ai_analysis: 'Recurso processado com sucesso pela IA. Documento gerado com base na análise do auto de autuação.',
          recurso_generated_url: 'https://exemplo.com/recurso-gerado.pdf',
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceOrderId);

      if (error) throw error;

      toast.success('Recurso processado com sucesso!');
      loadActiveServices();
    } catch (error) {
      console.error('Erro ao processar recurso:', error);
      toast.error('Erro ao processar recurso');
    } finally {
      setProcessingService(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: 'Pago', variant: 'default' as const, icon: CheckCircle },
      processing: { label: 'Processando', variant: 'secondary' as const, icon: Clock },
      completed: { label: 'Concluído', variant: 'default' as const, icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
      { label: status, variant: 'secondary' as const, icon: AlertCircle };

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando recursos ativos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Recursos Ativos</h1>
        <p className="text-gray-600">
          Gerencie seus recursos de multa pagos e faça upload dos documentos necessários.
        </p>
      </div>

      {serviceOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum recurso ativo</h3>
            <p className="text-gray-600 text-center">
              Você não possui recursos de multa ativos no momento.
              <br />
              Entre em contato com seu despachante para criar uma nova cobrança.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {serviceOrders.map((serviceOrder) => {
            const progress = uploadProgress[serviceOrder.id];
            
            return (
              <Card key={serviceOrder.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        Recurso de Multa - {serviceOrder.multa_type.toUpperCase()}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {serviceOrder.description}
                      </CardDescription>
                    </div>
                    {getStatusBadge(serviceOrder.status)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Informações do Serviço */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Detalhes do Serviço</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Valor Pago:</span>
                        <p className="font-medium">{formatCurrency(serviceOrder.amount)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Data do Pagamento:</span>
                        <p className="font-medium">
                          {serviceOrder.paid_at ? formatDate(serviceOrder.paid_at) : 'Pendente'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Upload de Documento */}
                  {serviceOrder.status === 'paid' && !serviceOrder.auto_autuacao_url && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                        <h4 className="font-medium text-gray-900 mb-2">Upload do Auto de Autuação</h4>
                        <p className="text-gray-600 mb-4">
                          Faça upload do auto de autuação para processar o recurso
                        </p>
                        
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(serviceOrder.id, file);
                            }
                          }}
                          disabled={progress?.uploading}
                          className="max-w-xs mx-auto"
                        />
                        
                        {progress?.uploading && (
                          <div className="mt-4">
                            <Progress value={progress.progress} className="w-full max-w-xs mx-auto" />
                            <p className="text-sm text-gray-600 mt-2">
                              Enviando... {progress.progress}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Documento Enviado */}
                  {serviceOrder.auto_autuacao_url && serviceOrder.status === 'processing' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-600 mr-2" />
                          <div>
                            <p className="font-medium text-blue-800">Documento Enviado</p>
                            <p className="text-sm text-blue-600">Aguardando processamento pela IA</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => processRecurso(serviceOrder.id)}
                          disabled={processingService === serviceOrder.id}
                          size="sm"
                        >
                          {processingService === serviceOrder.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            'Processar Recurso'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Recurso Concluído */}
                  {serviceOrder.status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Recurso Gerado com Sucesso
                      </h4>
                      
                      {serviceOrder.ai_analysis && (
                        <div className="mb-4">
                          <p className="text-sm text-green-700 mb-2">Análise da IA:</p>
                          <p className="text-sm text-green-600 bg-white p-3 rounded border">
                            {serviceOrder.ai_analysis}
                          </p>
                        </div>
                      )}
                      
                      {serviceOrder.recurso_generated_url && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => window.open(serviceOrder.recurso_generated_url, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download do Recurso
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPreviewUrl(serviceOrder.recurso_generated_url!);
                              setShowPreviewModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Preview */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Visualizar Recurso</DialogTitle>
            <DialogDescription>
              Preview do documento gerado
            </DialogDescription>
          </DialogHeader>
          
          {previewUrl && (
            <div className="flex-1 overflow-auto">
              <iframe
                src={previewUrl}
                className="w-full h-[60vh] border rounded"
                title="Preview do Recurso"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecursosAtivos;