import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  UserPlus, 
  Calendar, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa?: string;
  cnpj?: string;
  cidade: string;
  estado: string;
  servico_interesse: string;
  mensagem?: string;
  origem: string;
  status: 'novo' | 'contatado' | 'qualificado' | 'convertido' | 'perdido';
  data_primeiro_contato?: string;
  data_ultimo_contato?: string;
  responsavel?: {
    id: string;
    nome: string;
    email: string;
  };
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

interface LeadStats {
  total: number;
  novos: number;
  convertidos: number;
  recentes: number;
  porServico: Record<string, number>;
  taxaConversao: string;
}

const statusConfig = {
  novo: { label: 'Novo', color: 'bg-blue-100 text-blue-800', icon: Clock },
  contatado: { label: 'Contatado', color: 'bg-yellow-100 text-yellow-800', icon: Phone },
  qualificado: { label: 'Qualificado', color: 'bg-purple-100 text-purple-800', icon: TrendingUp },
  convertido: { label: 'Convertido', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  perdido: { label: 'Perdido', color: 'bg-red-100 text-red-800', icon: XCircle }
};

const servicoLabels = {
  recurso_multa: 'Recursos de Multa',
  consultoria: 'Consultoria em Trânsito',
  gestao_frotas: 'Gestão de Frotas',
  outros: 'Outros Serviços'
};

const origemLabels = {
  site: 'Site da Empresa',
  google: 'Google',
  indicacao: 'Indicação',
  redes_sociais: 'Redes Sociais',
  outros: 'Outros'
};

export default function GerenciarLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroServico, setFiltroServico] = useState('');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { user } = useAuthStore();

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      if (filtroStatus !== 'todos') params.append('status', filtroStatus);
      if (filtroServico) params.append('servico_interesse', filtroServico);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/leads/list?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar leads');
      }
      
      const data = await response.json();
      setLeads(data.data.leads);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/leads/stats/dashboard');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas');
      }
      
      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string, obs?: string) => {
    try {
      setIsUpdating(true);
      
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          observacoes: obs
        })
      });
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar status');
      }
      
      toast.success('Status atualizado com sucesso!');
      loadLeads();
      loadStats();
      
      if (selectedLead?.id === leadId) {
        setShowDetails(false);
        setSelectedLead(null);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsUpdating(false);
    }
  };

  const viewLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setObservacoes(lead.observacoes || '');
    setShowDetails(true);
  };

  const createAccount = async (lead: Lead) => {
    // TODO: Implementar criação de conta para o lead
    toast.info('Funcionalidade de criação de conta será implementada em breve');
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

  useEffect(() => {
    loadLeads();
    loadStats();
  }, [filtroStatus, filtroServico, search]);

  // Verificar se o usuário tem permissão
  if (!user || !['Superadmin', 'admin'].includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Acesso Negado</h3>
              <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Leads</h1>
          <p className="text-gray-600">Gerencie leads do formulário de contato</p>
        </div>
        
        <Button onClick={() => { loadLeads(); loadStats(); }} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Novos Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.novos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Convertidos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.convertidos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.taxaConversao}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome, email ou empresa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos os Status</option>
                <option value="novo">Novos</option>
                <option value="contatado">Contatados</option>
                <option value="qualificado">Qualificados</option>
                <option value="convertido">Convertidos</option>
                <option value="perdido">Perdidos</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="servico">Serviço</Label>
              <select
                id="servico"
                value={filtroServico}
                onChange={(e) => setFiltroServico(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os Serviços</option>
                <option value="recurso_multa">Recursos de Multa</option>
                <option value="consultoria">Consultoria</option>
                <option value="gestao_frotas">Gestão de Frotas</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearch('');
                  setFiltroStatus('todos');
                  setFiltroServico('');
                }}
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Leads ({leads.length})</CardTitle>
          <CardDescription>
            Lista de todos os leads recebidos através do formulário de contato
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Carregando leads...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lead encontrado</h3>
              <p className="text-gray-600">Não há leads que correspondam aos filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Nome</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Contato</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Empresa</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Serviço</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const StatusIcon = statusConfig[lead.status].icon;
                    return (
                      <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900">{lead.nome}</div>
                            <div className="text-sm text-gray-500">{origemLabels[lead.origem as keyof typeof origemLabels]}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div className="flex items-center text-gray-900">
                              <Mail className="w-4 h-4 mr-1" />
                              {lead.email}
                            </div>
                            <div className="flex items-center text-gray-500 mt-1">
                              <Phone className="w-4 h-4 mr-1" />
                              {lead.telefone}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900">{lead.empresa || '-'}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {lead.cidade}/{lead.estado}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">
                            {servicoLabels[lead.servico_interesse as keyof typeof servicoLabels]}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            disabled={isUpdating}
                            className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="novo">Novo</option>
                            <option value="contatado">Contatado</option>
                            <option value="qualificado">Qualificado</option>
                            <option value="convertido">Convertido</option>
                            <option value="perdido">Perdido</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(lead.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewLeadDetails(lead)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => createAccount(lead)}
                              disabled={lead.status === 'convertido'}
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      {showDetails && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Detalhes do Lead</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações Básicas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome</Label>
                      <p className="text-gray-900">{selectedLead.nome}</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p className="text-gray-900">{selectedLead.email}</p>
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <p className="text-gray-900">{selectedLead.telefone}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Badge className={statusConfig[selectedLead.status].color}>
                        {statusConfig[selectedLead.status].label}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Empresa */}
                {(selectedLead.empresa || selectedLead.cnpj) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Empresa</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedLead.empresa && (
                        <div>
                          <Label>Nome da Empresa</Label>
                          <p className="text-gray-900">{selectedLead.empresa}</p>
                        </div>
                      )}
                      {selectedLead.cnpj && (
                        <div>
                          <Label>CNPJ</Label>
                          <p className="text-gray-900">{selectedLead.cnpj}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Localização e Interesse */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Localização e Interesse</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Cidade/Estado</Label>
                      <p className="text-gray-900">{selectedLead.cidade}/{selectedLead.estado}</p>
                    </div>
                    <div>
                      <Label>Serviço de Interesse</Label>
                      <p className="text-gray-900">
                        {servicoLabels[selectedLead.servico_interesse as keyof typeof servicoLabels]}
                      </p>
                    </div>
                    <div>
                      <Label>Como nos conheceu</Label>
                      <p className="text-gray-900">
                        {origemLabels[selectedLead.origem as keyof typeof origemLabels]}
                      </p>
                    </div>
                    <div>
                      <Label>Data de Criação</Label>
                      <p className="text-gray-900">{formatDate(selectedLead.created_at)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Mensagem */}
                {selectedLead.mensagem && (
                  <div>
                    <Label>Mensagem</Label>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedLead.mensagem}</p>
                    </div>
                  </div>
                )}
                
                {/* Observações */}
                <div>
                  <Label htmlFor="observacoes">Observações Internas</Label>
                  <textarea
                    id="observacoes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Adicione observações sobre este lead..."
                  />
                </div>
                
                {/* Ações */}
                <div className="flex space-x-3 pt-4 border-t">
                  <Button
                    onClick={() => updateLeadStatus(selectedLead.id, selectedLead.status, observacoes)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Salvando...' : 'Salvar Observações'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => createAccount(selectedLead)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Criar Conta
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDetails(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}