import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';
import { Settings, DollarSign, Key, Shield, Plus, Edit, Trash2, Save, Eye, EyeOff } from 'lucide-react';
import { asaasService } from '../services/asaasService';
import { pricingService, PricingBase } from '../services/pricingService';

interface AsaasConfigLocal {
  id?: string;
  api_key_sandbox?: string;
  api_key_production?: string;
  environment: 'sandbox' | 'production';
  webhook_url?: string;
  webhook_token?: string;
  is_active: boolean;
}

const AsaasConfigPage: React.FC = () => {
  const [config, setConfig] = useState<AsaasConfigLocal>({
    environment: 'sandbox',
    is_active: true
  });
  const [basePrices, setBasePrices] = useState<PricingBase[]>([]);
  const [newPrice, setNewPrice] = useState({ resource_type: '', price: 0, description: '' });
  const [editingPrice, setEditingPrice] = useState<PricingBase | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSandboxKey, setShowSandboxKey] = useState(false);
  const [showProductionKey, setShowProductionKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error' | null>(null);

  useEffect(() => {
    loadConfig();
    loadBasePrices();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const configData = await asaasService.getConfig();
      if (configData) {
        setConfig({
          ...configData,
          api_key_sandbox: '',
          api_key_production: '',
          is_active: true
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configuração do Asaas');
    } finally {
      setLoading(false);
    }
  };

  const loadBasePrices = async () => {
    try {
      const prices = await pricingService.getBasePrices();
      setBasePrices(prices);
    } catch (error) {
      console.error('Erro ao carregar preços base:', error);
      toast.error('Erro ao carregar preços base');
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      
      // Convert local config to service config format
      const serviceConfig = {
        apiKey: config.environment === 'sandbox' ? config.api_key_sandbox || '' : config.api_key_production || '',
        environment: config.environment,
        webhookUrl: config.webhook_url
      };
      
      await asaasService.saveConfig(serviceConfig);
      toast.success('Configuração salva com sucesso!');
      await testConnection();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setConnectionStatus('checking');
      const accountInfo = await asaasService.getAccountInfo();
      if (accountInfo) {
        setConnectionStatus('connected');
        toast.success('Conexão com Asaas estabelecida com sucesso!');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error('Erro ao conectar com Asaas. Verifique as chaves API.');
    }
  };

  const addBasePrice = async () => {
    if (!newPrice.resource_type || newPrice.price <= 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await pricingService.createBasePrice({
        resource_type: newPrice.resource_type,
        price: newPrice.price,
        description: newPrice.description,
        is_active: true
      });
      
      setNewPrice({ resource_type: '', price: 0, description: '' });
      await loadBasePrices();
      toast.success('Preço base adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar preço base:', error);
      toast.error('Erro ao adicionar preço base');
    }
  };

  const updateBasePrice = async () => {
    if (!editingPrice) return;

    try {
      await pricingService.updateBasePrice(editingPrice.id, {
        resource_type: editingPrice.resource_type,
        price: editingPrice.price,
        description: editingPrice.description
      });
      
      setEditingPrice(null);
      await loadBasePrices();
      toast.success('Preço base atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar preço base:', error);
      toast.error('Erro ao atualizar preço base');
    }
  };

  const deleteBasePrice = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este preço base?')) return;

    try {
      await pricingService.deleteBasePrice(id);
      await loadBasePrices();
      toast.success('Preço base excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir preço base:', error);
      toast.error('Erro ao excluir preço base');
    }
  };

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'checking':
        return <Badge variant="secondary">Verificando...</Badge>;
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro de Conexão</Badge>;
      default:
        return <Badge variant="outline">Não Testado</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Configuração do Asaas</h1>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Configuração API
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Preços Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Configuração da API Asaas</span>
                {getConnectionStatusBadge()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Configure suas chaves API do Asaas. Use o ambiente Sandbox para testes e Produção para operações reais.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sandbox-key">Chave API Sandbox</Label>
                    <div className="relative">
                      <Input
                        id="sandbox-key"
                        type={showSandboxKey ? 'text' : 'password'}
                        value={config.api_key_sandbox || ''}
                        onChange={(e) => setConfig({ ...config, api_key_sandbox: e.target.value })}
                        placeholder="$aact_YTU5YjRlM2I5N2Vk..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowSandboxKey(!showSandboxKey)}
                      >
                        {showSandboxKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="production-key">Chave API Produção</Label>
                    <div className="relative">
                      <Input
                        id="production-key"
                        type={showProductionKey ? 'text' : 'password'}
                        value={config.api_key_production || ''}
                        onChange={(e) => setConfig({ ...config, api_key_production: e.target.value })}
                        placeholder="$aact_YTU5YjRlM2I5N2Vk..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowProductionKey(!showProductionKey)}
                      >
                        {showProductionKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhook-url">URL do Webhook</Label>
                    <Input
                      id="webhook-url"
                      value={config.webhook_url || ''}
                      onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                      placeholder="https://seudominio.com/webhook/asaas"
                    />
                  </div>

                  <div>
                    <Label htmlFor="webhook-token">Token do Webhook</Label>
                    <Input
                      id="webhook-token"
                      value={config.webhook_token || ''}
                      onChange={(e) => setConfig({ ...config, webhook_token: e.target.value })}
                      placeholder="Token de segurança"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="environment"
                  checked={config.environment === 'production'}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, environment: checked ? 'production' : 'sandbox' })
                  }
                />
                <Label htmlFor="environment">
                  Ambiente: {config.environment === 'production' ? 'Produção' : 'Sandbox'}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-active"
                  checked={config.is_active}
                  onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
                />
                <Label htmlFor="is-active">Configuração Ativa</Label>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveConfig} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configuração
                </Button>
                <Button variant="outline" onClick={testConnection} disabled={loading}>
                  <Shield className="h-4 w-4 mr-2" />
                  Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Novo Preço Base</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="resource-type">Tipo de Recurso</Label>
                    <Input
                      id="resource-type"
                      value={newPrice.resource_type}
                      onChange={(e) => setNewPrice({ ...newPrice, resource_type: e.target.value })}
                      placeholder="recurso_multa"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={newPrice.price}
                      onChange={(e) => setNewPrice({ ...newPrice, price: parseFloat(e.target.value) || 0 })}
                      placeholder="50.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={newPrice.description}
                      onChange={(e) => setNewPrice({ ...newPrice, description: e.target.value })}
                      placeholder="Descrição do serviço"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addBasePrice} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preços Base Configurados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {basePrices.map((price) => (
                    <div key={price.id} className="flex items-center justify-between p-4 border rounded-lg">
                      {editingPrice?.id === price.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                          <Input
                            value={editingPrice.resource_type}
                            onChange={(e) => setEditingPrice({ ...editingPrice, resource_type: e.target.value })}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={editingPrice.price}
                            onChange={(e) => setEditingPrice({ ...editingPrice, price: parseFloat(e.target.value) || 0 })}
                          />
                          <Input
                            value={editingPrice.description || ''}
                            onChange={(e) => setEditingPrice({ ...editingPrice, description: e.target.value })}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={updateBasePrice}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingPrice(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="font-medium">{price.resource_type}</div>
                            <div className="text-sm text-gray-500">{price.description}</div>
                          </div>
                          <div className="text-lg font-bold text-green-600">
                            R$ {price.price.toFixed(2)}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPrice(price)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteBasePrice(price.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  
                  {basePrices.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum preço base configurado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AsaasConfigPage;