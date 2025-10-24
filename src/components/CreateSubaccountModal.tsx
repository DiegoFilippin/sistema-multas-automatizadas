import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, Mail, Phone, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { subaccountService } from '@/services/subaccountService';
import { parseEndereco } from '@/lib/endereco';

// Tipos permitidos pelo Asaas
const ALLOWED_COMPANY_TYPES = ["LIMITED", "INDIVIDUAL", "ASSOCIATION", "MEI"] as const;
type CompanyType = typeof ALLOWED_COMPANY_TYPES[number];

interface CompanyData {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone?: string;
  endereco?: string;
}

interface CreateSubaccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyData | null;
  onSuccess: () => void;
}

interface AddressData {
  postalCode: string;
  address: string;
  addressNumber: string;
  complement: string;
  province: string;
  city: string;
  state: string;
}

interface SubaccountFormData {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone: string;
  birthDate: string;
  companyType: CompanyType;
  address: AddressData;
}

function parseCompanyAddress(endereco?: string): Partial<AddressData> {
  const result: Partial<AddressData> = {};
  if (!endereco) return result;

  try {
    const parsed = parseEndereco(endereco);
    const primeiraParte = parsed.endereco || '';
    const normalized = primeiraParte
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s+-\s+/g, ' - ')
      .replace(/\s+/g, ' ')
      .trim();

    const tokens = normalized.split(/,|-/).map(t => t.trim()).filter(Boolean);

    const complementKeywords = /(apto|apartamento|bloco|fundos|casa|sobrado|andar|sala|conjunto|lote|quadra|km|kil[oô]metro|galp[aã]o|loja|apt|\bsl\b)/i;
    const isNumberToken = (t: string) => /^(?:n[ºo°]\s*)?\d+/i.test(t);

    const numberIdx = tokens.findIndex(isNumberToken);
    let logradouroTokens: string[] = [];
    let numeroStr = '';
    let bairroStr = '';
    let complementStr = '';

    if (numberIdx >= 0) {
      logradouroTokens = tokens.slice(0, numberIdx);
      const rawToken = tokens[numberIdx].replace(/^(nº|no|n°)\s*/i, '').trim();
      const numPrefixMatch = rawToken.match(/^(\d+[A-Za-z]?)/);
      numeroStr = (numPrefixMatch ? numPrefixMatch[1] : '').trim();
      const afterSame = rawToken.slice(numPrefixMatch ? numPrefixMatch[1].length : 0).trim();
      if (afterSame) {
        complementStr = afterSame;
      }
      const after = tokens.slice(numberIdx + 1);
      if (after.length) {
        const complementCandidates: string[] = [];
        for (let i = 0; i < after.length; i++) {
          const t = after[i];
          if (complementKeywords.test(t) || /#\s*\d+/i.test(t)) {
            complementCandidates.push(t);
            continue;
          }
        }
        if (complementCandidates.length) {
          complementStr = [complementStr, complementCandidates.join(', ')].filter(Boolean).join(', ');
        }
        for (let i = after.length - 1; i >= 0; i--) {
          const t = after[i];
          if (complementKeywords.test(t)) {
            continue;
          }
          bairroStr = t;
          break;
        }
      }
    } else {
      if (tokens.length) {
        logradouroTokens = [tokens[0]];
        const maybeNumComp = tokens[1] || '';
        const m = maybeNumComp.match(/^(?:n[ºo°]\s*)?(\d+[A-Za-z]?)(.*)$/i);
        if (m) {
          numeroStr = (m[1] || '').trim();
          const rest = (m[2] || '').trim();
          if (rest) complementStr = rest;
        }
        const maybeBairro = tokens[tokens.length - 1];
        if (!complementKeywords.test(maybeBairro) && maybeBairro !== logradouroTokens[0]) {
          bairroStr = maybeBairro;
        }
      }
    }

    const logradouro = logradouroTokens.join(', ').trim();

    result.address = logradouro || primeiraParte;
    result.addressNumber = numeroStr || '';
    result.complement = complementStr || '';
    result.province = bairroStr || '';
    result.city = parsed.cidade || '';
    result.state = parsed.estado || '';
    result.postalCode = parsed.cep || '';

    console.log('[Subconta] parseCompanyAddress via parseEndereco:', result);
    return result;
  } catch (e) {
    console.warn('[Subconta] Falha ao parsear endereço, usando parser simples:', e);
    const original = (endereco || '').trim();
    const normalized = original.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ');
    const parts = normalized.split(',').map(p => p.trim()).filter(Boolean);

    const fallback: Partial<AddressData> = {};
    fallback.address = parts[0] || '';
    if (parts[1]) {
      const m = parts[1].match(/^(\d{1,10}[A-Za-z]?)(.*)/);
      if (m) {
        fallback.addressNumber = m[1].trim();
        const rest = (m[2] || '').trim();
        if (rest) fallback.complement = rest;
      }
    }
    const tail = parts[2] || parts[1] || '';
    const cepMatch = tail.match(/\b(\d{5}-?\d{3})\b/);
    if (cepMatch) fallback.postalCode = cepMatch[1];

    return fallback;
  }
}

