import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Wallet, TestTube, History, Save, X } from 'lucide-react';
import { toast } from 'sonner'
import { subaccountService, type AsaasSubaccount, type ManualConfigData, type CredentialsAudit } from '@/services/subaccountService';
import { validateWalletId, validateApiKey } from '@/utils/credentialValidation';
import { useAuthStore } from '@/stores/authStore';

interface ManualSubaccountConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  subaccount: AsaasSubaccount | null;
  onSuccess?: () => void;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  response_time?: number;
  environment?: string;
}


export function ManualSubaccountConfigModal({
  isOpen,
  onClose,
  subaccount,
  onSuccess
}: ManualSubaccountConfigModalProps) {

  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    manual_wallet_id: '',
    manual_api_key: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [credentialsHistory, setCredentialsHistory] = useState<CredentialsAudit[]>([]);

  useEffect(() => {
    if (subaccount && isOpen) {
      setFormData({
        manual_wallet_id: (subaccount.manual_wallet_id || subaccount.wallet_id || ''),
        manual_api_key: '' // Sempre vazio por segurança
      });
      setTestResult(null);
      loadCredentialsHistory();
    }
  }, [subaccount, isOpen]);

  const loadCredentialsHistory = async () => {
    if (!subaccount?.id) return;
    
    try {
      const history = await subaccountService.getCredentialsHistory(subaccount.id);
      setCredentialsHistory(history);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTestResult(null); // Limpar resultado do teste ao alterar dados
  };

  const validateForm = () => {
    // Validar Wallet ID (sempre obrigatório)
    const walletValidation = validateWalletId(formData.manual_wallet_id);
    if (!walletValidation.isValid) {
      toast.error(walletValidation.message);
      return false;
    }

    // Validar API Key apenas se preenchida
    if (formData.manual_api_key && formData.manual_api_key.trim().length > 0) {
      const apiKeyValidation = validateApiKey(formData.manual_api_key);
      if (!apiKeyValidation.isValid) {
        toast.error(apiKeyValidation.message);
        return false;
      }
    }

    return true;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;
    if (!subaccount?.id) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await subaccountService.testManualConnectionWithCredentials(
        formData.manual_wallet_id,
        formData.manual_api_key
      );

      setTestResult({
        success: result.success,
        message: result.message,
        response_time: result.response_time,
        environment: result.environment
      });

      if (result.success) {
        toast.success('Conexão testada com sucesso!');
      } else {
        toast.error(result.message || 'Falha ao testar conexão');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!subaccount?.id) return;

    setIsLoading(true);

    try {
      const payload: Partial<ManualConfigData> = {
        manual_wallet_id: formData.manual_wallet_id.trim(),
        is_manual_config: true
      };
      if (formData.manual_api_key && formData.manual_api_key.trim().length > 0) {
        payload.manual_api_key = formData.manual_api_key;
      }

      const updated: AsaasSubaccount = await subaccountService.updateManualConfig(
        subaccount.id,
        payload as ManualConfigData,
        user?.id || 'dev-bypass'
      );

      const savedWallet = updated.manual_wallet_id || updated.wallet_id;
      if (savedWallet && savedWallet === formData.manual_wallet_id.trim()) {
        toast.success('Configuração manual salva com sucesso!');
        onSuccess?.();
        onClose();
      } else {
        toast.error('Wallet ID não foi atualizado.');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar configuração');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFast = async () => {
    if (!subaccount?.id) return;

    const walletValidation = validateWalletId(formData.manual_wallet_id);
    if (!walletValidation.isValid) {
      toast.error(walletValidation.message);
      return;
    }

    setIsLoading(true);

    try {
      const updated: AsaasSubaccount = await subaccountService.updateManualConfig(
        subaccount.id,
        { manual_wallet_id: formData.manual_wallet_id.trim(), is_manual_config: true },
        user?.id || 'dev-bypass'
      );

      const savedWallet = updated.manual_wallet_id || updated.wallet_id;
      if (savedWallet && savedWallet === formData.manual_wallet_id.trim()) {
        toast.success('Wallet salva com sucesso!');
        onSuccess?.();
        onClose();
      } else {
        toast.error('Wallet ID não foi atualizado.');
      }
    } catch (e) {
      console.error('[FAST SAVE] Erro:', e);
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar wallet (direto)');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentConfigType = () => {
    if (subaccount?.is_manual_config) {
      return { label: 'Manual', variant: 'secondary' as const };
    }
    return { label: 'Automática', variant: 'default' as const };
  };

  const configType = getCurrentConfigType();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Configuração Manual de Subconta
          </DialogTitle>
          <DialogDescription>
            Configure manualmente o Wallet ID e API Key para esta subconta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {subaccount && (
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Subconta</p>
                  <p className="text-sm text-muted-foreground">{subaccount.asaas_account_id}</p>
                </div>
                <Badge variant={configType.variant}>{configType.label}</Badge>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual_wallet_id" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Wallet ID
              </Label>
              <Input
                id="manual_wallet_id"
                value={formData.manual_wallet_id}
                onChange={(e) => handleInputChange('manual_wallet_id', e.target.value)}
                placeholder="Ex: acct_1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual_api_key" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Key (opcional)
              </Label>
              <Input
                id="manual_api_key"
                type="password"
                value={formData.manual_api_key}
                onChange={(e) => handleInputChange('manual_api_key', e.target.value)}
                placeholder="Ex: $aact_..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleTestConnection} disabled={isTesting || !formData.manual_wallet_id} variant="outline">
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Testar
              </Button>
            </div>

            {testResult && (
              <Alert variant={testResult.success ? 'default' : 'destructive'}>
                <AlertDescription className="flex items-center gap-2">
                  {testResult.success ? '✅' : '❌'}
                  <span>{testResult.message}</span>
                  {testResult.response_time && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {testResult.response_time}ms
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Histórico de Alterações</h4>
              <Button
                onClick={() => setShowHistory(!showHistory)}
                variant="outline"
                size="sm"
              >
                <History className="h-4 w-4 mr-2" />
                {showHistory ? 'Ocultar Histórico' : 'Mostrar Histórico'}
              </Button>
            </div>

            {showHistory && (
              <div className="bg-muted rounded-lg p-4 space-y-2">
                {credentialsHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
                ) : (
                  <ul className="space-y-2">
                    {credentialsHistory.map((item, idx) => (
                      <li key={idx} className="text-sm">
                        <span className="font-medium">{item.changed_at}</span> — {item.action} {item.field_name}
                        {item.user_email ? ` por ${item.user_email}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !formData.manual_wallet_id}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configuração
            </Button>
            <Button
              onClick={handleSaveFast}
              variant="secondary"
              disabled={isLoading || !formData.manual_wallet_id}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wallet className="h-4 w-4 mr-2" />
              )}
              Salvar (direto)
            </Button>
          </DialogFooter
          >
        </div>
      </DialogContent>
    </Dialog>
  );
}