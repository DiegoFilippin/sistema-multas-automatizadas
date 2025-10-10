import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Textarea component not available, will use Input with multiline
import { Badge } from '@/components/ui/badge';
// ScrollArea and Separator components not available, will use div with overflow
import { Copy, Play, Trash2, Download, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { asaasService } from '@/services/asaasService';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'request' | 'response' | 'error';
  method: string;
  url: string;
  data?: any;
  status?: number;
  duration?: number;
}

interface TestConfig {
  name: string;
  method: string;
  endpoint: string;
  headers: Record<string, string>;
  body: any;
}

const AsaasTestInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState('customer');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [requestData, setRequestData] = useState<any>({});
  const [responseData, setResponseData] = useState<any>(null);
  const [rawMode, setRawMode] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<TestConfig[]>([]);

  // Configurações padrão para cada tipo de teste
  const defaultConfigs = {
    customer: {
      name: 'João Silva',
      email: 'joao.silva@email.com',
      phone: '4738010919',
      mobilePhone: '47998781877',
      cpfCnpj: '11144477735',
      postalCode: '01310100',
      address: 'Av. Paulista',
      addressNumber: '1000',
      complement: 'Apto 101',
      province: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil'
    },
    payment: {
      customer: '',
      billingType: 'BOLETO',
      value: 100.00,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: 'Cobrança de teste',
      externalReference: 'TEST-001'
    },
    subscription: {
      customer: '',
      billingType: 'BOLETO',
      value: 50.00,
      nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      cycle: 'MONTHLY',
      description: 'Assinatura de teste'
    }
  };

  const [formData, setFormData] = useState(defaultConfigs);

  useEffect(() => {
    // Carregar configurações salvas do localStorage
    const saved = localStorage.getItem('asaas-test-configs');
    if (saved) {
      setSavedConfigs(JSON.parse(saved));
    }
  }, []);

  const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const executeTest = async (testType: string) => {
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      let result;
      let requestPayload;
      let method = 'POST';
      let endpoint = '';

      switch (testType) {
        case 'customer':
          requestPayload = formData.customer;
          endpoint = '/customers';
          addLog({
            type: 'request',
            method,
            url: endpoint,
            data: requestPayload
          });
          result = await asaasService.createCustomer(requestPayload);
          break;

        case 'payment':
          requestPayload = formData.payment;
          endpoint = '/payments';
          addLog({
            type: 'request',
            method,
            url: endpoint,
            data: requestPayload
          });
          result = await asaasService.createPayment(requestPayload);
          break;

        case 'subscription':
          requestPayload = formData.subscription;
          endpoint = '/subscriptions';
          addLog({
            type: 'request',
            method,
            url: endpoint,
            data: requestPayload
          });
          result = await asaasService.createSubscription(requestPayload);
          break;

        default:
          throw new Error('Tipo de teste não suportado');
      }

      const duration = Date.now() - startTime;
      setResponseData(result);
      setRequestData(requestPayload);

      addLog({
        type: 'response',
        method,
        url: endpoint,
        data: result,
        status: 200,
        duration
      });

      toast.success(`${testType} executado com sucesso!`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Extrair detalhes do erro da API Asaas
      let errorDetails = error.message;
      let errorData = { error: error.message };
      
      // Se o erro contém informações estruturadas da API
      if (error.response && error.response.data && error.response.data.errors) {
        const apiErrors = error.response.data.errors;
        errorDetails = apiErrors.map((err: any) => `${err.code}: ${err.description}`).join(', ');
        errorData = { 
          error: error.message,
          details: errorDetails
        } as any;
      }
      
      const testEndpoint = testType === 'customer' ? '/customers' : 
                          testType === 'payment' ? '/payments' : '/subscriptions';
      
      addLog({
        type: 'error',
        method: 'POST',
        url: testEndpoint,
        data: errorData,
        status: error.status || 400,
        duration
      });
      
      setResponseData(errorData);
      toast.error(`Erro ao executar ${testType}: ${errorDetails}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Copiado para a área de transferência!');
  };

  const generateCurl = (testType: string) => {
    const config = formData[testType as keyof typeof formData];
    const endpoint = testType === 'customer' ? '/customers' : 
                    testType === 'payment' ? '/payments' : '/subscriptions';
    
    const curl = `curl -X POST \\
  'https://sandbox.asaas.com/api/v3${endpoint}' \\
  -H 'access_token: YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(config, null, 2)}'`;
    
    copyToClipboard(curl);
    toast.success('Comando cURL copiado!');
  };

  const saveConfig = (name: string) => {
    const config: TestConfig = {
      name,
      method: 'POST',
      endpoint: activeTab,
      headers: { 'Content-Type': 'application/json' },
      body: formData[activeTab as keyof typeof formData]
    };
    
    const updated = [...savedConfigs, config];
    setSavedConfigs(updated);
    localStorage.setItem('asaas-test-configs', JSON.stringify(updated));
    toast.success('Configuração salva!');
  };

  const loadConfig = (config: TestConfig) => {
    setFormData(prev => ({
      ...prev,
      [config.endpoint]: config.body
    }));
    setActiveTab(config.endpoint);
    toast.success('Configuração carregada!');
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab as keyof typeof prev],
        [field]: value
      }
    }));
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Interface de Testes Asaas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="customer">Cliente</TabsTrigger>
              <TabsTrigger value="payment">Cobrança</TabsTrigger>
              <TabsTrigger value="subscription">Assinatura</TabsTrigger>
            </TabsList>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Painel de Configuração */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Configuração</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRawMode(!rawMode)}
                    >
                      {rawMode ? 'Formulário' : 'JSON Raw'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateCurl(activeTab)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      cURL
                    </Button>
                  </div>
                </div>

                {/* Formulário para Cliente */}
                <TabsContent value="customer" className="mt-0">
                  <Card>
                    <CardContent className="pt-6">
                      {rawMode ? (
                        <div className="space-y-4">
                          <Label>JSON Raw</Label>
                          <textarea
                            value={JSON.stringify(formData.customer, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                setFormData(prev => ({ ...prev, customer: parsed }));
                              } catch (error) {
                                // Ignore invalid JSON while typing
                              }
                            }}
                            className="w-full font-mono text-sm h-64 p-3 border border-input rounded-md bg-background"
                            placeholder="Cole ou edite o JSON aqui..."
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                              id="name"
                              value={formData.customer.name}
                              onChange={(e) => updateFormData('name', e.target.value)}
                              placeholder="João Silva"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.customer.email}
                              onChange={(e) => updateFormData('email', e.target.value)}
                              placeholder="joao@email.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
                            <Input
                              id="cpfCnpj"
                              value={formData.customer.cpfCnpj}
                              onChange={(e) => updateFormData('cpfCnpj', e.target.value)}
                              placeholder="11144477735"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                              id="phone"
                              value={formData.customer.phone}
                              onChange={(e) => updateFormData('phone', e.target.value)}
                              placeholder="11999999999"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="mobilePhone">Celular</Label>
                            <Input
                              id="mobilePhone"
                              value={formData.customer.mobilePhone}
                              onChange={(e) => updateFormData('mobilePhone', e.target.value)}
                              placeholder="11999999999"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="postalCode">CEP</Label>
                            <Input
                              id="postalCode"
                              value={formData.customer.postalCode}
                              onChange={(e) => updateFormData('postalCode', e.target.value)}
                              placeholder="01310100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="address">Endereço</Label>
                            <Input
                              id="address"
                              value={formData.customer.address}
                              onChange={(e) => updateFormData('address', e.target.value)}
                              placeholder="Av. Paulista"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="addressNumber">Número</Label>
                            <Input
                              id="addressNumber"
                              value={formData.customer.addressNumber}
                              onChange={(e) => updateFormData('addressNumber', e.target.value)}
                              placeholder="1000"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="complement">Complemento</Label>
                            <Input
                              id="complement"
                              value={formData.customer.complement}
                              onChange={(e) => updateFormData('complement', e.target.value)}
                              placeholder="Apto 101"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="province">Bairro</Label>
                            <Input
                              id="province"
                              value={formData.customer.province}
                              onChange={(e) => updateFormData('province', e.target.value)}
                              placeholder="Bela Vista"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="city">Cidade</Label>
                            <Input
                              id="city"
                              value={formData.customer.city}
                              onChange={(e) => updateFormData('city', e.target.value)}
                              placeholder="São Paulo"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="state">Estado</Label>
                            <Input
                              id="state"
                              value={formData.customer.state}
                              onChange={(e) => updateFormData('state', e.target.value)}
                              placeholder="SP"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Formulário para Cobrança */}
                <TabsContent value="payment" className="mt-0">
                  <Card>
                    <CardContent className="pt-6">
                      {rawMode ? (
                        <div className="space-y-4">
                          <Label>JSON Raw</Label>
                          <textarea
                            value={JSON.stringify(formData.payment, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                setFormData(prev => ({ ...prev, payment: parsed }));
                              } catch (error) {
                                // Ignore invalid JSON while typing
                              }
                            }}
                            className="w-full font-mono text-sm h-64 p-3 border border-input rounded-md bg-background"
                            placeholder="Cole ou edite o JSON aqui..."
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="customer">ID do Cliente</Label>
                            <Input
                              id="customer"
                              value={formData.payment.customer}
                              onChange={(e) => updateFormData('customer', e.target.value)}
                              placeholder="cus_000005492364"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="billingType">Tipo de Cobrança *</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                              value={formData.payment.billingType}
                              onChange={(e) => updateFormData('billingType', e.target.value)}
                            >
                              <option value="BOLETO">Boleto</option>
                              <option value="CREDIT_CARD">Cartão de Crédito</option>
                              <option value="DEBIT_CARD">Cartão de Débito</option>
                              <option value="PIX">PIX</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="value">Valor *</Label>
                            <Input
                              id="value"
                              type="number"
                              step="0.01"
                              value={formData.payment.value}
                              onChange={(e) => updateFormData('value', parseFloat(e.target.value))}
                              placeholder="100.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="dueDate">Data de Vencimento *</Label>
                            <Input
                              id="dueDate"
                              type="date"
                              value={formData.payment.dueDate}
                              onChange={(e) => updateFormData('dueDate', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Input
                              id="description"
                              value={formData.payment.description}
                              onChange={(e) => updateFormData('description', e.target.value)}
                              placeholder="Cobrança de teste"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="externalReference">Referência Externa</Label>
                            <Input
                              id="externalReference"
                              value={formData.payment.externalReference}
                              onChange={(e) => updateFormData('externalReference', e.target.value)}
                              placeholder="TEST-001"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Formulário para Assinatura */}
                <TabsContent value="subscription" className="mt-0">
                  <Card>
                    <CardContent className="pt-6">
                      {rawMode ? (
                        <div className="space-y-4">
                          <Label>JSON Raw</Label>
                          <textarea
                            value={JSON.stringify(formData.subscription, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                setFormData(prev => ({ ...prev, subscription: parsed }));
                              } catch (error) {
                                // Ignore invalid JSON while typing
                              }
                            }}
                            className="w-full font-mono text-sm h-64 p-3 border border-input rounded-md bg-background"
                            placeholder="Cole ou edite o JSON aqui..."
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="customer">ID do Cliente</Label>
                            <Input
                              id="customer"
                              value={formData.subscription.customer}
                              onChange={(e) => updateFormData('customer', e.target.value)}
                              placeholder="cus_000005492364"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="billingType">Tipo de Cobrança *</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                              value={formData.subscription.billingType}
                              onChange={(e) => updateFormData('billingType', e.target.value)}
                            >
                              <option value="BOLETO">Boleto</option>
                              <option value="CREDIT_CARD">Cartão de Crédito</option>
                              <option value="DEBIT_CARD">Cartão de Débito</option>
                              <option value="PIX">PIX</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="value">Valor *</Label>
                            <Input
                              id="value"
                              type="number"
                              step="0.01"
                              value={formData.subscription.value}
                              onChange={(e) => updateFormData('value', parseFloat(e.target.value))}
                              placeholder="50.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="nextDueDate">Próximo Vencimento *</Label>
                            <Input
                              id="nextDueDate"
                              type="date"
                              value={formData.subscription.nextDueDate}
                              onChange={(e) => updateFormData('nextDueDate', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cycle">Ciclo *</Label>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                              value={formData.subscription.cycle}
                              onChange={(e) => updateFormData('cycle', e.target.value)}
                            >
                              <option value="WEEKLY">Semanal</option>
                              <option value="BIWEEKLY">Quinzenal</option>
                              <option value="MONTHLY">Mensal</option>
                              <option value="QUARTERLY">Trimestral</option>
                              <option value="SEMIANNUALLY">Semestral</option>
                              <option value="YEARLY">Anual</option>
                            </select>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Input
                              id="description"
                              value={formData.subscription.description}
                              onChange={(e) => updateFormData('description', e.target.value)}
                              placeholder="Assinatura de teste"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <div className="flex gap-2">
                  <Button
                    onClick={() => executeTest(activeTab)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isLoading ? 'Executando...' : 'Executar Teste'}
                  </Button>
                </div>

                {/* Configurações Salvas */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Configurações Salvas</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const name = prompt('Nome da configuração:');
                          if (name) saveConfig(name);
                        }}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Salvar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 overflow-auto">
                      {savedConfigs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma configuração salva</p>
                      ) : (
                        <div className="space-y-2">
                          {savedConfigs.map((config, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="text-sm font-medium">{config.name}</p>
                                <p className="text-xs text-muted-foreground">{config.endpoint}</p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => loadConfig(config)}
                                >
                                  <Upload className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updated = savedConfigs.filter((_, i) => i !== index);
                                    setSavedConfigs(updated);
                                    localStorage.setItem('asaas-test-configs', JSON.stringify(updated));
                                    toast.success('Configuração removida!');
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Painel de Request */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Request</h3>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">POST</Badge>
                        <span className="text-sm font-mono">
                          {activeTab === 'customer' ? '/customers' : 
                           activeTab === 'payment' ? '/payments' : '/subscriptions'}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(formData[activeTab as keyof typeof formData])}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Headers</Label>
                        <div className="bg-muted p-2 rounded text-xs font-mono">
                          Content-Type: application/json<br/>
                          access_token: ••••••••••••••••
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Body</Label>
                        <div className="h-48 overflow-auto">
                          <pre className="text-xs bg-muted p-2 rounded">
                            {JSON.stringify(formData[activeTab as keyof typeof formData], null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Painel de Response */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Response</h3>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={responseData?.error ? 'destructive' : 'default'}>
                          {responseData?.error ? 'ERROR' : 'SUCCESS'}
                        </Badge>
                        {responseData && (
                          <span className="text-sm text-muted-foreground">
                            {new Date().toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      {responseData && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(responseData)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 overflow-auto">
                      <pre className="text-sm">
                        {responseData ? JSON.stringify(responseData, null, 2) : 'Nenhuma resposta ainda'}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Console de Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Console de Logs</CardTitle>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-auto">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum log ainda</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="border rounded p-3 text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={log.type === 'error' ? 'destructive' : 
                                  log.type === 'request' ? 'secondary' : 'default'}
                        >
                          {log.type.toUpperCase()}
                        </Badge>
                        <span className="font-mono">{log.method} {log.url}</span>
                        {log.status && (
                          <Badge variant={log.status >= 400 ? 'destructive' : 'default'}>
                            {log.status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {log.duration && <span>{log.duration}ms</span>}
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                    {log.data && (
                      <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AsaasTestInterface;