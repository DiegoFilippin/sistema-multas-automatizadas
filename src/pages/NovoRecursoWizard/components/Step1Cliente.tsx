import React, { useState, useEffect } from 'react';
import { Search, User, Plus, Clock, Mail, Phone, Building } from 'lucide-react';
import { Cliente } from '../types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface Step1ClienteProps {
  selectedCliente: Cliente | null;
  onClienteSelect: (cliente: Cliente) => void;
  onNext: () => void;
}

const Step1Cliente: React.FC<Step1ClienteProps> = ({
  selectedCliente,
  onClienteSelect,
  onNext,
}) => {
  const { user } = useAuthStore();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [recentClientes, setRecentClientes] = useState<Cliente[]>([]);

  // Carregar clientes
  useEffect(() => {
    loadClientes();
  }, [user]);

  // Filtrar clientes baseado na busca
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClientes(clientes);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clientes.filter(
        (cliente) =>
          cliente.nome.toLowerCase().includes(term) ||
          cliente.email?.toLowerCase().includes(term) ||
          cliente.cpf_cnpj?.toLowerCase().includes(term) ||
          cliente.telefone?.toLowerCase().includes(term)
      );
      setFilteredClientes(filtered);
    }
  }, [searchTerm, clientes]);

  const loadClientes = async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from('clients')
        .select('*')
        .order('nome', { ascending: true });

      // Filtrar por empresa se não for superadmin
      if (user?.role !== 'Superadmin' && user?.company_id) {
        query = query.eq('company_id', user.company_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const clientesFormatados: Cliente[] = (data || []).map((c: any) => ({
        id: c.id,
        nome: c.nome,
        email: c.email,
        telefone: c.telefone,
        cpf_cnpj: c.cpf_cnpj,
        created_at: c.created_at,
      }));

      setClientes(clientesFormatados);
      setFilteredClientes(clientesFormatados);

      // Pegar clientes recentes (últimos 5)
      setRecentClientes(clientesFormatados.slice(0, 5));
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClienteClick = (cliente: Cliente) => {
    onClienteSelect(cliente);
  };

  const handleContinue = () => {
    if (!selectedCliente) {
      toast.error('Selecione um cliente para continuar');
      return;
    }
    onNext();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Selecione o Cliente
        </h2>
        <p className="text-gray-600">
          Escolha o cliente para quem o recurso será criado
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nome, email, CPF/CNPJ ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
        />
      </div>

      {/* Selected Cliente Display */}
      {selectedCliente && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-blue-50 border-2 border-blue-500 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {selectedCliente.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {selectedCliente.nome}
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {selectedCliente.email}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                  Selecionado
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Clientes */}
      {!searchTerm && recentClientes.length > 0 && (
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">
              Clientes Recentes
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentClientes.map((cliente) => (
              <ClienteCard
                key={cliente.id}
                cliente={cliente}
                isSelected={selectedCliente?.id === cliente.id}
                onClick={() => handleClienteClick(cliente)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Clientes */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {searchTerm ? 'Resultados da Busca' : 'Todos os Clientes'}
          </h3>
          <span className="text-sm text-gray-500">
            {filteredClientes.length} cliente(s)
          </span>
        </div>

        {filteredClientes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">Nenhum cliente encontrado</p>
            <p className="text-sm text-gray-500">
              Tente ajustar os termos de busca
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
            {filteredClientes.map((cliente) => (
              <ClienteCard
                key={cliente.id}
                cliente={cliente}
                isSelected={selectedCliente?.id === cliente.id}
                onClick={() => handleClienteClick(cliente)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between max-w-4xl mx-auto pt-6 border-t border-gray-200">
        <button
          onClick={() => toast.info('Cadastro de novo cliente em desenvolvimento')}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>

        <button
          onClick={handleContinue}
          disabled={!selectedCliente}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Continuar
        </button>
      </div>
    </div>
  );
};

// Componente ClienteCard
interface ClienteCardProps {
  cliente: Cliente;
  isSelected: boolean;
  onClick: () => void;
}

const ClienteCard: React.FC<ClienteCardProps> = ({
  cliente,
  isSelected,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-xl border-2 transition-all
        ${
          isSelected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
          w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
          ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
        `}
        >
          {cliente.nome.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold truncate ${
              isSelected ? 'text-blue-900' : 'text-gray-900'
            }`}
          >
            {cliente.nome}
          </p>
          {cliente.email && (
            <div className="flex items-center gap-1 mt-1">
              <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-600 truncate">{cliente.email}</p>
            </div>
          )}
          {cliente.telefone && (
            <div className="flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-600">{cliente.telefone}</p>
            </div>
          )}
          {cliente.cpf_cnpj && (
            <div className="flex items-center gap-1 mt-1">
              <Building className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-600">{cliente.cpf_cnpj}</p>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default Step1Cliente;
