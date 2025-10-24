import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Building2, RefreshCw, CheckCircle, XCircle, AlertCircle, Key, Users, Plus } from 'lucide-react';
import { subaccountService, type AsaasSubaccount } from '@/services/subaccountService';

import { companiesService } from '@/services/companiesService';
import { CreateSubaccountModal } from '@/components/CreateSubaccountModal';
import { ManualSubaccountConfigModal } from '@/components/ManualSubaccountConfigModal';

interface CompanyWithSubaccount {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone?: string;
  status: string;
  created_at: string;
  subconta?: AsaasSubaccount;
  hasSubaccount: boolean;
}

const SubcontasAdmin: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyWithSubaccount[]>([]);
  const [subaccounts, setSubaccounts] = useState<AsaasSubaccount[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('companies');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState<CompanyWithSubaccount | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManualConfigModal, setShowManualConfigModal] = useState(false);
  const [selectedSubaccount, setSelectedSubaccount] = useState<AsaasSubaccount | null>(null);

  // Form states
  const [newSubaccountData, setNewSubaccountData] = useState({
    company_id: '',
    name: '',
    email: '',
    cpfCnpj: '',
    mobilePhone: ''
  });



  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [companiesData, subaccountsData] = await Promise.all([
        companiesService.getCompanies(),
        subaccountService.listSubaccounts()
      ]);
      
      // Combinar empresas com suas subcontas
      const companiesWithSubaccounts: CompanyWithSubaccount[] = companiesData.map(company => {
        const subconta = subaccountsData.find(sub => sub.company_id === company.id);
        return {
          id: company.id,
          nome: company.nome,
          cnpj: company.cnpj,
          email: company.email,
          telefone: company.telefone || undefined,
          status: company.status,
          created_at: company.created_at,
          subconta,
          hasSubaccount: !!subconta
        };
      });
      
      setCompanies(companiesWithSubaccounts);
      setSubaccounts(subaccountsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubaccount = async () => {
    try {
      if (!newSubaccountData.company_id || !newSubaccountData.name || !newSubaccountData.email || !newSubaccountData.cpfCnpj) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      await subaccountService.createSubaccount(newSubaccountData.company_id, {
        name: newSubaccountData.name,
        email: newSubaccountData.email,
        cpfCnpj: newSubaccountData.cpfCnpj,
        birthDate: '1990-01-01', // Data padrão para empresas
        mobilePhone: newSubaccountData.mobilePhone
      });

      toast.success('Subconta criada com sucesso!');
      setShowCreateForm(false);
      setSelectedCompany(null);
      setNewSubaccountData({
        company_id: '',
        name: '',
        email: '',
        cpfCnpj: '',
        mobilePhone: ''
      });
      loadData();
    } catch (error) {
      console.error('Erro ao criar subconta:', error);
      toast.error('Erro ao criar subconta');
    }
  };

  const handleCreateSubaccountForCompany = (company: CompanyWithSubaccount) => {
    setSelectedCompany(company);
    setShowCreateModal(true);
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setSelectedCompany(null);
  };

  const handleModalSuccess = () => {
    loadData(); // Recarregar dados após sucesso
  };

  const handleManualConfig = (subaccount: AsaasSubaccount) => {
    setSelectedSubaccount(subaccount);
    setShowManualConfigModal(true);
  };

  const handleManualConfigClose = () => {
    setShowManualConfigModal(false);
    setSelectedSubaccount(null);
  };

  const handleManualConfigSuccess = () => {
    loadData(); // Recarregar dados após sucesso
    handleManualConfigClose();
  };

  const getConfigTypeBadge = (isManual: boolean) => {
    return (
      <Badge variant={isManual ? 'secondary' : 'default'} className="text-xs">
        {isManual ? 'Manual' : 'Automática'}
      </Badge>
    );
  };



  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      suspended: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status === 'active' ? 'Ativa' : status === 'inactive' ? 'Inativa' : 'Suspensa'}
      </Badge>
    );
  };

  const getAccountTypeBadge = (type: string) => {
    return (
      <Badge variant={type === 'subadquirente' ? 'default' : 'outline'}>
        {type === 'subadquirente' ? 'Subadquirente' : 'Despachante'}
      </Badge>
    );
  };

  const getAccountOriginBadge = (origin?: 'system' | 'external') => {
    if (!origin) return null;
    const label = origin === 'system' ? 'ACMS (sem acesso do cliente)' : 'Externa (cliente pode ter acesso)';
    const variant: 'default' | 'secondary' = origin === 'system' ? 'default' : 'secondary';
    return (
      <Badge variant={variant} className="text-xs">
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Administração de Subcontas</h1>
          <p className="text-muted-foreground">Gerencie subcontas Asaas e configurações de split</p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button 
            variant={activeTab === 'companies' ? 'default' : 'outline'}
            onClick={() => setActiveTab('companies')}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Empresas & Subcontas
          </Button>
          <Button 
            variant={activeTab === 'subaccounts' ? 'default' : 'outline'}
            onClick={() => setActiveTab('subaccounts')}
          >
            <Users className="h-4 w-4 mr-2" />
            Subcontas
          </Button>

        </div>

        {activeTab === 'companies' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Empresas & Status de Subcontas</CardTitle>
                    <CardDescription>
                      Visualize todas as empresas e o status de suas subcontas Asaas
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {companies.filter(c => c.hasSubaccount).length} com subconta
                    </Badge>
                    <Badge variant="outline" className="text-red-600">
                      <XCircle className="h-3 w-3 mr-1" />
                      {companies.filter(c => !c.hasSubaccount).length} sem subconta
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma empresa encontrada
                    </div>
                  ) : (
                    companies.map((company) => (
                      <div key={company.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-lg">{company.nome}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span>CNPJ: {company.cnpj}</span>
                              <span>Email: {company.email}</span>
                              {company.telefone && <span>Tel: {company.telefone}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {company.hasSubaccount ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Subconta Criada
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Sem Subconta
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {company.hasSubaccount && company.subconta ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Configuração:</span>
                                {getConfigTypeBadge(company.subconta.is_manual_config || false)}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleManualConfig(company.subconta!)}
                                className="flex items-center gap-2"
                              >
                                <Key className="h-3 w-3" />
                                Configurar Manualmente
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium">ID Asaas:</span>
                                <p className="text-muted-foreground font-mono">{company.subconta.asaas_account_id}</p>
                              </div>
                              <div>
                                <span className="font-medium">Wallet ID:</span>
                                <p className="text-muted-foreground font-mono">{(() => {
                                  const id = company.subconta.manual_wallet_id || company.subconta.wallet_id;
                                  if (!id) return 'Não configurado';
                                  const prefix = id.slice(0, 6);
                                  const suffix = id.slice(-6);
                                  return `${prefix}•••${suffix}`;
                                })()}</p>
                              </div>
                              <div>
                                <span className="font-medium">Tipo:</span>
                                <p className="text-muted-foreground">{company.subconta.account_type}</p>
                              </div>
                              <div>
                                <span className="font-medium">Status:</span>
                                <p className="text-muted-foreground">{company.subconta.status}</p>
                              </div>
                            </div>
                            {company.subconta.is_manual_config && (
                              <div className="mt-3 pt-3 border-t border-green-200">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>
                                    Wallet ID Manual: {(() => {
                                      const id = company.subconta.manual_wallet_id;
                                      if (!id) return 'Não configurado';
                                      const prefix = id.slice(0, 6);
                                      const suffix = id.slice(-6);
                                      return `${prefix}•••${suffix}`;
                                    })()}
                                  </span>
                                  <span>
                                    Última atualização: {company.subconta.credentials_updated_at ?
                                      new Date(company.subconta.credentials_updated_at).toLocaleDateString('pt-BR') :
                                      'Nunca'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-red-700">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">Subconta não foi criada automaticamente</span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleCreateSubaccountForCompany(company)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Criar Subconta
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Empresa criada em: {new Date(company.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'subaccounts' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Subcontas Asaas</CardTitle>
                    <CardDescription>
                      Gerencie as subcontas criadas no Asaas para empresas e despachantes
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {showCreateForm ? 'Cancelar' : 'Nova Subconta'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subaccounts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma subconta encontrada
                    </div>
                  ) : (
                    subaccounts.map((subaccount) => (
                      <div key={subaccount.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{subaccount.company_id}</h3>
                            <p className="text-sm text-muted-foreground font-mono">{subaccount.wallet_id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getConfigTypeBadge(Boolean(subaccount.is_manual_config))}
                            {getAccountTypeBadge(subaccount.account_type)}
                            {getAccountOriginBadge(subaccount.account_origin as 'system' | 'external')}
                            {getStatusBadge(subaccount.status)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Criada em: {new Date(subaccount.created_at!).toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleManualConfig(subaccount)}
                              className="flex items-center gap-2"
                            >
                              <Key className="h-3 w-3" />
                              Config Manual
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toast.info('Funcionalidade de sincronização em desenvolvimento')}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Sincronizar
                            </Button>
                          </div>
                        </div>
                        {subaccount.is_manual_config && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Configuração Manual</span>
                              <span>
                                Última atualização: {subaccount.credentials_updated_at ? 
                                  new Date(subaccount.credentials_updated_at).toLocaleDateString('pt-BR') : 
                                  'Nunca'
                                }
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            {showCreateForm && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedCompany ? `Criar Subconta para ${selectedCompany.nome}` : 'Criar Nova Subconta'}
                  </CardTitle>
                  <CardDescription>
                    {selectedCompany 
                      ? `Criando subconta Asaas para a empresa ${selectedCompany.nome} (${selectedCompany.cnpj})`
                      : 'Crie uma nova subconta no Asaas para uma empresa'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="companyId">ID da Empresa</Label>
                    <Input
                      id="companyId"
                      value={newSubaccountData.company_id}
                      onChange={(e) => setNewSubaccountData(prev => ({ ...prev, company_id: e.target.value }))}
                      placeholder="ID da empresa"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome da Empresa *</Label>
                      <Input
                        id="name"
                        value={newSubaccountData.name}
                        onChange={(e) => setNewSubaccountData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome da empresa"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newSubaccountData.email}
                        onChange={(e) => setNewSubaccountData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@empresa.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
                      <Input
                        id="cpfCnpj"
                        value={newSubaccountData.cpfCnpj}
                        onChange={(e) => setNewSubaccountData(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mobilePhone">Telefone</Label>
                      <Input
                        id="mobilePhone"
                        value={newSubaccountData.mobilePhone}
                        onChange={(e) => setNewSubaccountData(prev => ({ ...prev, mobilePhone: e.target.value }))}
                        placeholder="(47) 99999-9999"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateSubaccount}>
                      Criar Subconta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}


      </div>
      
      {/* Modal de criação de subconta */}
      <CreateSubaccountModal
        isOpen={showCreateModal}
        onClose={handleModalClose}
        company={selectedCompany}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de configuração manual */}
      <ManualSubaccountConfigModal
        isOpen={showManualConfigModal}
        onClose={handleManualConfigClose}
        subaccount={selectedSubaccount}
        onSuccess={handleManualConfigSuccess}
      />
    </div>
  );
};

export default SubcontasAdmin;