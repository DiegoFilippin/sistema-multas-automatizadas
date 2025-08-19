import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, MapPin, Car, Edit, Trash2, Plus, MoreVertical, DollarSign, FileText, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { multasService } from '@/services/multasService';
import { clientsService } from '@/services/clientsService';
import type { Database } from '@/lib/supabase';

type Multa = Database['public']['Tables']['multas']['Row']

interface Endereco {
  id: string;
  tipo: 'residencial' | 'comercial' | 'correspondencia';
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  principal: boolean;
}

interface Email {
  id: string;
  tipo: 'pessoal' | 'comercial' | 'alternativo';
  email: string;
  principal: boolean;
}

interface Contato {
  id: string;
  tipo: 'celular' | 'residencial' | 'comercial' | 'whatsapp';
  numero: string;
  principal: boolean;
}

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  cor: string;
  renavam: string;
}

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  emails: Email[];
  telefones: Contato[];
  enderecos: Endereco[];
  dataNascimento: string;
  cnh: string;
  veiculos: Veiculo[];
  multas: number;
  recursosAtivos: number;
  valorEconomizado: number;
  dataCadastro: string;
  status: 'ativo' | 'inativo';
}



export default function ClienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [multas, setMultas] = useState<Multa[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMultas, setLoadingMultas] = useState(false);

  // Função para carregar multas do cliente
  const fetchMultasCliente = async (clienteId: string) => {
    try {
      setLoadingMultas(true);
      const multasCliente = await multasService.getMultas({ clientId: clienteId });
      setMultas(multasCliente);
    } catch (error) {
      console.error('Erro ao carregar multas do cliente:', error);
      toast.error('Erro ao carregar multas do cliente');
    } finally {
      setLoadingMultas(false);
    }
  };

  useEffect(() => {
    // Carregar dados do cliente do Supabase
    const fetchCliente = async () => {
      try {
        setLoading(true);
        
        // Buscar cliente com detalhes completos
        const clienteCompleto = await clientsService.getClientWithDetails(id!);
        
        if (!clienteCompleto) {
          console.log('Cliente não encontrado no banco de dados');
          setCliente(null);
          return;
        }

        // Converter dados do Supabase para o formato local
        const clienteConvertido: Cliente = {
          id: clienteCompleto.id,
          nome: clienteCompleto.nome,
          cpf: clienteCompleto.cpf_cnpj,
          dataNascimento: '',
          cnh: '',
          status: clienteCompleto.status,
          emails: [{
            id: '1',
            tipo: 'pessoal',
            email: clienteCompleto.email || '',
            principal: true
          }],
          telefones: [{
            id: '1',
            tipo: 'celular',
            numero: clienteCompleto.telefone || '',
            principal: true
          }],
          enderecos: [{
            id: '1',
            tipo: 'residencial',
            logradouro: clienteCompleto.endereco || '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: clienteCompleto.cidade || '',
            estado: clienteCompleto.estado || '',
            cep: clienteCompleto.cep || '',
            principal: true
          }],
          veiculos: clienteCompleto.vehicles.map(vehicle => ({
            id: vehicle.id,
            placa: vehicle.placa,
            modelo: vehicle.modelo,
            marca: vehicle.marca,
            ano: vehicle.ano,
            cor: vehicle.cor,
            renavam: vehicle.renavam
          })),
          multas: clienteCompleto.multas_count,
          recursosAtivos: clienteCompleto.recursos_count,
          valorEconomizado: clienteCompleto.valor_economizado,
          dataCadastro: clienteCompleto.created_at
        };
        setCliente(clienteConvertido);
        // Carregar multas do cliente
        fetchMultasCliente(clienteCompleto.id);
      } catch (error) {
        console.error('Erro ao carregar cliente:', error);
        toast.error('Erro ao carregar dados do cliente');
        setCliente(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCliente();
    }
  }, [id]);

  const handleEdit = () => {
    // Navegar para página de edição ou abrir modal
    toast.info('Funcionalidade de edição em desenvolvimento');
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      toast.success('Cliente excluído com sucesso');
      navigate('/clientes');
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: { [key: string]: string } = {
      'residencial': 'Residencial',
      'comercial': 'Comercial',
      'correspondencia': 'Correspondência',
      'pessoal': 'Pessoal',
      'alternativo': 'Alternativo',
      'celular': 'Celular',
      'whatsapp': 'WhatsApp'
    };
    return labels[tipo] || tipo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Cliente não encontrado</h1>
        <button
          onClick={() => navigate('/clientes')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Clientes
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/clientes')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{cliente.nome}</h1>
            <p className="text-gray-600">CPF: {cliente.cpf}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="h-4 w-4" />
            Editar
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
      </div>

      {/* Status e Informações Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className={`font-semibold ${cliente.status === 'ativo' ? 'text-green-600' : 'text-red-600'}`}>
                {cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Multas</p>
              <p className="font-semibold text-gray-900">{cliente.multas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileText className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Recursos Ativos</p>
              <p className="font-semibold text-gray-900">{cliente.recursosAtivos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Valor Economizado</p>
              <p className="font-semibold text-gray-900">
                R$ {cliente.valorEconomizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Informações Pessoais */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Data de Nascimento</label>
              <p className="text-gray-900">
                {cliente.dataNascimento && cliente.dataNascimento !== '' ? 
                  format(new Date(cliente.dataNascimento), 'dd/MM/yyyy', { locale: ptBR }) : 
                  'Não informado'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">CNH</label>
              <p className="text-gray-900">{cliente.cnh}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Data de Cadastro</label>
              <p className="text-gray-900">
                {format(new Date(cliente.dataCadastro), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {/* Contatos */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contatos
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {/* Telefones */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Telefones</h3>
              <div className="space-y-2">
                {cliente.telefones.map((telefone) => (
                  <div key={telefone.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900">{telefone.numero}</p>
                      <p className="text-xs text-gray-500">
                        {getTipoLabel(telefone.tipo)}
                        {telefone.principal && ' (Principal)'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emails */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">E-mails</h3>
              <div className="space-y-2">
                {cliente.emails.map((email) => (
                  <div key={email.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900">{email.email}</p>
                      <p className="text-xs text-gray-500">
                        {getTipoLabel(email.tipo)}
                        {email.principal && ' (Principal)'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Endereços */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereços
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {cliente.enderecos.map((endereco) => (
              <div key={endereco.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">
                    {getTipoLabel(endereco.tipo)}
                    {endereco.principal && ' (Principal)'}
                  </h3>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{endereco.logradouro}, {endereco.numero}</p>
                  {endereco.complemento && <p>{endereco.complemento}</p>}
                  <p>{endereco.bairro}</p>
                  <p>{endereco.cidade} - {endereco.estado}</p>
                  <p>CEP: {endereco.cep}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Veículos */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Veículos
              </h2>
              <button className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {cliente.veiculos.length > 0 ? (
              cliente.veiculos.map((veiculo) => (
                <div key={veiculo.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{veiculo.marca} {veiculo.modelo}</h3>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p><span className="font-medium">Placa:</span> {veiculo.placa}</p>
                      <p><span className="font-medium">Ano:</span> {veiculo.ano}</p>
                    </div>
                    <div>
                      <p><span className="font-medium">Cor:</span> {veiculo.cor}</p>
                      <p><span className="font-medium">Renavam:</span> {veiculo.renavam}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum veículo cadastrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Multas */}
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Multas ({multas.length})
              </h2>
              <button 
                onClick={() => navigate('/multas/nova')}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Plus className="h-4 w-4" />
                Nova Multa
              </button>
            </div>
          </div>
          <div className="p-6">
            {loadingMultas ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <span className="ml-2 text-gray-600">Carregando multas...</span>
              </div>
            ) : multas.length > 0 ? (
              <div className="space-y-4">
                {multas.map((multa) => (
                  <div key={multa.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{multa.numero_auto}</h3>
                          <p className="text-sm text-gray-600">{multa.descricao_infracao}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">
                          R$ {multa.valor_original?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          multa.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                          multa.status === 'pago' ? 'bg-green-100 text-green-800' :
                          multa.status === 'em_recurso' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {multa.status}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <p><span className="font-medium">Placa:</span> {multa.placa_veiculo}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Data:</span> {multa.data_infracao && multa.data_infracao !== '' ? format(new Date(multa.data_infracao), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}</p>
                      </div>
                      <div>
                        <p><span className="font-medium">Local:</span> {multa.local_infracao || 'N/A'}</p>
                      </div>
                      <div>
                        <button 
                          onClick={() => navigate(`/multas/${multa.id}`)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma multa encontrada para este cliente</p>
                <button 
                  onClick={() => navigate('/multas/nova')}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar primeira multa
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
