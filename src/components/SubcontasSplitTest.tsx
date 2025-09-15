import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calculator, CreditCard, Building2, Users, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { asaasService } from '@/services/asaasService';
import { splitService } from '@/services/splitService';
import { subaccountService } from '@/services/subaccountService';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
}

const SubcontasSplitTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [paymentData, setPaymentData] = useState({
    amount: 100.00,
    serviceType: 'recurso',
    despachanteCompanyId: '',
    customerName: 'Cliente Teste',
    customerEmail: 'teste@exemplo.com',
    customerCpf: '11144477735'
  });

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testSplitCalculation = async () => {
    try {
      setLoading(true);
      addTestResult({ success: true, message: '🧮 Iniciando teste de cálculo de splits...' });

      // Teste 1: Calcular splits para recurso
      const splits = await splitService.calculateSplits(
        paymentData.amount,
        paymentData.serviceType,
        'leve', // tipo de multa
        paymentData.despachanteCompanyId || 'test-company-id'
      );

      addTestResult({
        success: true,
        message: `✅ Splits calculados com sucesso`,
        data: {
          totalAmount: paymentData.amount,
          splits: splits.map(split => ({
            recipient: split.recipient_type,
            percentage: split.split_percentage,
            amount: split.split_amount
          }))
        }
      });

      // Validar se splits estão corretos
      const isValid = splitService.validateSplits(splits, paymentData.amount);
      addTestResult({
        success: isValid,
        message: isValid ? '✅ Validação de splits passou' : '❌ Validação de splits falhou'
      });

    } catch (error) {
      addTestResult({
        success: false,
        message: `❌ Erro no teste de splits: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const testSplitConfigurations = async () => {
    try {
      setLoading(true);
      addTestResult({ success: true, message: '⚙️ Testando configurações de split...' });

      // Listar configurações existentes
      const configs = await splitService.listSplitConfigurations();
      addTestResult({
        success: true,
        message: `📋 Encontradas ${configs.length} configurações de split`,
        data: configs
      });

      // Teste de criação/atualização de configuração
      const testConfig = {
        service_type: 'teste_split',
        acsm_percentage: 25.00,
        icetran_percentage: 25.00,
        despachante_percentage: 50.00
      };

      const newConfig = await splitService.upsertSplitConfiguration(testConfig);
      addTestResult({
        success: true,
        message: '✅ Configuração de teste criada/atualizada com sucesso',
        data: newConfig
      });

    } catch (error) {
      addTestResult({
        success: false,
        message: `❌ Erro no teste de configurações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const testAsaasIntegration = async () => {
    try {
      setLoading(true);
      addTestResult({ success: true, message: '🔗 Testando integração com Asaas...' });

      // Teste de conexão
      const connectionTest = await asaasService.testConnection();
      addTestResult({
        success: connectionTest.success,
        message: connectionTest.success 
          ? '✅ Conexão com Asaas estabelecida' 
          : `❌ Falha na conexão: ${connectionTest.error}`
      });

      if (!connectionTest.success) {
        return;
      }

      // Criar cliente de teste
      const testCustomer = await asaasService.createTestCustomer();
      addTestResult({
        success: true,
        message: '✅ Cliente de teste criado no Asaas',
        data: { customerId: testCustomer.id, name: testCustomer.name }
      });

      // Simular criação de pagamento com split
      const paymentWithSplit = {
        customer: testCustomer.id!,
        billingType: 'BOLETO' as const,
        value: paymentData.amount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: `Teste de pagamento com split - ${paymentData.serviceType}`,
        externalReference: `teste-split-${Date.now()}`
      };

      // Nota: Este teste não cria o pagamento real, apenas simula
      addTestResult({
        success: true,
        message: '✅ Estrutura de pagamento com split preparada',
        data: {
          payment: paymentWithSplit,
          serviceType: paymentData.serviceType,
          companyId: paymentData.despachanteCompanyId || 'test-company-id'
        }
      });

    } catch (error) {
      addTestResult({
        success: false,
        message: `❌ Erro no teste de integração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const testSubaccountOperations = async () => {
    try {
      setLoading(true);
      addTestResult({ success: true, message: '🏢 Testando operações de subcontas...' });

      // Listar subcontas existentes
      const subaccounts = await subaccountService.listSubaccounts();
      addTestResult({
        success: true,
        message: `📋 Encontradas ${subaccounts.length} subcontas`,
        data: subaccounts.map(sub => ({
          id: sub.id,
          company_id: sub.company_id,
          account_type: sub.account_type,
          status: sub.status,
          wallet_id: sub.wallet_id
        }))
      });

      // Teste de hierarquia (se houver subconta)
      if (subaccounts.length > 0) {
        try {
          const hierarchy = await subaccountService.getCompanyHierarchy(subaccounts[0].company_id);
          addTestResult({
            success: true,
            message: '✅ Hierarquia de empresa obtida com sucesso',
            data: hierarchy
          });
        } catch (hierarchyError) {
          addTestResult({
            success: false,
            message: `⚠️ Erro ao obter hierarquia: ${hierarchyError instanceof Error ? hierarchyError.message : 'Erro desconhecido'}`
          });
        }
      }

    } catch (error) {
      addTestResult({
        success: false,
        message: `❌ Erro no teste de subcontas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    clearResults();
    addTestResult({ success: true, message: '🚀 Iniciando bateria completa de testes...' });
    
    await testSplitConfigurations();
    await testSplitCalculation();
    await testSubaccountOperations();
    await testAsaasIntegration();
    
    addTestResult({ success: true, message: '🏁 Todos os testes concluídos!' });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teste do Sistema de Subcontas e Splits</h1>
          <p className="text-muted-foreground">Teste todas as funcionalidades do sistema de divisão de pagamentos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações de Teste */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Configurações de Teste
            </CardTitle>
            <CardDescription>
              Configure os parâmetros para os testes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Valor do Pagamento (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="serviceType">Tipo de Serviço</Label>
                <Input
                  id="serviceType"
                  value={paymentData.serviceType}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, serviceType: e.target.value }))}
                  placeholder="recurso ou assinatura_acompanhamento"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="companyId">ID da Empresa Despachante</Label>
              <Input
                id="companyId"
                value={paymentData.despachanteCompanyId}
                onChange={(e) => setPaymentData(prev => ({ ...prev, despachanteCompanyId: e.target.value }))}
                placeholder="Deixe vazio para usar ID de teste"
              />
            </div>

            <div className="border-t my-4" />

            <div className="grid grid-cols-2 gap-4">
              <Button onClick={testSplitCalculation} disabled={loading} variant="outline">
                <Calculator className="h-4 w-4 mr-2" />
                Testar Cálculo
              </Button>
              <Button onClick={testSplitConfigurations} disabled={loading} variant="outline">
                <Building2 className="h-4 w-4 mr-2" />
                Testar Configs
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={testSubaccountOperations} disabled={loading} variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Testar Subcontas
              </Button>
              <Button onClick={testAsaasIntegration} disabled={loading} variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Testar Asaas
              </Button>
            </div>

            <Button onClick={runAllTests} disabled={loading} className="w-full">
              <DollarSign className="h-4 w-4 mr-2" />
              Executar Todos os Testes
            </Button>

            {testResults.length > 0 && (
              <Button onClick={clearResults} variant="ghost" className="w-full">
                Limpar Resultados
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Resultados dos Testes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Resultados dos Testes
            </CardTitle>
            <CardDescription>
              Acompanhe o progresso e resultados dos testes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum teste executado ainda
                </div>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="flex-shrink-0 mt-0.5">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        result.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {result.message}
                      </p>
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver detalhes
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo das Configurações Atuais */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Configuração de Teste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">R$ {paymentData.amount.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Valor Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {paymentData.serviceType === 'recurso' ? '30%' : '40%'}
              </div>
              <div className="text-sm text-muted-foreground">ACSM</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {paymentData.serviceType === 'recurso' ? '20%' : '15%'}
              </div>
              <div className="text-sm text-muted-foreground">ICETRAN</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {paymentData.serviceType === 'recurso' ? '50%' : '45%'}
              </div>
              <div className="text-sm text-muted-foreground">Despachante</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubcontasSplitTest;