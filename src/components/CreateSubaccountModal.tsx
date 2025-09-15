import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, Mail, Phone, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { subaccountService } from '@/services/subaccountService';

interface CompanyData {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone?: string;
}

interface CreateSubaccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyData | null;
  onSuccess: () => void;
}

interface SubaccountFormData {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone: string;
  birthDate: string;
}

export function CreateSubaccountModal({ isOpen, onClose, company, onSuccess }: CreateSubaccountModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [formData, setFormData] = useState<SubaccountFormData>({
    name: company?.nome || '',
    email: company?.email || '',
    cpfCnpj: company?.cnpj || '',
    mobilePhone: company?.telefone || '',
    birthDate: ''
  });

  // Atualizar dados do formulário quando a empresa mudar
  React.useEffect(() => {
    if (company) {
      setFormData({
        name: company.nome,
        email: company.email,
        cpfCnpj: company.cnpj,
        mobilePhone: company.telefone || '',
        birthDate: ''
      });
      setErrorMessage(''); // Limpar erro ao trocar de empresa
    }
  }, [company]);

  const handleInputChange = (field: keyof SubaccountFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar mensagem de erro quando usuário editar os dados
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const validateCpfCnpj = (cpfCnpj: string): boolean => {
    // Remove formatação
    const numbers = cpfCnpj.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos (CPF) ou 14 dígitos (CNPJ)
    if (numbers.length !== 11 && numbers.length !== 14) {
      return false;
    }
    
    // Verifica se não são todos números iguais
    if (/^(\d)\1+$/.test(numbers)) {
      return false;
    }
    
    return true;
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email é obrigatório');
      return false;
    }
    if (!formData.cpfCnpj.trim()) {
      toast.error('CPF/CNPJ é obrigatório');
      return false;
    }
    if (!formData.birthDate.trim()) {
      toast.error('Data de nascimento é obrigatória');
      return false;
    }
    if (!formData.email.includes('@')) {
      toast.error('Email deve ter um formato válido');
      return false;
    }
    if (!validateCpfCnpj(formData.cpfCnpj)) {
      toast.error('CPF/CNPJ deve ter um formato válido');
      return false;
    }
    return true;
  };

  const handleCreateSubaccount = async () => {
    if (!company) {
      toast.error('Dados da empresa não encontrados');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🚀 Iniciando criação de subconta para empresa:', company.nome);
      console.log('📋 Dados da subconta:', formData);
      
      await subaccountService.createSubaccount(company.id, {
        name: formData.name,
        email: formData.email,
        cpfCnpj: formData.cpfCnpj,
        mobilePhone: formData.mobilePhone,
        birthDate: formData.birthDate
      });

      console.log('✅ Subconta criada com sucesso!');
      toast.success('Subconta criada com sucesso no Asaas!');
      
      // Fechar modal e recarregar dados
      onClose();
      onSuccess();
      
    } catch (error) {
      console.error('❌ Erro ao criar subconta:', error);
      
      // Extrair mensagem de erro específica
      let errorMsg = 'Erro ao criar subconta. Tente novamente.';
      if (error instanceof Error) {
        errorMsg = error.message;
        
        // Personalizar mensagens de erro comuns
        if (errorMsg.toLowerCase().includes('email')) {
          if (errorMsg.toLowerCase().includes('já está em uso') || errorMsg.toLowerCase().includes('already exists')) {
            errorMsg = `O email ${formData.email} já está em uso. Tente com um email diferente.`;
          }
        }
      }
      
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!company) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Criar Subconta Asaas
          </DialogTitle>
          <DialogDescription>
            Confirme os dados da empresa <strong>{company.nome}</strong> para criar a subconta no Asaas.
            Você pode editar os dados se necessário.
          </DialogDescription>
        </DialogHeader>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm text-red-700">
                <p className="font-medium">Erro ao criar subconta:</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 py-4">
          {/* Nome da Empresa */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Nome da Empresa
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Nome da empresa"
              disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
              {errorMessage.toLowerCase().includes('email') && (
                <span className="text-red-500 text-xs ml-2">⚠️ Email em uso</span>
              )}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="email@empresa.com"
              disabled={isLoading}
              className={errorMessage.toLowerCase().includes('email') ? 'border-red-300 focus:border-red-500' : ''}
            />
            {errorMessage.toLowerCase().includes('email') && (
              <p className="text-xs text-red-600">
                💡 Sugestão: Tente adicionar números ou usar um domínio diferente (ex: {formData.email.replace('@', '+asaas@')})
              </p>
            )}
          </div>

          {/* CNPJ */}
          <div className="space-y-2">
            <Label htmlFor="cpfCnpj" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CPF/CNPJ
              {errorMessage.toLowerCase().includes('cpfcnpj') && (
                <span className="text-red-500 text-xs ml-2">⚠️ CPF/CNPJ inválido</span>
              )}
            </Label>
            <Input
              id="cpfCnpj"
              value={formData.cpfCnpj}
              onChange={(e) => handleInputChange('cpfCnpj', e.target.value)}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              disabled={isLoading}
              className={errorMessage.toLowerCase().includes('cpfcnpj') ? 'border-red-300 focus:border-red-500' : ''}
            />
            {errorMessage.toLowerCase().includes('cpfcnpj') && (
              <p className="text-xs text-red-600">
                💡 Sugestão: Verifique se o CPF/CNPJ está correto e não contém apenas números iguais
              </p>
            )}
          </div>

          {/* Data de Nascimento */}
          <div className="space-y-2">
            <Label htmlFor="birthDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data de Nascimento *
              {errorMessage.toLowerCase().includes('birthdate') && (
                <span className="text-red-500 text-xs ml-2">⚠️ Campo obrigatório</span>
              )}
            </Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
              disabled={isLoading}
              className={errorMessage.toLowerCase().includes('birthdate') ? 'border-red-300 focus:border-red-500' : ''}
            />
            <p className="text-xs text-gray-500">
              Data de nascimento do responsável pela empresa
            </p>
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="mobilePhone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telefone (Opcional)
            </Label>
            <Input
              id="mobilePhone"
              value={formData.mobilePhone}
              onChange={(e) => handleInputChange('mobilePhone', e.target.value)}
              placeholder="(11) 99999-9999"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateSubaccount}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Subconta'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}