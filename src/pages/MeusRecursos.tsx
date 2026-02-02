import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  CreditCard,
  Loader2,
  Eye,
  Trash2
} from 'lucide-react';
import { useRecursoDraft, RecursoDraft } from '@/hooks/useRecursoDraft';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PaymentDetailsModal from './MeusRecursos/PaymentDetailsModal';

const MeusRecursos: React.FC = () => {
  const navigate = useNavigate();
  const { listDrafts, deleteDraft, isLoading } = useRecursoDraft();
  const [recursos, setRecursos] = useState<RecursoDraft[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [selectedPayment, setSelectedPayment] = useState<{
    recursoId: string;
    data: any;
  } | null>(null);

  // Carregar recursos
  useEffect(() => {
    loadRecursos();
  }, []);

  const loadRecursos = async () => {
    const filters = filtroStatus === 'todos' 
      ? undefined 
      : { status: [filtroStatus] };
    
    const data = await listDrafts(filters);
    setRecursos(data);
  };

  // Recarregar ao mudar filtro
  useEffect(() => {
    loadRecursos();
  }, [filtroStatus]);

  const handleNovoRecurso = () => {
    navigate('/novo-recurso-wizard');
  };

  const handleRetomar = async (recurso: RecursoDraft) => {
    console.log('🔄 Retomando recurso:', recurso.id, 'Status:', recurso.status);
    
    // Lógica baseada no status
    switch (recurso.status) {
      case 'rascunho':
        // Rascunho: volta ao wizard no step onde parou
        console.log('📝 Rascunho - voltando ao wizard no step', recurso.current_step);
        navigate(`/novo-recurso-wizard?recursoId=${recurso.id}`);
        break;
        
      case 'aguardando_pagamento':
        // Aguardando pagamento: buscar dados do pagamento e abrir modal
        console.log('💳 Aguardando pagamento - buscando dados do pagamento...');
        
        try {
          // Buscar dados completos do service_order via API
          const token = localStorage.getItem('token');
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          const url = `${apiUrl}/api/service-orders/draft/${recurso.id}`;
          
          console.log('🔍 Buscando pagamento:', {
            url,
            recursoId: recurso.id,
            hasToken: !!token
          });
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📡 Response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na resposta:', errorText);
            throw new Error(`Erro ${response.status}: ${errorText}`);
          }
          
          const result = await response.json();
          console.log('📦 Result completo:', result);
          
          const serviceOrder = result.draft;
          console.log('📦 Service Order:', serviceOrder);
          
          setSelectedPayment({
            recursoId: recurso.id,
            data: {
              asaas_payment_id: serviceOrder.asaas_payment_id,
              asaas_invoice_url: serviceOrder.invoice_url || serviceOrder.asaas_invoice_url,
              qr_code: serviceOrder.qr_code_image || serviceOrder.pix_qr_code,
              pix_copy_paste: serviceOrder.pix_payload || serviceOrder.pix_copy_paste,
              amount: serviceOrder.amount || recurso.wizard_data?.step2?.servico_preco || 0,
              status: serviceOrder.status === 'paid' ? 'paid' : 'pending',
              created_at: serviceOrder.created_at || recurso.created_at
            }
          });
        } catch (error) {
          console.error('❌ Erro ao buscar dados do pagamento:', error);
          toast.error('Erro ao carregar dados do pagamento');
        }
        break;
        
      case 'em_preenchimento':
        // Em preenchimento: vai para página de recurso inteligente com os dados do service order
        console.log('✍️ Em preenchimento - indo para página de recurso inteligente');
        // Construir URL com parâmetros do cliente se disponíveis
        const params = new URLSearchParams();
        params.set('serviceOrderId', recurso.id);
        if (recurso.client_id) params.set('clientId', recurso.client_id);
        navigate(`/teste-recurso-ia?${params.toString()}`);
        break;
        
      default:
        console.warn('⚠️ Status não suportado para retomada:', recurso.status);
        toast.error('Este recurso não pode ser retomado neste status');
    }
  };

  const handleExcluir = async (recursoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este recurso?')) return;
    
    const success = await deleteDraft(recursoId);
    if (success) {
      loadRecursos();
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'rascunho':
        return {
          label: 'Rascunho',
          icon: FileText,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          description: 'Não finalizado'
        };
      case 'aguardando_pagamento':
        return {
          label: 'Aguardando Pagamento',
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          description: 'Cobrança gerada'
        };
      case 'em_preenchimento':
        return {
          label: 'Em Preenchimento',
          icon: FileText,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          description: 'Pago, preencher dados'
        };
      case 'em_analise':
        return {
          label: 'Em Análise',
          icon: Loader2,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          description: 'IA processando'
        };
      case 'concluido':
        return {
          label: 'Concluído',
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          description: 'Recurso gerado'
        };
      case 'cancelado':
        return {
          label: 'Cancelado',
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          description: 'Cancelado'
        };
      case 'expirado':
        return {
          label: 'Expirado',
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          description: 'Prazo expirado'
        };
      default:
        return {
          label: status,
          icon: FileText,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          description: ''
        };
    }
  };

  const getStepLabel = (step: number) => {
    switch (step) {
      case 1: return 'Cliente';
      case 2: return 'Serviço';
      case 3: return 'Pagamento';
      default: return `Step ${step}`;
    }
  };

  const filteredRecursos = recursos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meus Recursos</h1>
              <p className="text-gray-600 mt-1">
                Gerencie seus recursos de multas
              </p>
            </div>
            <button
              onClick={handleNovoRecurso}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Novo Recurso</span>
            </button>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'todos', label: 'Todos' },
              { value: 'rascunho', label: 'Rascunhos' },
              { value: 'aguardando_pagamento', label: 'Aguardando Pagamento' },
              { value: 'em_preenchimento', label: 'Em Preenchimento' },
              { value: 'em_analise', label: 'Em Análise' },
              { value: 'concluido', label: 'Concluídos' },
            ].map((filtro) => (
              <button
                key={filtro.value}
                onClick={() => setFiltroStatus(filtro.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroStatus === filtro.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Lista de Recursos */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecursos.length === 0 ? (
              <div className="col-span-full">
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum recurso encontrado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Comece criando seu primeiro recurso
                  </p>
                  <button
                    onClick={handleNovoRecurso}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Novo Recurso</span>
                  </button>
                </div>
              </div>
            ) : (
              filteredRecursos.map((recurso) => {
                const statusInfo = getStatusInfo(recurso.status);
                const StatusIcon = statusInfo.icon;
                
                // Log para debug
                console.log('🔍 Recurso:', {
                  id: recurso.id,
                  wizard_data: recurso.wizard_data,
                  client_id: recurso.client_id,
                  service_id: recurso.service_id
                });
                
                const clienteNome = recurso.wizard_data?.step1?.cliente_nome || 'Cliente não selecionado';
                const servicoNome = recurso.wizard_data?.step2?.servico_nome || 'Serviço não selecionado';
                const servicoPreco = recurso.wizard_data?.step2?.servico_preco || 0;

                return (
                  <div
                    key={recurso.id}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
                  >
                    {/* Header com ID e Status */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bgColor}`}>
                        <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                        <span className={`text-sm font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      {/* Step Indicator */}
                      <div className="text-xs text-gray-500">
                        Step {recurso.current_step}/3
                      </div>
                    </div>

                    {/* ID do Recurso */}
                    <div className="mb-3 pb-3 border-b border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">ID do Recurso</p>
                      <p className="text-xs font-mono text-gray-700 truncate" title={recurso.id}>
                        #{recurso.id.slice(0, 8)}...
                      </p>
                    </div>

                    {/* Informações */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Cliente</p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {clienteNome}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Serviço</p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {servicoNome}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500">Valor</p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {servicoPreco.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Última atualização</p>
                          <p className="text-xs text-gray-700">
                            {formatDistanceToNow(new Date(recurso.last_saved_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                      {recurso.status === 'rascunho' && (
                        <button
                          onClick={() => handleRetomar(recurso)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Continuar</span>
                        </button>
                      )}
                      
                      {recurso.status === 'aguardando_pagamento' && (
                        <button
                          onClick={() => handleRetomar(recurso)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Ver Pagamento</span>
                        </button>
                      )}
                      
                      {recurso.status === 'em_preenchimento' && (
                        <button
                          onClick={() => handleRetomar(recurso)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Preencher Dados</span>
                        </button>
                      )}
                      
                      {recurso.status === 'concluido' && (
                        <button
                          onClick={() => navigate(`/recursos/${recurso.id}`)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ver Recurso</span>
                        </button>
                      )}

                      {(recurso.status === 'rascunho' || recurso.status === 'cancelado') && (
                        <button
                          onClick={() => handleExcluir(recurso.id)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Pagamento */}
      {selectedPayment && (
        <PaymentDetailsModal
          isOpen={true}
          onClose={() => setSelectedPayment(null)}
          recursoId={selectedPayment.recursoId}
          paymentData={selectedPayment.data}
        />
      )}
    </div>
  );
};

export default MeusRecursos;
