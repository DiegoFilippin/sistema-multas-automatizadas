import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, MapPin, Car } from 'lucide-react';
import { toast } from 'sonner';

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  status: 'ativo' | 'inativo';
}

export default function ClienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCliente = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Simular carregamento de dados
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Dados mock para teste
        const mockCliente: Cliente = {
          id: id || '',
          nome: 'Cliente Teste',
          cpf: '123.456.789-00',
          email: 'cliente@email.com',
          telefone: '(11) 99999-9999',
          endereco: 'Rua Teste, 123',
          cidade: 'São Paulo',
          estado: 'SP',
          status: 'ativo'
        };
        
        setCliente(mockCliente);
      } catch (err) {
        console.error('Erro ao carregar cliente:', err);
        setError('Erro ao carregar dados do cliente');
        toast.error('Erro ao carregar dados do cliente');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCliente();
    } else {
      setLoading(false);
      setError('ID do cliente não fornecido');
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {error || 'Cliente não encontrado'}
        </h1>
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
    <div className="p-6 max-w-4xl mx-auto">
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
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            cliente.status === 'ativo' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      {/* Informações do Cliente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contato */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contato
          </h2>
          <div className="space-y-3">
            {cliente.telefone && (
              <div>
                <label className="text-sm font-medium text-gray-700">Telefone</label>
                <p className="text-gray-900">{cliente.telefone}</p>
              </div>
            )}
            {cliente.email && (
              <div>
                <label className="text-sm font-medium text-gray-700">E-mail</label>
                <p className="text-gray-900">{cliente.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço
          </h2>
          <div className="space-y-3">
            {cliente.endereco && (
              <div>
                <label className="text-sm font-medium text-gray-700">Logradouro</label>
                <p className="text-gray-900">{cliente.endereco}</p>
              </div>
            )}
            {cliente.cidade && (
              <div>
                <label className="text-sm font-medium text-gray-700">Cidade</label>
                <p className="text-gray-900">{cliente.cidade} - {cliente.estado}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Informações Adicionais */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5" />
          Informações Gerais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">ID do Cliente</p>
            <p className="font-semibold text-gray-900">{cliente.id}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-semibold text-gray-900">{cliente.status}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">CPF</p>
            <p className="font-semibold text-gray-900">{cliente.cpf}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