export function CreateSubaccountModal({ isOpen, onClose, company, onSuccess }: CreateSubaccountModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [formData, setFormData] = useState<SubaccountFormData>({
    name: company?.nome || '',
    email: company?.email || '',
    cpfCnpj: company?.cnpj || '',
    mobilePhone: company?.telefone || '',
    birthDate: '',
    companyType: 'MEI',
    address: {
      postalCode: '',
      address: '',
      addressNumber: '',
      complement: '',
      province: '',
      city: '',
      state: ''
    }
  });

  // Atualizar dados do formulário quando a empresa mudar
  React.useEffect(() => {
    if (company) {
      const parsed = parseCompanyAddress(company.endereco);
      setFormData({
        name: company.nome,
        email: company.email,
        cpfCnpj: company.cnpj,
        mobilePhone: company.telefone || '',
        birthDate: '',
        companyType: 'MEI',
        address: {
          postalCode: parsed.postalCode || '',
          address: parsed.address || '',
          addressNumber: parsed.addressNumber || '',
          complement: parsed.complement || '',
          province: parsed.province || '',
          city: parsed.city || '',
          state: parsed.state || ''
        }
      });
      setErrorMessage(''); // Limpar erro ao trocar de empresa
    }
  }, [company]);

  const handleStringChange = (field: 'name' | 'email' | 'cpfCnpj' | 'mobilePhone' | 'birthDate' | 'companyType', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleAddressChange = (field: keyof AddressData, value: string) => {
    setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
    if (errorMessage) setErrorMessage('');
  };

  const validateCpfCnpj = (cpfCnpj: string): boolean => {
    const numbers = cpfCnpj.replace(/\D/g, '');
    if (numbers.length !== 11 && numbers.length !== 14) return false;
    if (/^(\d)\1+$/.test(numbers)) return false;
    return true;
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) { toast.error('Nome da empresa é obrigatório'); return false; }
    if (!formData.email.trim()) { toast.error('Email é obrigatório'); return false; }
    if (!formData.cpfCnpj.trim()) { toast.error('CPF/CNPJ é obrigatório'); return false; }
    if (!formData.birthDate.trim()) { toast.error('Data de nascimento é obrigatória'); return false; }
    if (!formData.email.includes('@')) { toast.error('Email deve ter um formato válido'); return false; }
    if (!validateCpfCnpj(formData.cpfCnpj)) { toast.error('CPF/CNPJ deve ter um formato válido'); return false; }

    // Validação de endereço (Asaas exige CEP, logradouro, número, cidade e estado)
    const { postalCode, address, addressNumber, city, state, province } = formData.address;
    if (!postalCode.trim()) { toast.error('CEP é obrigatório'); return false; }
    if (!address.trim()) { toast.error('Endereço é obrigatório'); return false; }
    if (!addressNumber.trim()) { toast.error('Número do endereço é obrigatório'); return false; }
    if (!city.trim()) { toast.error('Cidade é obrigatória'); return false; }
    if (!state.trim()) { toast.error('Estado é obrigatório'); return false; }
    if (!province.trim()) { toast.error('Bairro é obrigatório'); return false; }

    if (!formData.companyType.trim()) { toast.error('Tipo de empresa é obrigatório'); return false; }
    if (!ALLOWED_COMPANY_TYPES.includes(formData.companyType as CompanyType)) {
      toast.error('Tipo de empresa inválido. Use: Limitada, Pessoa Física, Associação ou MEI');
      return false;
    }
    return true;
  };

  const handleCreateSubaccount = async () => {
    if (!company) {
      toast.error('Dados da empresa não encontrados');
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      console.log('🚀 Iniciando criação de subconta para empresa:', company.nome);
      console.log('📋 Dados da subconta:', formData);
      
      await subaccountService.createSubaccount(company.id, {
        name: formData.name,
        email: formData.email,
        cpfCnpj: formData.cpfCnpj,
        mobilePhone: formData.mobilePhone,
        birthDate: formData.birthDate,
        companyType: formData.companyType,
        address: formData.address
      });

      console.log('✅ Subconta criada com sucesso!');
      toast.success('Subconta criada com sucesso no Asaas!');
      
      onClose();
      onSuccess();
      
    } catch (error) {
      console.error('❌ Erro ao criar subconta:', error);
      let errorMsg = 'Erro ao criar subconta. Tente novamente.';
      if (error instanceof Error) {
        errorMsg = error.message;
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
    if (!isLoading) onClose();
  };

  if (!company) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
              onChange={(e) => handleStringChange('name', e.target.value)}
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
              onChange={(e) => handleStringChange('email', e.target.value)}
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
              onChange={(e) => handleStringChange('cpfCnpj', e.target.value)}
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
              onChange={(e) => handleStringChange('birthDate', e.target.value)}
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
              onChange={(e) => handleStringChange('mobilePhone', e.target.value)}
              placeholder="(11) 99999-9999"
              disabled={isLoading}
            />
          </div>

          {/* Tipo de Empresa */}
          <div className="space-y-2">
            <Label htmlFor="companyType">Tipo de Empresa</Label>
            <select
              id="companyType"
              value={formData.companyType}
              onChange={(e) => handleStringChange('companyType', e.target.value)}
              disabled={isLoading}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="LIMITED">Empresa Limitada (LTDA)</option>
              <option value="INDIVIDUAL">Pessoa Física (Individual)</option>
              <option value="ASSOCIATION">Associação</option>
              <option value="MEI">Microempreendedor Individual (MEI)</option>
            </select>
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label>Endereço</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="postalCode">CEP</Label>
                <Input id="postalCode" value={formData.address.postalCode} onChange={(e) => handleAddressChange('postalCode', e.target.value)} placeholder="00000-000" />
              </div>
              <div>
                <Label htmlFor="address">Logradouro</Label>
                <Input id="address" value={formData.address.address} onChange={(e) => handleAddressChange('address', e.target.value)} placeholder="Rua, Avenida..." />
              </div>
              <div>
                <Label htmlFor="addressNumber">Número</Label>
                <Input id="addressNumber" value={formData.address.addressNumber} onChange={(e) => handleAddressChange('addressNumber', e.target.value)} placeholder="123" />
              </div>
              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input id="complement" value={formData.address.complement} onChange={(e) => handleAddressChange('complement', e.target.value)} placeholder="Apto, Bloco, Sala..." />
              </div>
              <div>
                <Label htmlFor="province">Bairro</Label>
                <Input id="province" value={formData.address.province} onChange={(e) => handleAddressChange('province', e.target.value)} placeholder="Centro" />
              </div>
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={formData.address.city} onChange={(e) => handleAddressChange('city', e.target.value)} placeholder="São Paulo" />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input id="state" value={formData.address.state} onChange={(e) => handleAddressChange('state', e.target.value)} placeholder="SP" />
              </div>
            </div>
            <p className="text-xs text-gray-500">Preencha o endereço fiscal da empresa. O Asaas exige CEP, logradouro, número, bairro, cidade e estado.</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sticky bottom-0 bg-white pt-3">
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