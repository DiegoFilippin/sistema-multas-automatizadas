import React, { useState, useEffect } from 'react';
import { Check, X, Calendar, Building, User, Mail, Phone, FileText } from 'lucide-react';

interface Precadastro {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  data_nascimento?: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  webhook_enviado: boolean;
  webhook_response?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export default function Precadastros() {
  const [precadastros, setPrecadastros] = useState<Precadastro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrecadastro, setSelectedPrecadastro] = useState<Precadastro | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'aprovar' | 'rejeitar' | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchPrecadastros();
  }, []);

  const fetchPrecadastros = async () => {
    try {
      const baseUrl = import.meta.env.PROD ? '' : 'http://localhost:3001';
      const token = localStorage.getItem('token');

      console.log('🔍 Fazendo requisição para:', `${baseUrl}/api/precadastros`);
      console.log('📋 Token usado:', token ? 'Token presente' : 'Token ausente');
      console.log('🔐 Authorization:', token ? `Bearer ${token.slice(0, 10)}...` : 'nenhum');
      
      const response = await fetch(`${baseUrl}/api/precadastros`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🧾 Status da resposta:', response.status);

      if (!response.ok) {
        let serverMsg = '';
        try {
          const ct = response.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const errJson = await response.json();
            serverMsg = JSON.stringify(errJson);
          } else {
            serverMsg = await response.text();
          }
        } catch (e) {
          serverMsg = 'não foi possível ler corpo da resposta';
        }
        console.error('Erro ao carregar pré-cadastros (detalhes):', { status: response.status, serverMsg });
        alert(`Erro ao carregar pré-cadastros (${response.status}): ${serverMsg}`);
        return;
      }

      const data = await response.json();
      setPrecadastros(data.precadastros || []);
    } catch (error: any) {
      console.error('Erro completo ao carregar pré-cadastros:', error);
      alert(`Erro ao carregar pré-cadastros: ${error?.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (precadastro: Precadastro, action: 'aprovar' | 'rejeitar') => {
    setSelectedPrecadastro(precadastro);
    setActionType(action);
    setObservacoes('');
    setShowModal(true);
  };

  const confirmAction = async () => {
    if (!selectedPrecadastro || !actionType) return;

    setIsProcessing(true);
    try {
      const baseUrl = import.meta.env.PROD ? '' : 'http://localhost:3001';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${baseUrl}/api/precadastros/${selectedPrecadastro.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: actionType === 'aprovar' ? 'aprovado' : 'rejeitado',
          observacoes: observacoes.trim() || null
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar status');
      }

      // Atualizar a lista local
      setPrecadastros(prev => 
        prev.map(p => 
          p.id === selectedPrecadastro.id 
            ? { 
                ...p, 
                status: actionType === 'aprovar' ? 'aprovado' : 'rejeitado',
                observacoes: observacoes.trim() || p.observacoes,
                updated_at: new Date().toISOString()
              }
            : p
        )
      );

      setShowModal(false);
      alert(`Pré-cadastro ${actionType === 'aprovar' ? 'aprovado' : 'rejeitado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do pré-cadastro');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'text-green-600 bg-green-100';
      case 'rejeitado': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprovado': return 'Aprovado';
      case 'rejeitado': return 'Rejeitado';
      default: return 'Pendente';
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pré-cadastros</h1>
        <p className="text-gray-600">Gerencie os pré-cadastros de empresas interessadas</p>
      </div>

      {precadastros.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pré-cadastro encontrado</h3>
          <p className="text-gray-500">Quando empresas se cadastrarem, elas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {precadastros.map((precadastro) => (
                  <tr key={precadastro.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {precadastro.razao_social}
                          </div>
                          <div className="text-sm text-gray-500">
                            CNPJ: {precadastro.cnpj}
                          </div>
                          {precadastro.nome_fantasia && (
                            <div className="text-sm text-gray-500">
                              {precadastro.nome_fantasia}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {precadastro.nome}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {precadastro.email}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {precadastro.telefone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(precadastro.status)}`}>
                        {getStatusText(precadastro.status)}
                      </span>
                      {!precadastro.webhook_enviado && (
                        <div className="text-xs text-red-500 mt-1">
                          Webhook não enviado
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(precadastro.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {precadastro.status === 'pendente' ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAction(precadastro, 'aprovar')}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleAction(precadastro, 'rejeitar')}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeitar
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">
                          {precadastro.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {showModal && selectedPrecadastro && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {actionType === 'aprovar' ? 'Aprovar' : 'Rejeitar'} Pré-cadastro
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Empresa:</strong> {selectedPrecadastro.razao_social}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Contato:</strong> {selectedPrecadastro.nome}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {selectedPrecadastro.email}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações {actionType === 'rejeitar' ? '(obrigatório)' : '(opcional)'}
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={
                    actionType === 'aprovar' 
                      ? 'Observações sobre a aprovação...' 
                      : 'Motivo da rejeição...'
                  }
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAction}
                  disabled={isProcessing || (actionType === 'rejeitar' && !observacoes.trim())}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    actionType === 'aprovar'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {isProcessing ? 'Processando...' : (actionType === 'aprovar' ? 'Aprovar' : 'Rejeitar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}